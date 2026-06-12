import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();
    const path = request.url;

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const body = exceptionResponse as Record<string, any>;
        message = body.message ?? exception.message;
        error = body.error ?? exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const handled = this.handlePrismaError(exception);
      statusCode = handled.statusCode;
      message = handled.message;
      error = handled.error;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided. Please check your request payload.';
      error = 'Bad Request';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Database connection failed.';
      error = 'Internal Server Error';
      this.logger.error(
        `[${request.method}] ${path} — PrismaClientInitializationError`,
        (exception as Error).stack,
      );
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const isDev = process.env.NODE_ENV !== 'production';
      message = isDev && exception instanceof Error
        ? exception.message
        : 'An unexpected internal server error occurred.';
      error = 'Internal Server Error';
      this.logger.error(
        `[${request.method}] ${path} — Unhandled Exception`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    }

    // Log all 500 errors regardless of source
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `500 Internal Server Error — ${request.method} ${path} — ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
      );
    }

    const responseBody: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp,
      path,
    };

    response.status(statusCode).json(responseBody);
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { statusCode: number; message: string; error: string } {
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const fields = exception.meta?.target as string[] | undefined;
        const fieldList = fields?.join(', ') ?? 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${fieldList} already exists.`,
          error: 'Conflict',
        };
      }

      case 'P2025': {
        // Record not found
        const cause =
          (exception.meta?.cause as string) ?? 'The requested record';
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: `${cause} was not found.`,
          error: 'Not Found',
        };
      }

      case 'P2003': {
        // Foreign key constraint violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            'Related record not found. Please check referenced fields.',
          error: 'Bad Request',
        };
      }

      case 'P2014': {
        // Required relation violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            'The change would violate a required relation between records.',
          error: 'Bad Request',
        };
      }

      case 'P2016': {
        // Query interpretation error
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Query interpretation error. Please check your request.',
          error: 'Bad Request',
        };
      }

      default: {
        this.logger.error(
          `Unhandled Prisma error code ${exception.code}: ${exception.message}`,
          exception.stack,
        );
        const isDev = process.env.NODE_ENV !== 'production';
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: isDev
            ? `Prisma ${exception.code}: ${exception.message}`
            : 'A database error occurred.',
          error: 'Internal Server Error',
        };
      }
    }
  }
}
