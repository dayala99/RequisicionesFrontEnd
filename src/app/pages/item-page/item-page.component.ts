import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiService, GrupoItemFiltro, ItemFiltro } from 'src/app/Services/api.services';
import { ItemEditDialogComponent } from './item-edit-dialog.component';
import { ItemRegisterDialogComponent } from './item-register-dialog.component';

type DataRecord = Record<string, unknown>;

interface GrupoItemOption {
  grpId: number;
  grpDes: string;
}

interface ItemRow {
  itmId: number | null;
  itmDes: string;
  itmGrp: number | null;
  grpDes: string;
  flgEst: string;
  estado: string;
  activo: boolean;
}

@Component({
  selector: 'app-item-page',
  templateUrl: './item-page.component.html',
  styleUrls: ['./item-page.component.scss']
})
export class ItemPageComponent implements OnInit {
  readonly filtersForm: FormGroup;
  items: ItemRow[] = [];
  gruposItem: GrupoItemOption[] = [];
  selectedItemId: number | null = null;
  isLoading = false;
  errorMessage = '';
  isGrupoDropdownOpen = false;

  constructor(
    private readonly apiService: ApiService,
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog
  ) {
    this.filtersForm = this.formBuilder.group({
      codigo: [''],
      descripcion: [''],
      grupo: ['Todos'],
      estado: ['A']
    });
  }

  ngOnInit(): void {
    this.cargarGruposItem();
    this.cargarItems();
  }

