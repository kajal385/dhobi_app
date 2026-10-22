import {
  getAuth,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  ConfirmationResult,
  UserCredential,
} from '@react-native-firebase/auth';
import apiClient from '../api/client';
import fcmService from './fcmService';

export interface FirebaseOtpResult {
  confirmation: ConfirmationResult;
}

export interface BackendAuthResponse {
  success: boolean;
  message?: string;
  is_new_user?: boolean;
  access_token: string;
  token?: string;
  user: any;
  shop?: any;
}

class FirebaseAuthService {
  private getAuthInstance() {
    try {
      return getAuth();
    } catch (e) {
      console.warn('[Firebase Auth] Error getting auth instance:', e);
      return null;
    }
  }

  /**
   * Format phone number to international E.164 (+91XXXXXXXXXX)
   */
  formatPhoneNumber(phone: string, countryCode: string = '91'): string {
    const cleanDigits = phone.replace(/\D/g, '');
    const last10 = cleanDigits.slice(-10);
    const code = countryCode.replace(/\D/g, '') || '91';
    return `+${code}${last10}`;
  }

  /**
   * Request OTP from Firebase Phone Authentication
   */
  async sendPhoneOtp(phone: string, countryCode: string = '91'): Promise<ConfirmationResult> {
    const formattedPhone = this.formatPhoneNumber(phone, countryCode);
    console.log('[Firebase Auth] Sending OTP to:', formattedPhone);

    try {
      const authInstance = this.getAuthInstance();
      if (!authInstance) {
        throw new Error('Firebase Auth is not initialized.');
      }
      // Official Firebase Phone Authentication signInWithPhoneNumber (modular v26)
      const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);
      return confirmation;
    } catch (error: any) {
      console.error('[Firebase Auth] sendPhoneOtp error:', error);
      throw new Error(this.getReadableErrorMessage(error));
    }
  }

  /**
   * Confirm OTP entered by user
   */
  async confirmOtp(
    confirmation: ConfirmationResult,
    code: string
  ): Promise<UserCredential> {
    try {
      const userCredential = await confirmation.confirm(code.trim());
      if (!userCredential || !userCredential.user) {
        throw new Error('Verification failed. Please re-enter the code.');
      }
      return userCredential;
    } catch (error: any) {
      console.error('[Firebase Auth] confirmOtp error:', error);
      throw new Error(this.getReadableErrorMessage(error));
    }
  }

  /**
   * Synchronize verified Firebase user with Laravel backend API
   */
  async syncWithBackend(
    phone: string,
    idToken: string,
    role: string = 'customer',
    name?: string
  ): Promise<BackendAuthResponse> {
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const fcmToken = await fcmService.getDeviceToken().catch(() => null);

      const response = await apiClient.post('/auth/firebase-login', {
        id_token: idToken,
        phone: cleanPhone,
        mobile: cleanPhone,
        role: role,
        name: name,
        fcm_token: fcmToken,
        device_type: 'android',
      });

      const resData = response.data;
      const dataPayload = resData.data || resData;

      const result: BackendAuthResponse = {
        success: true,
        message: resData.message || 'Login successful',
        is_new_user: resData.is_new_user ?? dataPayload.is_new_user ?? false,
        access_token: resData.access_token || resData.token || dataPayload.access_token,
        token: resData.access_token || resData.token || dataPayload.access_token,
        user: resData.user || dataPayload.user,
        shop: resData.shop || dataPayload.shop,
      };

      // Register device token with backend for this user
      if (fcmToken && result.user?.id) {
        fcmService.registerTokenWithBackend(fcmToken, result.user.id);
      }

      return result;
    } catch (error: any) {
      console.error('[Firebase Auth] syncWithBackend error:', error.response?.data || error.message);
      const msg =
        error.response?.data?.message ||
        'Could not complete login with server. Please check your internet connection.';
      throw new Error(msg);
    }
  }

  /**
   * Sign out from Firebase
   */
  async signOut(): Promise<void> {
    try {
      const authInstance = this.getAuthInstance();
      if (authInstance) {
        await fbSignOut(authInstance);
      }
    } catch (e) {
      console.warn('[Firebase Auth] Sign out error:', e);
    }
  }

  /**
   * Translate Firebase Auth error codes to user-friendly messages
   */
  private getReadableErrorMessage(error: any): string {
    const code = error?.code || '';
    const message = error?.message || '';

    switch (code) {
      case 'auth/invalid-phone-number':
        return 'Please enter a valid 10-digit mobile number with country code.';
      case 'auth/missing-phone-number':
        return 'Mobile number is required.';
      case 'auth/quota-exceeded':
        return 'Daily SMS quota exceeded. Please try again later or contact support.';
      case 'auth/too-many-requests':
        return 'Too many OTP requests. Please wait a few moments before trying again.';
      case 'auth/invalid-verification-code':
        return 'Invalid verification code. Please check the 6 digits and try again.';
      case 'auth/session-expired':
        return 'The verification code has expired. Please request a new OTP.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/app-not-authorized':
        return 'App verification failed. Please verify SHA-256 fingerprint in Firebase console.';
      case 'auth/captcha-check-failed':
        return 'reCAPTCHA verification failed. Please try again.';
      default:
        return message || 'Authentication failed. Please try again.';
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
