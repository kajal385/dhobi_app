import {
  getAuth,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  ConfirmationResult,
  UserCredential,
} from '@react-native-firebase/auth';
import apiClient from './apiClient';
import partnerFcmService from './fcmService';

class FirebasePartnerAuthService {
  private getAuthInstance() {
    try {
      return getAuth();
    } catch (e) {
      console.warn('[Partner Firebase Auth] Error getting auth instance:', e);
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
    console.log('[Partner Firebase Auth] Sending OTP to:', formattedPhone);

    try {
      const authInstance = this.getAuthInstance();
      if (!authInstance) {
        throw new Error('Firebase Auth is not initialized.');
      }
      const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);
      return confirmation;
    } catch (error: any) {
      console.error('[Partner Firebase Auth] sendPhoneOtp error:', error);
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
      const credential = await confirmation.confirm(code.trim());
      if (!credential || !credential.user) {
        throw new Error('Verification failed. Please re-enter the code.');
      }
      return credential;
    } catch (error: any) {
      console.error('[Partner Firebase Auth] confirmOtp error:', error);
      throw new Error(this.getReadableErrorMessage(error));
    }
  }

  /**
   * Synchronize verified Firebase Laundry Owner with Laravel backend
   */
  async syncOwnerWithBackend(
    phone: string,
    idToken: string,
    role: 'owner' | 'delivery_boy' = 'owner'
  ): Promise<any> {
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const fcmToken = await partnerFcmService.getDeviceToken().catch(() => null);

      const response = await apiClient.post('/owner/firebase-login', {
        id_token: idToken,
        phone: cleanPhone,
        mobile: cleanPhone,
        role: role,
        fcm_token: fcmToken,
        device_type: 'android',
      });

      const resData = response.data;

      // Register device token with backend
      if (fcmToken && resData.user?.id) {
        partnerFcmService.registerTokenWithBackend(fcmToken, resData.user.id, role);
      }

      return resData;
    } catch (error: any) {
      console.error('[Partner Firebase Auth] syncOwnerWithBackend error:', error.response?.data || error.message);
      const msg =
        error.response?.data?.message ||
        'Could not complete partner login. Please check your connection or contact administrator.';
      throw new Error(msg);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      const authInstance = this.getAuthInstance();
      if (authInstance) {
        await fbSignOut(authInstance);
      }
    } catch (e) {
      console.warn('[Partner Firebase Auth] Sign out error:', e);
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
        return 'Daily SMS verification quota exceeded. Please try again later or use test credentials.';
      case 'auth/too-many-requests':
        return 'Too many OTP requests. Please wait a few moments before trying again.';
      case 'auth/invalid-verification-code':
        return 'Invalid verification code. Please check the 6 digits and try again.';
      case 'auth/session-expired':
        return 'The verification code has expired. Please request a new OTP.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/app-not-authorized':
        return 'App verification failed. Please ensure SHA-256 fingerprint is added in Firebase console.';
      case 'auth/captcha-check-failed':
        return 'Verification check failed. Please try again.';
      default:
        return message || 'Authentication failed. Please try again.';
    }
  }
}

export const firebasePartnerAuthService = new FirebasePartnerAuthService();
export default firebasePartnerAuthService;
