import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { ApiService } from 'src/app/Services/api.services';

const AUTH_STORAGE_KEY = 'app_auth_session';
const AUTH_USER_KEY = 'app_auth_user';
const AUTH_USER_NAME_KEY = 'app_auth_user_name';

interface LoginResult {
  success: boolean;
  message: string;
  userName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private readonly apiService: ApiService) {}

  isAuthenticated(): boolean {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  }

  login(userCode: string, password: string): Observable<LoginResult> {
    const normalizedUserCode = userCode.trim();

    return this.apiService.getObtenerAccesoUsuario({
      Usr_Cod: normalizedUserCode,
      Usr_Pass: password
    }).pipe(
      map((response: unknown) => this.mapAccessResponse(response)),
      tap((result: LoginResult) => {
        if (result.success) {
          sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
          sessionStorage.setItem(AUTH_USER_KEY, normalizedUserCode);
          sessionStorage.setItem(AUTH_USER_NAME_KEY, result.userName || normalizedUserCode);
          return;
        }

        this.logout();
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_NAME_KEY);
  }

  getCurrentUser(): string {
    return sessionStorage.getItem(AUTH_USER_KEY) ?? '';
  }

  getCurrentUserName(): string {
    return sessionStorage.getItem(AUTH_USER_NAME_KEY) ?? this.getCurrentUser();
  }

  private mapAccessResponse(response: unknown): LoginResult {
    const record = this.extractFirstRecord(response);
    const existe = String(this.getRecordValue(record, ['Existe', 'existe']) ?? '1').trim();
    const message = String(this.getRecordValue(record, ['Respuesta', 'respuesta']) ?? '').trim();
    const userName = String(this.getRecordValue(record, ['Usr_Nom', 'usr_Nom', 'usrNom']) ?? '').trim();

    return {
      success: existe === '0',
      message: message || (existe === '0' ? 'ACCESO CORRECTO' : 'No se pudo validar el acceso.'),
      userName
    };
  }

  private extractFirstRecord(response: unknown): Record<string, unknown> | null {
    if (Array.isArray(response)) {
      return this.asRecord(response[0]);
    }

    const responseRecord = this.asRecord(response);
    if (!responseRecord) {
      return null;
    }

    const elements = responseRecord['Elements'] ?? responseRecord['elements'];
    if (Array.isArray(elements)) {
      return this.asRecord(elements[0]);
    }

    const data = responseRecord['Data'] ?? responseRecord['data'];
    if (Array.isArray(data)) {
      return this.asRecord(data[0]);
    }

    return responseRecord;
  }

  private getRecordValue(record: Record<string, unknown> | null, keys: string[]): unknown {
    if (!record) {
      return null;
    }

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        return record[key];
      }
    }

    return null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? value as Record<string, unknown> : null;
  }
}
