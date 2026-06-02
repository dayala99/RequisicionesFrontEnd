import { Component, Inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ActualizarProveedorRequest, ApiService } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { GlobalVariable } from 'src/app/VarGlobals';
import { noWhitespaceValidator, optionalPatternValidator } from 'src/app/shared/validators/form-validators';

interface ProviderEditData {
  proveedor: {
    prvId: number;
    prvNom: string;
    prvRuc: string;
    prvTel: string;
    prvDir: string;
    prvNomCon: string;
    prvEmail: string;
    prvNroCueBan: string;
    prvNroCueBanCci: string;
    prvBan: number | null;
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
  readonly bankOptions = [
    { id: 1, label: 'BCP', accountNumber: '11111111111', cci: '11111111111111111111' },
    { id: 2, label: 'BBVA', accountNumber: '22222222222', cci: '22222222222222222222' },
    { id: 3, label: 'Interbank', accountNumber: '33333333333', cci: '33333333333333333333' },
    { id: 4, label: 'Scotiabank', accountNumber: '44444444444', cci: '44444444444444444444' }
  ];
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
    const initialBankId = data.proveedor.prvBan || this.bankOptions[0].id;
    const initialBank = this.bankOptions.find((bank) => bank.id === initialBankId) || this.bankOptions[0];

    this.form = this.formBuilder.group({
      prvNom: [data.proveedor.prvNom, [Validators.required, noWhitespaceValidator(), Validators.maxLength(120)]],
      prvRuc: [data.proveedor.prvRuc, [Validators.required, noWhitespaceValidator(), Validators.maxLength(20), optionalPatternValidator(/^\d{11}$/)]],
      prvTel: [data.proveedor.prvTel, [Validators.required, noWhitespaceValidator(), Validators.maxLength(30), optionalPatternValidator(/^[0-9()+\-\s]{6,30}$/)]],
      prvDir: [data.proveedor.prvDir, [Validators.required, noWhitespaceValidator(), Validators.maxLength(180)]],
      prvNomCon: [data.proveedor.prvNomCon, [Validators.required, noWhitespaceValidator(), Validators.maxLength(120)]],
      prvEmail: [data.proveedor.prvEmail, [Validators.email, Validators.maxLength(180)]],
      prvNroCueBan: [data.proveedor.prvNroCueBan || initialBank.accountNumber, [Validators.required, noWhitespaceValidator(), Validators.maxLength(40), optionalPatternValidator(/^\d{6,40}$/)]],
      prvNroCueBanCci: [data.proveedor.prvNroCueBanCci || initialBank.cci, [Validators.required, noWhitespaceValidator(), Validators.maxLength(40), optionalPatternValidator(/^\d{6,40}$/)]],
      prvBan: [initialBankId, [Validators.required, Validators.min(1)]],
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
      prvEmail: string;
      prvNroCueBan: string;
      prvNroCueBanCci: string;
      prvBan: number | null;
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
      Prv_Email: this.normalizeOptionalText(values.prvEmail),
      Prv_Nro_Cue_Ban: this.normalizeOptionalText(values.prvNroCueBan),
      Prv_Nro_Cue_Ban_CCI: this.normalizeOptionalText(values.prvNroCueBanCci),
      Prv_Ban: this.parseOptionalPositiveInteger(values.prvBan),
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

  private normalizeOptionalText(value: string | null | undefined): string | undefined {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : undefined;
  }

  onBankChange(bankIdRaw: string | number): void {
    const bankId = Number(bankIdRaw);
    const selectedBank = this.bankOptions.find((bank) => bank.id === bankId);

    if (!selectedBank) {
      return;
    }

    this.form.patchValue({
      prvNroCueBan: selectedBank.accountNumber,
      prvNroCueBanCci: selectedBank.cci
    });
  }

  private parseOptionalPositiveInteger(value: number | string | null | undefined): number | undefined {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      return undefined;
    }

    return numericValue;
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
