import { Component, Inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ActualizarProveedorRequest, ApiService } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { GlobalVariable } from 'src/app/VarGlobals';

interface ProviderEditData {
  proveedor: {
    prvId: number;
    prvNom: string;
    prvRuc: string;
    prvTel: string;
    prvDir: string;
    prvNomCon: string;
    flgEst: string;
    usrReg: string;
    fecReg: string;
    usrMod: string;
    fecMod: string;
  };
}

@Component({
  selector: 'app-provider-edit-dialog',
  templateUrl: './provider-edit-dialog.component.html',
  styleUrls: ['./provider-dialog.component.scss']
})
export class ProviderEditDialogComponent {
  readonly form: FormGroup;
  isSaving = false;
  errorMessage = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ProviderEditData,
    private readonly dialogRef: MatDialogRef<ProviderEditDialogComponent>,
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.form = this.formBuilder.group({
      prvNom: [data.proveedor.prvNom, [Validators.required, Validators.maxLength(120)]],
      prvRuc: [data.proveedor.prvRuc, [Validators.required, Validators.maxLength(20)]],
      prvTel: [data.proveedor.prvTel, [Validators.required, Validators.maxLength(30)]],
      prvDir: [data.proveedor.prvDir, [Validators.required, Validators.maxLength(180)]],
      prvNomCon: [data.proveedor.prvNomCon, [Validators.required, Validators.maxLength(120)]],
      flgEst: [data.proveedor.flgEst || 'A', Validators.required]
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
      prvNom: string;
      prvRuc: string;
      prvTel: string;
      prvDir: string;
      prvNomCon: string;
      flgEst: string;
    };
    const currentOperator = this.getCurrentOperator();
    const currentIsoDate = new Date().toISOString();
    const payload: ActualizarProveedorRequest = {
      Prv_Id: this.data.proveedor.prvId,
      Prv_Nom: values.prvNom.trim(),
      Prv_Ruc: values.prvRuc.trim(),
      Prv_Tel: values.prvTel.trim(),
      Prv_Dir: values.prvDir.trim(),
      Prv_Nom_Con: values.prvNomCon.trim(),
      Flg_Est: values.flgEst,
      Usr_Reg: this.normalizeOperator(this.data.proveedor.usrReg) || currentOperator,
      Fec_Reg: this.data.proveedor.fecReg || currentIsoDate,
      Usr_Mod: currentOperator,
      Fec_Mod: currentIsoDate
    };

    console.log('Payload actualizar proveedor:', payload);

    this.apiService.actualizarProveedor(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error actualizando proveedor:', error);
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

  private getCurrentOperator(): string {
    const globalUser = this.normalizeOperator(GlobalVariable.vusu?.trim() ?? '');

    if (globalUser) {
      return globalUser;
    }

    const currentUser = this.normalizeOperator(this.authService.getCurrentUser().trim());

    if (currentUser) {
      return currentUser;
    }

    return 'sistemas';
  }

  private normalizeOperator(value: string): string {
    if (!value || value.includes('@')) {
      return '';
    }

    return value;
  }

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo actualizar el proveedor. Intenta nuevamente.';
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

    return `No se pudo actualizar el proveedor. Codigo HTTP: ${error.status}.`;
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
