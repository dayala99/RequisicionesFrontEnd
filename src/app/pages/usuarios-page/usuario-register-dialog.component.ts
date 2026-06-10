import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { ApiService, RegistrarUsuarioRequest } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { GlobalVariable } from 'src/app/VarGlobals';
import { noWhitespaceValidator, optionalPatternValidator } from 'src/app/shared/validators/form-validators';

interface CentroCostoOption {
  id: number;
  descripcion: string;
}

@Component({
  selector: 'app-usuario-register-dialog',
  templateUrl: './usuario-register-dialog.component.html',
  styleUrls: ['./usuario-edit-dialog.component.scss']
})
export class UsuarioRegisterDialogComponent implements OnInit {
  readonly form: FormGroup;
  centroCostoOptions: CentroCostoOption[] = [];
  isSaving = false;
  isLoadingCentrosCosto = false;
  errorMessage = '';

  constructor(
    private readonly dialogRef: MatDialogRef<UsuarioRegisterDialogComponent>,
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.form = this.formBuilder.group({
      usrCod: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(50), optionalPatternValidator(/^[A-Za-z0-9._-]+$/)]],
      usrNom: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(120)]],
      usrDocNro: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(20), optionalPatternValidator(/^[0-9]+$/)]],
      usrPass: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(55)]],
      usrCenCosId: [0, [Validators.required, Validators.min(1)]],
      usrApr: ['N', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarCentrosCosto();
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
      usrDocNro: string;
      usrPass: string;
      usrCenCosId: number;
      usrApr: string;
    };
    const usuarioRegistro = this.getUsuarioRegistro();
    const currentIsoDate = new Date().toISOString();
    const payload: RegistrarUsuarioRequest = {
      Usr_Id: '0',
      Usr_Cod: values.usrCod.trim(),
      Usr_Nom: values.usrNom.trim(),
      Flg_Est: 'A',
      Usr_Reg: usuarioRegistro,
      Fec_Reg: currentIsoDate,
      Usr_Mod: usuarioRegistro,
      Fec_Mod: currentIsoDate,
      Usr_Doc_Nro: values.usrDocNro.trim(),
      Usr_Cen_Cos_Id: Number(values.usrCenCosId),
      Usr_Pass: values.usrPass.trim(),
      Usr_Apr: values.usrApr
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

  private cargarCentrosCosto(): void {
    this.isLoadingCentrosCosto = true;
    this.apiService.getListarCentroCostoActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.centroCostoOptions = this.extractRecords(response)
          .map((item) => this.mapCentroCostoOption(item))
          .filter((item): item is CentroCostoOption => item !== null);
        this.isLoadingCentrosCosto = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando centros de costo para usuario:', error);
        this.centroCostoOptions = [];
        this.errorMessage = 'No se pudieron cargar los centros de costo.';
        this.isLoadingCentrosCosto = false;
      }
    });
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

  private extractRecords(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => this.isDataRecord(item));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = ['elements', 'Elements', 'data', 'Data', 'result', 'Result'];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private mapCentroCostoOption(item: Record<string, unknown>): CentroCostoOption | null {
    const id = this.getNumberValue(item, ['Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId', 'id', 'Id']);
    const descripcion = this.getTextValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes', 'descripcion', 'Descripcion']);

    if (!id || !descripcion) {
      return null;
    }

    return { id, descripcion };
  }

  private getTextValue(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = item[key];

      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }

    return '';
  }

  private getNumberValue(item: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = Number(item[key]);

      if (Number.isInteger(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private isDataRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
