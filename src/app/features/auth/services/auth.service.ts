import { Injectable } from '@angular/core';

const AUTH_STORAGE_KEY = 'app_auth_session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly validCredentials = {
    email: 'admin@demo.com',
    password: '123456'
  };

  isAuthenticated(): boolean {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  }

  login(email: string, password: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    const isValid =
      normalizedEmail === this.validCredentials.email &&
      password === this.validCredentials.password;

    if (isValid) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      sessionStorage.setItem('app_auth_user', normalizedEmail);
      return true;
    }

    this.logout();
    return false;
  }

  logout(): void {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('app_auth_user');
  }

  getCurrentUser(): string {
    return sessionStorage.getItem('app_auth_user') ?? '';
  }
}
