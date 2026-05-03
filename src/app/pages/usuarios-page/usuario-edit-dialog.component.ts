import { Component, Inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ActualizarUsuarioRequest, ApiService } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { GlobalVariable } from 'src/app/VarGlobals';

interface UsuarioEditData {
  usuario: {
    usrId: number;
    usrCod: string;
    usrNom: string;
    flgEst: string;
  };
}

@Component({
  selector: 'app-usuario-edit-dialog',
  templateUrl: './usuario-edit-dialog.component.html',
  styleUrls: ['./usuario-edit-dialog.component.scss']
})
export class UsuarioEditDialogComponent {
  readonly form: FormGroup;
  isSaving = false;
  errorMessage = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: UsuarioEditData,
    private readonly dialogRef: MatDialogRef<UsuarioEditDialogComponent>,
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.form = this.formBuilder.group({
      usrCod: [data.usuario.usrCod, [Validators.required, Validators.maxLength(50)]],
      usrNom: [data.usuario.usrNom, [Validators.required, Validators.maxLength(120)]],
      flgEst: [data.usuario.flgEst || 'A', Validators.required]
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
    const payload: ActualizarUsuarioRequest = {
      Usr_Id: String(this.data.usuario.usrId),
      Usr_Cod: values.usrCod.trim(),
      Usr_Nom: values.usrNom.trim(),
      Flg_Est: values.flgEst,
      Usr_Mod: this.getUsuarioModificador()
    };

    console.log('Payload actualizar usuario:', payload);

    this.apiService.actualizarUsuario(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error actualizando usuario:', error);
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

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo actualizar el usuario. Intenta nuevamente.';
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

    return `No se pudo actualizar el usuario. Codigo HTTP: ${error.status}.`;
  }

  private getUsuarioModificador(): string {
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
