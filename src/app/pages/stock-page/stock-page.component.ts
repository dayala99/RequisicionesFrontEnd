import { Component, OnInit } from '@angular/core';

import { ApiService } from 'src/app/Services/api.services';
import { DEFAULT_GRID_PAGE_SIZE, normalizePaginationPage, paginateItems } from 'src/app/shared/utils/pagination.utils';

type DataRecord = Record<string, unknown>;

interface StockRow {
  itemId: number;
  itemCodigo: string;
  descripcion: string;
  grupo: string;
  subGrupo: string;
  detalleMaterial: string;
  stock: number;
}

@Component({
  selector: 'app-stock-page',
  templateUrl: './stock-page.component.html',
  styleUrls: ['./stock-page.component.scss']
})
export class StockPageComponent implements OnInit {
  readonly pageSize = DEFAULT_GRID_PAGE_SIZE;

  items: StockRow[] = [];
  globalSearch = '';
  currentPage = 1;
  isLoading = false;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarStock();
  }

  get filteredItems(): StockRow[] {
    const search = this.globalSearch.trim().toLowerCase();

    if (!search) {
      return this.items;
    }

    return this.items.filter((item) => [
      item.itemCodigo,
      item.descripcion,
      item.grupo,
      item.subGrupo,
      item.detalleMaterial,
      item.stock
    ].some((value) => String(value).toLowerCase().includes(search)));
  }

  get paginatedItems(): StockRow[] {
    return paginateItems(this.filteredItems, this.currentPage, this.pageSize);
  }

  onGlobalSearchChange(value: string): void {
    this.globalSearch = value;
    this.currentPage = normalizePaginationPage(1, this.filteredItems.length, this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = normalizePaginationPage(page, this.filteredItems.length, this.pageSize);
  }

  trackByItem(_: number, item: StockRow): number {
    return item.itemId;
  }

  private cargarStock(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getListarItem({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.items = this.extractRecords(response)
          .map((item) => this.mapStockRow(item))
          .filter((item): item is StockRow => item !== null);
        this.currentPage = normalizePaginationPage(this.currentPage, this.filteredItems.length, this.pageSize);
        this.isLoading = false;
      },
      error: (error: unknown) => {
        this.items = [];
        this.currentPage = 1;
        this.errorMessage = this.resolveErrorMessage(error, 'No se pudo cargar la informacion de stock.');
        this.isLoading = false;
      }
    });
  }

  private mapStockRow(item: DataRecord): StockRow | null {
    const itemId = this.getNumberValue(item, ['Itm_Id', 'itm_Id', 'itmId', 'id', 'Id']);
    const descripcion = this.getTextValue(item, [
      'Itm_Des',
      'itm_Des',
      'itmDes',
      'descripcion',
      'Descripcion',
      'Itm_Nom',
      'itm_Nom',
      'itmNom'
    ]);

    if (!itemId || !descripcion) {
      return null;
    }

    return {
      itemId,
      itemCodigo: this.getTextValue(item, ['Itm_Cod', 'itm_Cod', 'itmCod']) || String(itemId),
      descripcion,
      grupo: this.getTextValue(item, ['Grp_Des', 'grp_Des', 'grpDes']) || '-',
      subGrupo: this.getTextValue(item, ['Sub_Grp_Des', 'sub_Grp_Des', 'subGrpDes']) || '-',
      detalleMaterial: this.getTextValue(item, ['Det_Mat_Des', 'det_Mat_Des', 'detMatDes']) || '-',
      stock: this.getStockValue(item)
    };
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((value): value is DataRecord => this.isDataRecord(value));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = ['data', 'Data', 'result', 'Result', 'elements', 'Elements'];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is DataRecord => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private getTextValue(item: DataRecord, keys: string[]): string {
    for (const key of keys) {
      const value = this.findDataValue(item, key);

      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }

    return '';
  }

  private getNumberValue(item: DataRecord, keys: string[]): number | null {
    for (const key of keys) {
      const value = Number(this.findDataValue(item, key));

      if (Number.isInteger(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private getStockValue(item: DataRecord): number {
    const rawValue = this.findDataValue(item, 'Can_Stk')
      ?? this.findDataValue(item, 'can_Stk')
      ?? this.findDataValue(item, 'canStk')
      ?? this.findDataValue(item, 'Stock')
      ?? this.findDataValue(item, 'stock');
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : 0;
  }

  private findDataValue(item: DataRecord, key: string): unknown {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      return item[key];
    }

    const normalizedKey = this.normalizeDataKey(key);
    const matchedKey = Object.keys(item).find((itemKey) => this.normalizeDataKey(itemKey) === normalizedKey);
    return matchedKey ? item[matchedKey] : undefined;
  }

  private normalizeDataKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  private isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (this.isDataRecord(error)) {
      const nestedError = error['error'];

      if (this.isDataRecord(nestedError)) {
        return this.getTextValue(nestedError, ['message', 'Message', 'detail', 'Detail']) || fallback;
      }
    }

    return fallback;
  }
}
