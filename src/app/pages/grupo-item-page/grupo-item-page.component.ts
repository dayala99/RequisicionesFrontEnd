import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiService, GrupoItemFiltro } from 'src/app/Services/api.services';
import { GrupoItemEditDialogComponent } from './grupo-item-edit-dialog.component';
import { GrupoItemRegisterDialogComponent } from './grupo-item-register-dialog.component';

type DataRecord = Record<string, unknown>;

interface GrupoItemRow {
  grpId: number | null;
  grpDes: string;
  flgEst: string;
  estado: string;
  activo: boolean;
}

@Component({
  selector: 'app-grupo-item-page',
  templateUrl: './grupo-item-page.component.html',
  styleUrls: ['./grupo-item-page.component.scss']
})
export class GrupoItemPageComponent implements OnInit {
  readonly filtersForm: FormGroup;
  gruposItem: GrupoItemRow[] = [];
  selectedGrupoItemId: number | null = null;
  isLoading = false;
  errorMessage = '';
  private appliedFilters: GrupoItemFiltro = { Flg_Est: 'A' };

  constructor(
    private readonly apiService: ApiService,
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog
  ) {
    this.filtersForm = this.formBuilder.group({
      codigo: [''],
      descripcion: [''],
      estado: ['A']
    });
  }

  ngOnInit(): void {
    this.cargarGrupoItem();
  }

  cargarGrupoItem(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const filtros = this.getFiltros();
    this.appliedFilters = { ...filtros };

    this.apiService.getListarGrupoItem(filtros).subscribe({
      next: (response: unknown) => {
        this.gruposItem = this.extractRecords(response)
          .map((item) => this.mapGrupoItem(item))
          .sort((left, right) => (left.grpId ?? 0) - (right.grpId ?? 0));
        this.syncSelectedGrupoItem();
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando grupos de item:', error);
        this.gruposItem = [];
        this.selectedGrupoItemId = null;
        this.errorMessage = 'No se pudo cargar la informacion de grupos de item. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      codigo: '',
      descripcion: '',
      estado: 'A'
    });
    this.cargarGrupoItem();
  }

  registrarGrupoItem(): void {
    const dialogRef = this.dialog.open(GrupoItemRegisterDialogComponent, {
      width: 'min(32rem, 92vw)',
      disableClose: true,
      panelClass: 'animated-dialog-pane',
      backdropClass: 'animated-dialog-backdrop',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((created: boolean | undefined) => {
      if (created) {
        this.cargarGrupoItem();
      }
    });
  }

  editarGrupoItem(): void {
    const grupoItem = this.gruposItem.find((item) => item.grpId === this.selectedGrupoItemId);

    if (!grupoItem || grupoItem.grpId === null) {
      return;
    }

    const dialogRef = this.dialog.open(GrupoItemEditDialogComponent, {
      width: 'min(32rem, 92vw)',
      disableClose: true,
      panelClass: 'animated-dialog-pane',
      backdropClass: 'animated-dialog-backdrop',
      autoFocus: false,
      data: { grupoItem }
    });

    dialogRef.afterClosed().subscribe((updated: boolean | undefined) => {
      if (updated) {
        this.cargarGrupoItem();
      }
    });
  }

  seleccionarGrupoItem(grupoItem: GrupoItemRow): void {
    this.selectedGrupoItemId = grupoItem.grpId;
  }

  isSelected(grupoItem: GrupoItemRow): boolean {
    return grupoItem.grpId !== null && grupoItem.grpId === this.selectedGrupoItemId;
  }

  trackByGrupoItem(_index: number, grupoItem: GrupoItemRow): string {
    return grupoItem.grpId !== null ? String(grupoItem.grpId) : grupoItem.grpDes;
  }

  get emptyStateMessage(): string {
    const codigo = String(this.appliedFilters.Grp_Id ?? '').trim();
    const descripcion = String(this.appliedFilters.Grp_Des ?? '').trim();
    const estado = this.getEstadoTexto(this.appliedFilters.Flg_Est);
    const hasSpecificFilters = Boolean(codigo || descripcion);

    if (hasSpecificFilters) {
      return `No se encontraron grupos de item ${estado.toLowerCase()} con los filtros aplicados.`;
    }

    return `No se encontraron grupos de item ${estado.toLowerCase()} para mostrar.`;
  }

  sanitizeCodigoInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    const sanitizedValue = input.value.replace(/[^\d]/g, '');

    if (sanitizedValue !== input.value) {
      input.value = sanitizedValue;
      this.filtersForm.controls['codigo'].setValue(sanitizedValue, { emitEvent: false });
    }
  }

  private syncSelectedGrupoItem(): void {
    if (!this.gruposItem.some((item) => item.grpId === this.selectedGrupoItemId)) {
      this.selectedGrupoItemId = this.gruposItem[0]?.grpId ?? null;
    }
  }

  private getFiltros(): GrupoItemFiltro {
    const codigoRaw = this.getCodigoBuscado();
    const descripcion = String(this.filtersForm.controls['descripcion'].value ?? '').trim();
    const estado = String(this.filtersForm.controls['estado'].value ?? '').trim() || 'A';
    const filtros: GrupoItemFiltro = {
      Flg_Est: estado
    };

    if (codigoRaw) {
      const codigo = Number(codigoRaw);

      if (Number.isInteger(codigo) && codigo > 0) {
        filtros.Grp_Id = codigo;
      }
    }

    if (descripcion) {
      filtros.Grp_Des = descripcion;
    }

    return filtros;
  }

  private getCodigoBuscado(): string {
    return String(this.filtersForm.controls['codigo'].value ?? '').trim();
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

    return this.looksLikeGrupoItemRecord(response) ? [response] : [];
  }

  private mapGrupoItem(item: DataRecord): GrupoItemRow {
    const flgEst = this.getTextValue(item, ['Flg_Est', 'flg_Est', 'flgEst']) || 'A';
    const activo = flgEst.toUpperCase() === 'A';

    return {
      grpId: this.getNumberValue(item, ['Grp_Id', 'grp_Id', 'grpId', 'id', 'Id']),
      grpDes: this.getTextValue(item, ['Grp_Des', 'grp_Des', 'grpDes', 'descripcion', 'Descripcion']),
      flgEst,
      estado: activo ? 'Activo' : 'Inactivo',
      activo
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

  private getEstadoTexto(flgEst: string | undefined): string {
    const estado = String(flgEst ?? 'A').trim().toUpperCase();
    return estado === 'I' ? 'inactivos' : 'activos';
  }

  private looksLikeGrupoItemRecord(item: DataRecord): boolean {
    const recordKeys = ['Grp_Id', 'grp_Id', 'grpId', 'Grp_Des', 'grp_Des', 'grpDes', 'Flg_Est', 'flg_Est', 'flgEst'];
    return recordKeys.some((key) => Object.prototype.hasOwnProperty.call(item, key));
  }
}