  cargarItems(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const filtros = this.getFiltros();

    this.apiService.getListarItem(filtros).subscribe({
      next: (response: unknown) => {
        this.items = this.extractRecords(response)
          .map((item) => this.mapItem(item))
          .sort((left, right) => (left.itmId ?? 0) - (right.itmId ?? 0));
        this.syncSelectedItem();
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando items:', error);
        this.items = [];
        this.selectedItemId = null;
        this.errorMessage = 'No se pudo cargar la informacion de items. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      codigo: '',
      descripcion: '',
      grupo: 'Todos',
      estado: 'A'
    });
    this.cargarItems();
  }

  registrarItem(): void {
    const dialogRef = this.dialog.open(ItemRegisterDialogComponent, {
      width: 'min(34rem, 92vw)',
      disableClose: true,
      panelClass: 'animated-dialog-pane',
      backdropClass: 'animated-dialog-backdrop',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((created: boolean | undefined) => {
      if (created) {
        this.cargarItems();
      }
    });
  }

  editarItem(): void {
    const item = this.items.find((currentItem) => currentItem.itmId === this.selectedItemId);

    if (!item || item.itmId === null || item.itmGrp === null) {
      return;
    }

    const dialogRef = this.dialog.open(ItemEditDialogComponent, {
      width: 'min(34rem, 92vw)',
      disableClose: true,
      panelClass: 'animated-dialog-pane',
      backdropClass: 'animated-dialog-backdrop',
      autoFocus: false,
      data: { item }
    });

    dialogRef.afterClosed().subscribe((updated: boolean | undefined) => {
      if (updated) {
        this.cargarItems();
      }
    });
  }

  seleccionarItem(item: ItemRow): void {
    this.selectedItemId = item.itmId;
  }

  isSelected(item: ItemRow): boolean {
    return item.itmId !== null && item.itmId === this.selectedItemId;
  }

  trackByItem(_index: number, item: ItemRow): string {
    return item.itmId !== null ? String(item.itmId) : `${item.itmDes}-${item.itmGrp ?? 'sin-grupo'}`;
  }

  trackByGrupo(_index: number, grupo: GrupoItemOption): string {
    return String(grupo.grpId);
  }

  get grupoFilterOptions(): string[] {
    return ['Todos', ...this.gruposItem.map((grupo) => grupo.grpDes)];
  }

  get filteredGrupoOptions(): string[] {
    const currentValue = String(this.filtersForm.controls['grupo'].value ?? '').trim().toLowerCase();

    if (!currentValue) {
      return this.grupoFilterOptions;
    }

    return this.grupoFilterOptions.filter((option) => option.toLowerCase().includes(currentValue));
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

  selectGrupoFilter(option: string): void {
    this.filtersForm.controls['grupo'].setValue(option);
    this.isGrupoDropdownOpen = false;
  }

  private cargarGruposItem(): void {
    const filtros: GrupoItemFiltro = {};

    this.apiService.getListarGrupoItem(filtros).subscribe({
      next: (response: unknown) => {
        this.gruposItem = this.extractRecords(response)
          .map((item) => this.mapGrupoItem(item))
          .filter((grupo) => grupo.grpId > 0)
          .sort((left, right) => left.grpDes.localeCompare(right.grpDes));
      },
      error: (error: unknown) => {
        console.error('Error cargando grupos de item:', error);
        this.gruposItem = [];
      }
    });
  }

  private syncSelectedItem(): void {
    if (!this.items.some((item) => item.itmId === this.selectedItemId)) {
      this.selectedItemId = this.items[0]?.itmId ?? null;
    }
  }

  private getFiltros(): ItemFiltro {
    const codigoRaw = this.getCodigoBuscado();
    const descripcion = String(this.filtersForm.controls['descripcion'].value ?? '').trim();
    const grupoRaw = String(this.filtersForm.controls['grupo'].value ?? '').trim();
    const estado = String(this.filtersForm.controls['estado'].value ?? '').trim() || 'A';
    const filtros: ItemFiltro = {
      Flg_Est: estado
    };

    if (codigoRaw) {
      const codigo = Number(codigoRaw);

      if (Number.isInteger(codigo) && codigo > 0) {
        filtros.Itm_Id = codigo;
      }
    }

    if (descripcion) {
      filtros.Itm_Des = descripcion;
    }

    const grupoId = this.resolveGrupoId(grupoRaw);

    if (grupoId !== null) {
      filtros.Itm_Grp = grupoId;
    }

    return filtros;
  }

  private getCodigoBuscado(): string {
    return String(this.filtersForm.controls['codigo'].value ?? '').trim();
  }

  private resolveGrupoId(value: string): number | null {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue || normalizedValue === 'todos') {
      return null;
    }

    if (/^\d+$/.test(normalizedValue)) {
      const groupById = this.gruposItem.find((grupo) => grupo.grpId === Number(normalizedValue));
      return groupById?.grpId ?? null;
    }

    const exactMatch = this.gruposItem.find((grupo) => grupo.grpDes.trim().toLowerCase() === normalizedValue);

    if (exactMatch) {
      return exactMatch.grpId;
    }

    const partialMatches = this.gruposItem.filter((grupo) => grupo.grpDes.trim().toLowerCase().includes(normalizedValue));

    if (partialMatches.length === 1) {
      return partialMatches[0].grpId;
    }

    return null;
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((value): value is DataRecord => this.isDataRecord(value));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = ['items', 'Items', 'grupoItems', 'GrupoItems', 'elements', 'Elements', 'data', 'Data', 'result', 'Result'];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is DataRecord => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private mapItem(item: DataRecord): ItemRow {
    const flgEst = this.getTextValue(item, ['Flg_Est', 'flg_Est', 'flgEst']) || 'A';
    const activo = flgEst.toUpperCase() === 'A';

    return {
      itmId: this.getNumberValue(item, ['Itm_Id', 'itm_Id', 'itmId', 'id', 'Id']),
      itmDes: this.getTextValue(item, ['Itm_Des', 'itm_Des', 'itmDes', 'descripcion', 'Descripcion']),
      itmGrp: this.getNumberValue(item, ['Itm_Grp', 'itm_Grp', 'itmGrp', 'grpId', 'Grp_Id']),
      grpDes: this.getTextValue(item, ['Grp_Des', 'grp_Des', 'grpDes', 'grupo', 'Grupo']),
      flgEst,
      estado: activo ? 'Activo' : 'Inactivo',
      activo
    };
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
}
