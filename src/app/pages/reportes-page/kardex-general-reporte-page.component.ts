import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

import { ApiService } from 'src/app/Services/api.services';

@Component({
  selector: 'app-kardex-general-reporte-page',
  templateUrl: './kardex-general-reporte-page.component.html',
  styleUrls: ['./kardex-general-reporte-page.component.scss']
})
export class KardexGeneralReportePageComponent implements OnInit {
  readonly itemSearchControl = new FormControl('', { nonNullable: true });
  readonly itemIdControl = new FormControl(0, { nonNullable: true });
  readonly allItemsOption = {
    id: 0,
    code: '0',
    description: 'Todos los items'
  };

  itemOptions: KardexItemOption[] = [];
  kardexRows: KardexGeneralRow[] = [];
  isLoadingItems = false;
  isLoadingGrid = false;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarItems();
    this.cargarKardexGeneral();
  }

  get filteredItems(): KardexItemOption[] {
    const search = this.itemSearchControl.value.trim().toLowerCase();

    if (!search) {
      return this.itemOptions;
    }

    return this.itemOptions.filter((item) =>
      [item.code, item.description]
        .some((value) => value.toLowerCase().includes(search))
    );
  }

  onItemSelectOpened(opened: boolean): void {
    if (opened) {
      this.itemSearchControl.setValue('');
    }
  }

  buscar(): void {
    this.cargarKardexGeneral();
  }

  exportarExcel(): void {
    if (!this.kardexRows.length) {
      return;
    }

    const headers = [
      'Mov. ID',
      'Usuario',
      'Solicitante',
      'Cod. Item',
      'Descripcion Item',
      'Centro de Costo',
      'Tipo Movimiento',
      'Tipo',
      'Cantidad'
    ];

    const rows = this.kardexRows.map((row) => [
      row.movimientoId ?? '-',
      row.usuarioCodigo,
      row.usuarioNombre,
      row.itemCode,
      row.itemDescription,
      row.centroCosto,
      row.tipoIngreso,
      this.formatFecha(row.fechaAprobacion),
      this.formatCantidad(row.cantidad)
    ]);

    const workbookXml = this.buildExcelWorkbookXml(headers, rows);
    const blob = new Blob([workbookXml], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.buildFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  formatCantidad(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }).format(value);
  }

  formatFecha(value: string): string {
    const normalizedValue = String(value || '').trim();

    if (!normalizedValue) {
      return '-';
    }

    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
      return normalizedValue;
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  resolveTipoLabel(value: string): string {
    return this.formatFecha(value);
  }

  resolveTipoClass(value: string, isTotal: boolean): string {
    if (isTotal) {
      return 'reporte-panel__tipo-badge--neutral';
    }

    const normalizedValue = this.resolveTipoLabel(value).trim().toUpperCase();

    if (normalizedValue.includes('INGRESO')) {
      return 'reporte-panel__tipo-badge--ingreso';
    }

    if (normalizedValue.includes('SALIDA')) {
      return 'reporte-panel__tipo-badge--salida';
    }

    return 'reporte-panel__tipo-badge--neutral';
  }

  trackByItem(_: number, item: KardexItemOption): number {
    return item.id;
  }

  trackByRow(_: number, row: KardexGeneralRow): string {
    return `${row.itemId}-${row.movimientoId}-${row.usuarioCodigo}-${row.centroCosto}-${row.tipoIngreso}`;
  }

  private buildFileName(): string {
    const selectedItem = this.itemOptions.find((item) => item.id === this.itemIdControl.value);
    const itemSuffix = selectedItem && selectedItem.id !== 0
      ? `_${this.sanitizeFileNameSegment(selectedItem.code || selectedItem.description)}`
      : '_todos';

    const today = new Date();
    const dateStamp = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('');

    return `kardex_general${itemSuffix}_${dateStamp}.xls`;
  }

  private buildExcelWorkbookXml(headers: string[], rows: Array<Array<string | number>>): string {
    const headerCells = headers
      .map((header) => this.buildExcelCell(header, 'Header'))
      .join('');

    const rowCells = rows
      .map((row, index) => {
        const styleId = this.kardexRows[index]?.isTotal ? 'Total' : 'Default';

        return `<Row>${row
          .map((value) => this.buildExcelCell(value, styleId))
          .join('')}</Row>`;
      })
      .join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#6F6B67" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Default">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
    <Style ss:ID="Total">
      <Font ss:Bold="1" ss:Color="#D97800"/>
      <Interior ss:Color="#FFF0E0" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Kardex General">
    <Table>
      <Row>${headerCells}</Row>
      ${rowCells}
    </Table>
  </Worksheet>
</Workbook>`;
  }

  private buildExcelCell(value: string | number, styleId: string): string {
    return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${this.escapeXml(value)}</Data></Cell>`;
  }

  private escapeXml(value: string | number): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private sanitizeFileNameSegment(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'item';
  }

  private cargarItems(): void {
    this.isLoadingItems = true;

    this.apiService.getListarItem({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        const options = this.extractRecords(response)
          .map((item) => this.mapItemOption(item))
          .filter((item): item is KardexItemOption => item !== null)
          .sort((left, right) => left.description.localeCompare(right.description, 'es', { sensitivity: 'base' }));

        this.itemOptions = [this.allItemsOption, ...options];
        this.isLoadingItems = false;
      },
      error: () => {
        this.itemOptions = [this.allItemsOption];
        this.isLoadingItems = false;
      }
    });
  }

  private cargarKardexGeneral(): void {
    this.isLoadingGrid = true;
    this.errorMessage = '';
    const itemId = Number(this.itemIdControl.value ?? 0);

    this.apiService.getGenerarKardexGeneral(itemId).subscribe({
      next: (response: unknown) => {
        this.kardexRows = this.extractRecords(response)
          .map((item) => this.mapKardexRow(item))
          .filter((item): item is KardexGeneralRow => item !== null);
        this.isLoadingGrid = false;
      },
      error: (error: unknown) => {
        this.kardexRows = [];
        this.errorMessage = this.resolveErrorMessage(error, 'No se pudo cargar el kardex general.');
        this.isLoadingGrid = false;
      }
    });
  }

  private mapItemOption(item: DataRecord): KardexItemOption | null {
    const id = this.getNumberValue(item, ['Itm_Id', 'itm_Id', 'itmId', 'id', 'Id']);
    const description = this.getTextValue(item, ['Itm_Des', 'itm_Des', 'itmDes', 'descripcion', 'Descripcion', 'Itm_Nom', 'itm_Nom', 'itmNom']);

    if (!id || !description) {
      return null;
    }

    return {
      id,
      code: this.getTextValue(item, ['Itm_Cod', 'itm_Cod', 'itmCod']) || String(id),
      description
    };
  }

  private mapKardexRow(item: DataRecord): KardexGeneralRow | null {
    const itemId = this.getNumberValue(item, ['Itm_Id', 'itm_Id', 'itmId']) ?? 0;
    const itemCode = this.getTextValue(item, ['Itm_Cod', 'itm_Cod', 'itmCod']);
    const itemDescription = this.getTextValue(item, ['Itm_Des', 'itm_Des', 'itmDes']);
    const usuarioNombre = this.getTextValue(item, ['Usr_Nom', 'usr_Nom', 'usrNom']);
    const cantidad = this.getNumberValue(item, ['Alm_Det_Can', 'alm_Det_Can', 'almDetCan']) ?? 0;

    if (!itemId && !itemCode && !itemDescription && !usuarioNombre) {
      return null;
    }

    return {
      itemId,
      movimientoId: this.getNumberValue(item, ['Alm_Mov_Id', 'alm_Mov_Id', 'almMovId']),
      usuarioCodigo: this.getTextValue(item, ['Alm_Sol_Dni', 'alm_Sol_Dni', 'almSolDni']) || '-',
      usuarioNombre: usuarioNombre || '-',
      itemCode: itemCode || String(itemId || '-'),
      itemDescription: itemDescription || '-',
      centroCosto: this.getTextValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes']) || '-',
      tipoIngreso: this.getTextValue(item, ['Ing_Des', 'ing_Des', 'ingDes']) || '-',
      fechaAprobacion: this.getTextValue(item, ['Flg_Est_Apr', 'flg_Est_Apr', 'flgEstApr']) || '',
      cantidad,
      isTotal: !this.getNumberValue(item, ['Alm_Mov_Id', 'alm_Mov_Id', 'almMovId'])
        && usuarioNombre.toUpperCase().includes('TOTAL')
    };
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is DataRecord => this.isRecord(item));
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const elements = response['Elements'] ?? response['elements'];
    if (Array.isArray(elements)) {
      return elements.filter((item): item is DataRecord => this.isRecord(item));
    }

    const data = response['Data'] ?? response['data'];
    if (Array.isArray(data)) {
      return data.filter((item): item is DataRecord => this.isRecord(item));
    }

    return [response];
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
      const value = item[key];

      if (value === null || value === undefined || value === '') {
        continue;
      }

      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return null;
  }

  private isRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (this.isRecord(error)) {
      const nestedError = this.isRecord(error['error']) ? error['error'] : null;
      const message = String(
        nestedError?.['Message']
        ?? nestedError?.['message']
        ?? error['Message']
        ?? error['message']
        ?? ''
      ).trim();

      if (message) {
        return message;
      }
    }

    return fallback;
  }
}

type DataRecord = Record<string, unknown>;

interface KardexItemOption {
  id: number;
  code: string;
  description: string;
}

interface KardexGeneralRow {
  itemId: number;
  movimientoId: number | null;
  usuarioCodigo: string;
  usuarioNombre: string;
  itemCode: string;
  itemDescription: string;
  centroCosto: string;
  tipoIngreso: string;
  fechaAprobacion: string;
  cantidad: number;
  isTotal: boolean;
}
