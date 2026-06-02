import { Component, Inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ActualizarItemRequest, ApiService } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { GlobalVariable } from 'src/app/VarGlobals';
import { noWhitespaceValidator } from 'src/app/shared/validators/form-validators';

type DataRecord = Record<string, unknown>;

interface GrupoItemOption {
  grpId: number;
  grpDes: string;
}

interface ItemEditData {
  item: {
    itmId: number;
    itmDes: string;
    itmGrp: number;
    grpDes: string;
    flgEst: string;
  };
}

@Component({
  selector: 'app-item-edit-dialog',
  templateUrl: './item-edit-dialog.component.html',
  styleUrls: ['./item-dialog.component.scss']
})
export class ItemEditDialogComponent {
  readonly form: FormGroup;
  gruposItem: GrupoItemOption[] = [];
  isSaving = false;
  isLoadingGroups = true;
  errorMessage = '';
  isGrupoDropdownOpen = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ItemEditData,
    private readonly dialogRef: MatDialogRef<ItemEditDialogComponent>,
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.form = this.formBuilder.group({
      itmDes: [data.item.itmDes, [Validators.required, noWhitespaceValidator(), Validators.maxLength(120)]],
      itmGrp: [data.item.grpDes, [Validators.required, noWhitespaceValidator()]],
      flgEst: [data.item.flgEst || 'A', Validators.required]
    });

    this.cargarGruposItem();
  }

  guardar(): void {
    if (this.form.invalid || this.isSaving || this.isLoadingGroups) {
      this.form.markAllAsTouched();
      return;
    }

    const itmGrp = this.resolveGrupoId(String(this.form.controls['itmGrp'].value ?? ''));

    if (itmGrp === null) {
      this.errorMessage = 'Selecciona un grupo valido para el item.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const payload: ActualizarItemRequest = {
      Itm_Id: this.data.item.itmId,
      Itm_Des: String(this.form.controls['itmDes'].value || '').trim(),
      Itm_Grp: itmGrp,
      Flg_Est: String(this.form.controls['flgEst'].value || 'A'),
      Usr_Mod: this.getCurrentOperator()
    };

    this.apiService.actualizarItem(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error actualizando item:', error);
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

  trackByGrupo(_index: number, grupo: GrupoItemOption): string {
    return String(grupo.grpId);
  }

  get grupoOptions(): string[] {
    return this.gruposItem.map((grupo) => grupo.grpDes);
  }

  get filteredGrupoOptions(): string[] {
    const currentValue = String(this.form.controls['itmGrp'].value ?? '').trim().toLowerCase();

    if (!currentValue) {
      return this.grupoOptions;
    }

    return this.grupoOptions.filter((option) => option.toLowerCase().includes(currentValue));
  }

  openGrupoDropdown(): void {
    this.isGrupoDropdownOpen = true;
  }

  closeGrupoDropdown(): void {
    setTimeout(() => {
      this.isGrupoDropdownOpen = false;
    }, 120);
  }

  toggleGrupoDropdown(): void {
    this.isGrupoDropdownOpen = !this.isGrupoDropdownOpen;
  }

  onGrupoInput(): void {
    this.isGrupoDropdownOpen = true;
  }

  selectGrupo(option: string): void {
    this.form.controls['itmGrp'].setValue(option);
    this.isGrupoDropdownOpen = false;
  }

  private cargarGruposItem(): void {
    this.isLoadingGroups = true;
    this.errorMessage = '';

    this.apiService.getListarGrupoItem().subscribe({
      next: (response: unknown) => {
        this.gruposItem = this.extractRecords(response)
          .map((item) => this.mapGrupoItem(item))
          .filter((grupo) => grupo.grpId > 0)
          .sort((left, right) => left.grpDes.localeCompare(right.grpDes));

        if (!this.gruposItem.some((grupo) => grupo.grpId === this.data.item.itmGrp) && this.data.item.itmGrp > 0) {
          this.gruposItem.push({
            grpId: this.data.item.itmGrp,
            grpDes: this.data.item.grpDes || `Grupo ${this.data.item.itmGrp}`
          });
          this.gruposItem.sort((left, right) => left.grpDes.localeCompare(right.grpDes));
        }

        this.isLoadingGroups = false;

        if (!this.gruposItem.length) {
          this.errorMessage = 'No se encontraron grupos de item para esta edicion.';
        }
      },
      error: (error: unknown) => {
        console.error('Error cargando grupos de item:', error);
        this.gruposItem = [];
        this.isLoadingGroups = false;
        this.errorMessage = 'No se pudo cargar la lista de grupos de item.';
      }
    });
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((value): value is DataRecord => this.isDataRecord(value));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = ['grupoItems', 'GrupoItems', 'elements', 'Elements', 'data', 'Data', 'result', 'Result'];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is DataRecord => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private mapGrupoItem(item: DataRecord): GrupoItemOption {
    return {
      grpId: this.getNumberValue(item, ['Grp_Id', 'grp_Id', 'grpId', 'id', 'Id']) ?? 0,
      grpDes: this.getTextValue(item, ['Grp_Des', 'grp_Des', 'grpDes', 'descripcion', 'Descripcion'])
    };
  }

  private getTextValue(item: DataRecord, keys: string[]): string {
    for (const key of keys) {
      const value = item[key];

      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }

    return '';
  }

  private getNumberValue(item: DataRecord, keys: string[]): number | null {
    for (const key of keys) {
      const value = Number(item[key]);

      if (Number.isInteger(value)) {
        return value;
      }
    }

    return null;
  }

  private isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private resolveGrupoId(value: string): number | null {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      return null;
    }

    const exactMatch = this.gruposItem.find((grupo) => grupo.grpDes.trim().toLowerCase() === normalizedValue);

    if (exactMatch) {
      return exactMatch.grpId;
    }

    if (/^\d+$/.test(normalizedValue)) {
      const groupById = this.gruposItem.find((grupo) => grupo.grpId === Number(normalizedValue));
      return groupById?.grpId ?? null;
    }

    const partialMatches = this.gruposItem.filter((grupo) => grupo.grpDes.trim().toLowerCase().includes(normalizedValue));

    if (partialMatches.length === 1) {
      return partialMatches[0].grpId;
    }

    return null;
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
      return 'No se pudo actualizar el item. Intenta nuevamente.';
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

    return `No se pudo actualizar el item. Codigo HTTP: ${error.status}.`;
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
