import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { ApiService, RegistrarUsuarioRequest } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { GlobalVariable } from 'src/app/VarGlobals';

@Component({
  selector: 'app-usuario-register-dialog',
  templateUrl: './usuario-register-dialog.component.html',
  styleUrls: ['./usuario-edit-dialog.component.scss']
})
export class UsuarioRegisterDialogComponent {
  readonly form: FormGroup;
  isSaving = false;
  errorMessage = '';

  constructor(
    private readonly dialogRef: MatDialogRef<UsuarioRegisterDialogComponent>,
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.form = this.formBuilder.group({
      usrCod: ['', [Validators.required, Validators.maxLength(50)]],
      usrNom: ['', [Validators.required, Validators.maxLength(120)]],
      flgEst: ['A', Validators.required]
    });
  }

  guardar(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const values = this.form.value as {
      usrCod: string;
      usrNom: string;
      flgEst: string;
    };
    const usuarioRegistro = this.getUsuarioRegistro();
    const currentIsoDate = new Date().toISOString();
    const payload: RegistrarUsuarioRequest = {
      Usr_Id: '0',
      Usr_Cod: values.usrCod.trim(),
      Usr_Nom: values.usrNom.trim(),
      Flg_Est: values.flgEst,
      Usr_Reg: usuarioRegistro,
      Fec_Reg: currentIsoDate,
      Usr_Mod: usuarioRegistro,
      Fec_Mod: currentIsoDate
    };

    console.log('Payload registrar usuario:', payload);

    this.apiService.registrarUsuario(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error registrando usuario:', error);
        this.errorMessage = this.getErrorMessage(error);
        this.isSaving = false;
      }
    });
  }

  cerrar(): void {
    if (!this.isSaving) {
      this.dialogRef.close(false);
    }
  }

  private getUsuarioRegistro(): string {
    const globalUser = GlobalVariable.vusu?.trim();

    if (globalUser) {
      return globalUser;
    }

    const currentUser = this.authService.getCurrentUser().trim();

    if (currentUser) {
      return currentUser;
    }

    return 'sistemas';
  }

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo registrar el usuario. Intenta nuevamente.';
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (this.isErrorBody(error.error)) {
      if (this.isValidationErrors(error.error.errors)) {
        const messages = Object.values(error.error.errors).flat();

        if (messages.length) {
          return messages.join(' ');
        }
      }

      if (typeof error.error.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      if (typeof error.error.title === 'string' && error.error.title.trim()) {
        return error.error.title;
      }
    }

    return `No se pudo registrar el usuario. Codigo HTTP: ${error.status}.`;
  }

  private isErrorBody(value: unknown): value is { message?: unknown; title?: unknown; errors?: unknown } {
    return typeof value === 'object' && value !== null;
  }

  private isValidationErrors(value: unknown): value is Record<string, string[]> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    return Object.values(value).every((messages) => Array.isArray(messages));
  }
}
