import { Injectable, OnModuleInit, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    const isConfigured =
      projectId &&
      clientEmail &&
      privateKey &&
      !projectId.includes('your-project') &&
      !privateKey.includes('YOUR_KEY_HERE');

    if (!isConfigured) {
      this.logger.warn(
        'Firebase credentials not configured. Phone Auth endpoints will be disabled. ' +
        'Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to .env to enable.',
      );
      return;
    }

    if (admin.apps.length > 0) {
      this.initialized = true;
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (err: any) {
      this.logger.error(`Firebase initialization failed: ${err?.message}`);
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.initialized) {
      throw new UnauthorizedException(
        'Firebase Phone Auth is not configured on this server. Contact the administrator.',
      );
    }
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (err: any) {
      this.logger.warn(`Firebase token verification failed: ${err?.message}`);
      throw new UnauthorizedException('Invalid or expired Firebase ID token.');
    }
  }

  isReady(): boolean {
    return this.initialized;
  }
}
