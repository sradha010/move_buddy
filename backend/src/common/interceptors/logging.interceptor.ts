import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = response.statusCode;
          const duration = Date.now() - startTime;
          this.logger.log(
            `${method} ${url} ${statusCode} — ${duration}ms`,
          );
        },
        error: (err: any) => {
          const statusCode: number =
            err?.status ?? err?.statusCode ?? 500;
          const duration = Date.now() - startTime;
          this.logger.warn(
            `${method} ${url} ${statusCode} — ${duration}ms`,
          );
        },
      }),
    );
  }
}
