import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import {
  AsignarOrdenCompraDetallePedidoRequest,
  ActualizarDetallePedidoRequest,
  ActualizarOrdenCompraRequest,
  ApiService,
  DesAsignarOrdenCompraDetallePedidoRequest,
  OrdenCompraFiltro,
  PedidosFiltro,
  RegistrarOrdenCompraRequest
} from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ProviderSelectorDialogComponent } from 'src/app/features/provider-form/dialogs/provider-selector-dialog.component';
import { PaymentOption, ProviderRecord } from 'src/app/features/provider-form/provider-form.models';
import { DEFAULT_GRID_PAGE_SIZE, normalizePaginationPage, paginateItems } from 'src/app/shared/utils/pagination.utils';
import { noWhitespaceValidator } from 'src/app/shared/validators/form-validators';
import { OrdenCompraParcialDialogComponent } from './orden-compra-parcial-dialog.component';

type DataRecord = Record<string, unknown>;
type OrdenCompraListadoModo = 'pendientes' | 'generados';

interface OrdenCompraRow {
  id: number;
  ordenCompraId: number | null;
  pedidoIdAtencion: number | null;
  proveedorId: number;
  proveedor: string;
  formaPagoId: number;
  formaPago: string;
  referenciaObra: string;
  referencia: string;
  observacion: string;
  subtotal: number;
  igv: number;
  total: number;
  detraccionId: number;
  montoDetraccion: number;
  archivo: string;
  archivoRuta: string;
  estadoCodigo: string;
  estado: string;
  canEdit: boolean;
}

interface PedidoPendienteRow {
  id: number;
  pedidoId: number;
  proveedor: string;
  tipoServicio: string;
  referencia: string;
  moneda: string;
  total: number;
  estadoCodigo: string;
  estado: string;
}

interface OrdenCompraCentroCostoRow {
  id: number;
  codigo: number;
  descripcion: string;
  selected: boolean;
}

interface OrdenCompraDetallePedidoRow {
  id: number;
  ordenCompraId: number | null;
  itemCodigo: string;
  itemDescripcion: string;
  unidadCodigo: string;
  unidadDescripcion: string;
  centroCostoCodigo: number | null;
  centroCostoDescripcion: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  observacion: string;
  selected: boolean;
}

interface DetraccionOption {
  id: number;
  descripcion: string;
  porcentaje: number;
  label: string;
}

@Component({
  selector: 'app-orden-compra-page',
  templateUrl: './orden-compra-page.component.html',
  styleUrls: ['./orden-compra-page.component.scss']
})
export class OrdenCompraPageComponent implements OnInit {
  readonly filtersForm: FormGroup;
  readonly form: FormGroup;
  readonly pageSize = DEFAULT_GRID_PAGE_SIZE;
  readonly estadoOptions = [
    { codigo: 'A', descripcion: 'Activo' },
    { codigo: 'I', descripcion: 'Inactivo' }
  ];
  readonly listadoOptions: Array<{ codigo: OrdenCompraListadoModo; descripcion: string }> = [
    { codigo: 'pendientes', descripcion: 'Pendientes' },
    { codigo: 'generados', descripcion: 'Generados' }
  ];
  readonly actionButtons = ['Nuevo', 'Cerrar'];

  ordenesCompra: OrdenCompraRow[] = [];
  pedidosPendientes: PedidoPendienteRow[] = [];
  proveedores: ProviderRecord[] = [];
  formasPago: PaymentOption[] = [];
  centrosCostoCatalogo: OrdenCompraCentroCostoRow[] = [];
  centrosCosto: OrdenCompraCentroCostoRow[] = [];
  pedidoDetalles: OrdenCompraDetallePedidoRow[] = [];
  detracciones: DetraccionOption[] = [];
  formaPagoSearch = '';
  detraccionSearch = '';
  currentOrdenesCompraPage = 1;
  currentPedidosPendientesPage = 1;
  currentDetallePedidoPage = 1;

  selectedOrdenCompraId: number | null = null;
  mostrarEditor = false;
  isEditingOrdenCompra = false;
  isLoadingOrdenesCompra = false;
  isLoadingProveedores = false;
  isLoadingFormasPago = false;
  isLoadingCentrosCosto = false;
  isLoadingDetracciones = false;
  isLoadingPedidoCentrosCosto = false;
  isLoadingPedidoDetalle = false;
  isSavingOrdenCompra = false;
  esParcial = false;
  errorMessage = '';
  saveErrorMessage = '';
  centrosCostoErrorMessage = '';
  detallePedidoErrorMessage = '';
  ordenCompraArchivoAdjunto = 'Sin archivo adjunto';
  ordenCompraArchivoRuta = '';
  ordenCompraArchivoFile: File | null = null;
  detallesPendientesDesasignacion: OrdenCompraDetallePedidoRow[] = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.filtersForm = this.formBuilder.group({
      modoListado: ['pendientes'],
      ordenCompraId: [''],
      proveedor: [''],
      estado: ['A']
    });

    this.form = this.formBuilder.group({
      ordenCompraId: [null],
      pedidoIdAtencion: [null],
      proveedorId: [0],
      proveedor: ['', [Validators.required, noWhitespaceValidator()]],
      telefono: [''],
      direccion: [''],
      contacto: [''],
      ruc: [''],
      formaPagoId: [0],
      formaPago: ['', [Validators.required, noWhitespaceValidator()]],
      referenciaObra: [''],
      referencia: [''],
      observacion: [''],
      archivo: ['Sin archivo adjunto'],
      detraccionId: [null],
      montoDetraccion: [0],
      subtotal: [0, Validators.min(0)],
      igv: [0, Validators.min(0)],
      total: [0, Validators.min(0)],
      estado: ['A', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarProveedores();
    this.cargarFormasPago();
    this.cargarCentrosCosto();
    this.cargarDetracciones();
    this.cargarPedidosPendientes();
    this.resetEditor();
  }

  get proveedorButtonLabel(): string {
    return this.form.controls['proveedor'].value?.trim() || 'Seleccionar proveedor';
  }

  get canModifySelectedOrdenCompra(): boolean {
    return !!this.getOrdenCompraSeleccionada()?.canEdit;
  }

  get formaPagoButtonLabel(): string {
    const formaPagoId = Number(this.form.controls['formaPagoId'].value ?? 0);
    return formaPagoId > 0 ? String(formaPagoId) : 'Seleccionar';
  }

  get subtotalCalculado(): number {
    return this.normalizeDecimal(
      this.detallesPedidoSeleccionados.reduce((total, item) => total + item.subtotal, 0)
    );
  }

  get igvCalculado(): number {
    return this.normalizeDecimal(this.subtotalCalculado * 0.18);
  }

  get totalCalculado(): number {
    return this.normalizeDecimal(this.totalConIgvCalculado - this.montoDetraccionCalculado);
  }

  get totalConIgvCalculado(): number {
    return this.normalizeDecimal(this.subtotalCalculado + this.igvCalculado);
  }

  get detraccionSeleccionada(): DetraccionOption | null {
    const detraccionId = this.getDetraccionIdSeleccionada();
    return this.detracciones.find((item) => item.id === detraccionId) ?? null;
  }

  get montoDetraccionCalculado(): number {
    const porcentaje = this.detraccionSeleccionada?.porcentaje ?? 0;
    return this.normalizeDecimal(this.totalConIgvCalculado * porcentaje / 100);
  }

  get filteredDetracciones(): DetraccionOption[] {
    const search = this.detraccionSearch.trim().toLowerCase();

    if (!search) {
      return this.detracciones;
    }

    return this.detracciones.filter((item) =>
      item.label.toLowerCase().includes(search) ||
      item.descripcion.toLowerCase().includes(search) ||
      String(item.porcentaje).includes(search)
    );
  }

  get filteredFormasPago(): PaymentOption[] {
    const search = this.formaPagoSearch.trim().toLowerCase();

    if (!search) {
      return this.formasPago;
    }

    return this.formasPago.filter((item) =>
      item.description.toLowerCase().includes(search) ||
      String(item.code).includes(search)
    );
  }

  get centrosCostoSeleccionados(): OrdenCompraCentroCostoRow[] {
    return this.centrosCosto.filter((item) => item.selected);
  }

  get estanTodosLosCentrosSeleccionados(): boolean {
    return !!this.centrosCosto.length && this.centrosCosto.every((item) => item.selected);
  }

  get detallesPedidoSeleccionados(): OrdenCompraDetallePedidoRow[] {
    const idsPendientes = new Set(this.detallesPendientesDesasignacion.map((item) => item.id));
    return this.pedidoDetalles.filter((item) => item.selected && !idsPendientes.has(item.id));
  }

  get paginatedOrdenesCompra(): OrdenCompraRow[] {
    return paginateItems(this.ordenesCompra, this.currentOrdenesCompraPage, this.pageSize);
  }

  get paginatedPedidosPendientes(): PedidoPendienteRow[] {
    return paginateItems(this.pedidosPendientes, this.currentPedidosPendientesPage, this.pageSize);
  }

  get isListadoGenerados(): boolean {
    return this.getListadoModo() === 'generados';
  }

  get paginatedPedidoDetalles(): OrdenCompraDetallePedidoRow[] {
    return paginateItems(this.pedidoDetalles, this.currentDetallePedidoPage, this.pageSize);
  }

  get estanTodosLosDetallesSeleccionados(): boolean {
    return !!this.pedidoDetalles.length && this.pedidoDetalles.every((item) => item.selected);
  }

  get resumenCentrosCosto(): string {
    if (!this.centrosCosto.length) {
      return 'Ingresa un numero de pedido para cargar los centros de costo vinculados.';
    }

    if (this.esParcial) {
      return this.centrosCostoSeleccionados.length
        ? `${this.centrosCostoSeleccionados.length} centro(s) seleccionado(s) para actualizacion parcial.`
        : 'Selecciona los centros de costo que deben recibir la orden de compra.';
    }

    return `${this.centrosCosto.length} centro(s) incluidos en la orden completa.`;
  }

  aplicarFiltros(): void {
    this.cargarListadoSeleccionado();
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      modoListado: 'pendientes',
      ordenCompraId: '',
      proveedor: '',
      estado: 'A'
    });
    this.cargarPedidosPendientes();
  }

  onListadoModoChange(): void {
    this.errorMessage = '';
    this.selectedOrdenCompraId = null;
    this.cargarListadoSeleccionado();
  }

  generarOrdenCompraDesdePedido(item: PedidoPendienteRow): void {
    if (!item.pedidoId) {
      return;
    }

    this.isEditingOrdenCompra = false;
    this.resetEditor();
    this.esParcial = false;
    this.aplicarModoCentrosCosto();
    this.form.patchValue({
      pedidoIdAtencion: item.pedidoId
    });
    this.mostrarEditor = true;
    this.cargarCentrosCostoDesdePedido();
  }

  ejecutarAccion(action: string): void {
    if (action === 'Nuevo') {
      this.iniciarNuevaOrdenCompra();
      return;
    }

    this.cerrarVistaActual();
  }

  editarOrdenCompraDesdeFila(item: OrdenCompraRow): void {
    this.selectedOrdenCompraId = item.id;
    this.iniciarEdicionOrdenCompra();
  }

  seleccionarOrdenCompra(item: OrdenCompraRow): void {
    this.selectedOrdenCompraId = item.id;
  }

  isOrdenCompraSeleccionada(item: OrdenCompraRow): boolean {
    return this.selectedOrdenCompraId === item.id;
  }

  trackByOrdenCompra(_: number, item: OrdenCompraRow): number {
    return item.id;
  }

  trackByCentroCosto(_: number, item: OrdenCompraCentroCostoRow): number {
    return item.id;
  }

  trackByDetallePedido(_: number, item: OrdenCompraDetallePedidoRow): number {
    return item.id;
  }

  onOrdenesCompraPageChange(page: number): void {
    this.currentOrdenesCompraPage = normalizePaginationPage(page, this.ordenesCompra.length, this.pageSize);
  }

  onPedidosPendientesPageChange(page: number): void {
    this.currentPedidosPendientesPage = normalizePaginationPage(page, this.pedidosPendientes.length, this.pageSize);
  }

  onDetallePedidoPageChange(page: number): void {
    this.currentDetallePedidoPage = normalizePaginationPage(page, this.pedidoDetalles.length, this.pageSize);
  }

  onMontoInput(controlName: 'subtotal' | 'igv' | 'total', event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    const sanitizedValue = input.value.replace(/[^\d.,]/g, '');

    if (sanitizedValue !== input.value) {
      input.value = sanitizedValue;
    }

    this.form.controls[controlName].setValue(sanitizedValue, { emitEvent: false });
  }

  onDetraccionSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.detraccionSearch = input?.value ?? '';
  }

  onDetraccionChange(): void {
    this.syncTotalesCalculados();
  }

  private getDetraccionIdSeleccionada(): number {
    const value = this.form.controls['detraccionId'].value;
    const detraccionId = Number(value);

    return Number.isInteger(detraccionId) && detraccionId > 0 ? detraccionId : 0;
  }

  actualizarObservacionDetallePedido(item: OrdenCompraDetallePedidoRow, observacion: string): void {
    this.pedidoDetalles = this.pedidoDetalles.map((detalle) =>
      detalle.id === item.id
        ? { ...detalle, observacion }
        : detalle
    );
  }

  actualizarCostoUnitarioDetallePedido(item: OrdenCompraDetallePedidoRow, event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    const sanitizedValue = this.sanitizeDecimalInput(input.value);

    if (sanitizedValue !== input.value) {
      input.value = sanitizedValue;
    }

    const costoUnitario = this.parseMontoControlValue(sanitizedValue);
    const subtotal = this.normalizeDecimal(item.cantidad * costoUnitario);

    this.pedidoDetalles = this.pedidoDetalles.map((detalle) =>
      detalle.id === item.id
        ? { ...detalle, costoUnitario, subtotal }
        : detalle
    );
    this.syncTotalesCalculados();
  }

  isDetallePendienteDesasignacion(item: OrdenCompraDetallePedidoRow): boolean {
    return this.detallesPendientesDesasignacion.some((detalle) => detalle.id === item.id);
  }

  quitarDetallePedido(item: OrdenCompraDetallePedidoRow): void {
    if (!this.isEditingOrdenCompra || this.isLoadingPedidoDetalle || this.isSavingOrdenCompra) {
      return;
    }

    this.detallePedidoErrorMessage = '';

    if (this.isDetallePendienteDesasignacion(item)) {
      this.detallesPendientesDesasignacion = this.detallesPendientesDesasignacion.filter((detalle) => detalle.id !== item.id);
      this.detallePedidoErrorMessage = this.detallesPendientesDesasignacion.length
        ? 'Hay detalles marcados para desasignacion. Los cambios se aplicaran al actualizar.'
        : '';
      this.syncTotalesCalculados();
      return;
    }

    this.detallesPendientesDesasignacion = [...this.detallesPendientesDesasignacion, item];
    this.syncTotalesCalculados();
    this.detallePedidoErrorMessage = 'El detalle fue marcado para desasignacion. Los cambios se aplicaran al actualizar.';
  }

  onPedidoIdEnter(event: Event): void {
    event.preventDefault();

    if (this.isLoadingPedidoCentrosCosto || this.isLoadingPedidoDetalle) {
      return;
    }

    this.cargarCentrosCostoDesdePedido();
  }

  openProveedorDialog(): void {
    if (this.isLoadingProveedores) {
      return;
    }

    if (!this.proveedores.length) {
      this.saveErrorMessage = 'No hay proveedores activos disponibles.';
      return;
    }

    const dialogRef = this.dialog.open(ProviderSelectorDialogComponent, {
      autoFocus: false,
      width: '40rem',
      data: {
        providers: this.proveedores
      }
    });

    dialogRef.afterClosed().subscribe((provider?: ProviderRecord) => {
      if (!provider) {
        return;
      }

      this.form.patchValue({
        proveedorId: provider.code,
        proveedor: provider.name,
        telefono: provider.phone,
        direccion: provider.address,
        contacto: provider.contact,
        ruc: provider.ruc
      });
    });
  }

  onFormaPagoChange(formaPagoId: number | null): void {
    const selectedFormaPago = this.formasPago.find((item) => item.code === Number(formaPagoId));

    this.form.patchValue({
      formaPago: selectedFormaPago?.description ?? ''
    });
  }

  toggleCentroCosto(item: OrdenCompraCentroCostoRow): void {
    this.centrosCosto = this.centrosCosto.map((centroCosto) =>
      centroCosto.id === item.id
        ? { ...centroCosto, selected: !centroCosto.selected }
        : centroCosto
    );
  }

  toggleTodosLosCentrosCosto(): void {
    if (!this.centrosCosto.length) {
      return;
    }

    const shouldSelect = !this.estanTodosLosCentrosSeleccionados;

    this.centrosCosto = this.centrosCosto.map((item) => ({
      ...item,
      selected: shouldSelect
    }));
  }

  toggleDetallePedido(item: OrdenCompraDetallePedidoRow): void {
    this.pedidoDetalles = this.pedidoDetalles.map((detalle) =>
      detalle.id === item.id
        ? { ...detalle, selected: !detalle.selected }
        : detalle
    );
    this.syncTotalesCalculados();
  }

  toggleTodosLosDetallesPedido(): void {
    if (!this.pedidoDetalles.length) {
      return;
    }

    const shouldSelect = !this.estanTodosLosDetallesSeleccionados;

    this.pedidoDetalles = this.pedidoDetalles.map((item) => ({
      ...item,
      selected: shouldSelect
    }));
    this.syncTotalesCalculados();
  }

  cargarCentrosCostoDesdePedido(): void {
    const pedidoId = Number(this.form.controls['pedidoIdAtencion'].value);

    this.centrosCostoErrorMessage = '';
    this.detallePedidoErrorMessage = '';
    this.saveErrorMessage = '';

    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      this.centrosCosto = [];
      this.pedidoDetalles = [];
      this.centrosCostoErrorMessage = 'Ingresa un numero de pedido valido para cargar sus centros de costo.';
      return;
    }

    this.isLoadingPedidoCentrosCosto = true;
    this.isLoadingPedidoDetalle = true;
    this.centrosCosto = [];
    this.pedidoDetalles = [];
    this.currentDetallePedidoPage = 1;

    this.loadPedidoData(pedidoId).subscribe({
      next: ({ centrosCostoResponse, detalleResponse }) => {
        this.applyPedidoDataResponse(centrosCostoResponse, detalleResponse);
      },
      error: (error: unknown) => {
        this.handlePedidoDataError(error);
      }
    });
  }

  guardarOrdenCompra(): void {
    this.saveErrorMessage = '';

    if (this.debeConfirmarRegistroParcial()) {
      this.confirmarRegistroParcial();
      return;
    }

    this.ejecutarGuardarOrdenCompra();
  }

  private ejecutarGuardarOrdenCompra(): void {
    const request$ = this.isEditingOrdenCompra
      ? this.buildActualizarOrdenCompraRequest()
      : this.buildRegistrarOrdenCompraRequest();

    if (!request$) {
      return;
    }

    this.isSavingOrdenCompra = true;

    request$.pipe(
      switchMap((response: unknown) => {
        this.assertSuccessfulResponse(response, 'No se pudo guardar la orden de compra.');
        return this.sincronizarDetallePedidoSeleccionado(response);
      })
    ).subscribe({
      next: () => {
        this.isSavingOrdenCompra = false;
        this.cerrarEditor();
        this.cargarListadoSeleccionado();
        window.dispatchEvent(new CustomEvent('process-notifications-refresh'));
      },
      error: (error: unknown) => {
        this.isSavingOrdenCompra = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo guardar la orden de compra.');
      }
    });
  }

  private debeConfirmarRegistroParcial(): boolean {
    if (this.isEditingOrdenCompra || !this.pedidoDetalles.length) {
      return false;
    }

    const totalDetalles = this.pedidoDetalles.length;
    const totalSeleccionados = this.detallesPedidoSeleccionados.length;

    return totalSeleccionados > 0 && totalSeleccionados < totalDetalles;
  }

  private confirmarRegistroParcial(): void {
    const dialogRef = this.dialog.open(OrdenCompraParcialDialogComponent, {
      autoFocus: false,
      width: '28rem'
    });

    dialogRef.afterClosed().subscribe((confirmado?: boolean) => {
      if (confirmado) {
        this.ejecutarGuardarOrdenCompra();
      }
    });
  }

  cancelarEdicion(): void {
    this.cerrarEditor();
  }

  onOrdenCompraFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    this.ordenCompraArchivoFile = input.files[0];
    this.ordenCompraArchivoAdjunto = this.ordenCompraArchivoFile.name;
    this.ordenCompraArchivoRuta = '';
    this.form.patchValue({
      archivo: this.ordenCompraArchivoAdjunto
    });
  }

  quitarOrdenCompraArchivo(fileInput?: HTMLInputElement): void {
    this.ordenCompraArchivoFile = null;
    this.ordenCompraArchivoAdjunto = 'Sin archivo adjunto';
    this.ordenCompraArchivoRuta = '';
    this.form.patchValue({
      archivo: this.ordenCompraArchivoAdjunto
    });

    if (fileInput) {
      fileInput.value = '';
    }
  }

  verOrdenCompraArchivo(): void {
    this.saveErrorMessage = '';

    if (this.ordenCompraArchivoFile) {
      const url = URL.createObjectURL(this.ordenCompraArchivoFile);
      window.open(url, '_blank');
      return;
    }

    const nombreArchivo = String(this.form.controls['archivo'].value || '').trim();

    if (nombreArchivo && nombreArchivo !== 'Sin archivo adjunto') {
      this.apiService.getArchivoOrdenCompra(nombreArchivo).subscribe({
        next: (arrayBuffer: ArrayBuffer) => {
          const blob = new Blob([arrayBuffer], { type: this.getMimeTypeFromFileName(nombreArchivo) });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: (error: unknown) => {
          console.error('Error abriendo archivo de orden de compra:', error);
          this.saveErrorMessage = 'No se pudo abrir el archivo de la orden de compra.';
        }
      });
      return;
    }

    this.saveErrorMessage = 'No hay archivo adjunto para visualizar.';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private iniciarNuevaOrdenCompra(): void {
    this.isEditingOrdenCompra = false;
    this.resetEditor();
    this.esParcial = false;
    this.aplicarModoCentrosCosto();
    this.mostrarEditor = true;
  }

  private iniciarEdicionOrdenCompra(): void {
    const ordenCompra = this.getOrdenCompraSeleccionada();

    if (!ordenCompra || !ordenCompra.canEdit || ordenCompra.ordenCompraId === null) {
      this.errorMessage = 'La orden listada no incluye identificador de O/C para modificarla.';
      return;
    }

    this.isEditingOrdenCompra = true;
    this.errorMessage = '';
    this.cargarOrdenCompraParaModificar(ordenCompra);
  }

  private cerrarVistaActual(): void {
    if (this.mostrarEditor) {
      this.cerrarEditor();
      return;
    }

    this.selectedOrdenCompraId = null;
  }

  private cerrarEditor(): void {
    this.mostrarEditor = false;
    this.isEditingOrdenCompra = false;
    this.saveErrorMessage = '';
    this.resetEditor();
  }

  private resetEditor(): void {
      this.form.reset({
        ordenCompraId: null,
        pedidoIdAtencion: null,
        proveedorId: 0,
        proveedor: '',
        telefono: '',
        direccion: '',
        contacto: '',
        ruc: '',
        formaPagoId: 0,
        formaPago: '',
      referenciaObra: '',
      referencia: '',
      observacion: '',
      archivo: 'Sin archivo adjunto',
      detraccionId: null,
      montoDetraccion: 0,
      subtotal: 0,
      igv: 0,
      total: 0,
      estado: 'A'
    });
    this.esParcial = false;
    this.detraccionSearch = '';
    this.centrosCosto = [];
    this.pedidoDetalles = [];
    this.detallesPendientesDesasignacion = [];
    this.centrosCostoErrorMessage = '';
    this.detallePedidoErrorMessage = '';
    this.ordenCompraArchivoAdjunto = 'Sin archivo adjunto';
    this.ordenCompraArchivoRuta = '';
    this.ordenCompraArchivoFile = null;
    this.syncTotalesCalculados();
  }

  private aplicarModoCentrosCosto(): void {
    this.centrosCosto = this.centrosCosto.map((item) => ({
      ...item,
      selected: false
    }));
    this.pedidoDetalles = this.pedidoDetalles.map((item) => ({
      ...item,
      selected: false
    }));
    this.syncTotalesCalculados();
  }

  private buildRegistrarOrdenCompraRequest(): Observable<unknown> | null {
    const payload = this.buildOrdenCompraPayloadBase();

    if (!payload) {
      return null;
    }

    const currentUser = this.authService.getCurrentUser().trim();

    if (!currentUser) {
      this.saveErrorMessage = 'No se encontro el usuario actual de la sesion.';
      return null;
    }

    const request: RegistrarOrdenCompraRequest = {
      ...payload,
      Usr_Reg: currentUser
    };

    return this.apiService.postRegistrarOrdenCompra(request, this.ordenCompraArchivoFile);
  }

  private buildActualizarOrdenCompraRequest(): Observable<unknown> | null {
    const payload = this.buildOrdenCompraPayloadBase();

    if (!payload) {
      return null;
    }

    const currentUser = this.authService.getCurrentUser().trim();
    const ordenCompraId = Number(this.form.controls['ordenCompraId'].value);

    if (!currentUser) {
      this.saveErrorMessage = 'No se encontro el usuario actual de la sesion.';
      return null;
    }

    if (!Number.isInteger(ordenCompraId) || ordenCompraId <= 0) {
      this.saveErrorMessage = 'La orden de compra seleccionada no tiene un identificador valido.';
      return null;
    }

    const request: ActualizarOrdenCompraRequest = {
      Ord_Com_Id: ordenCompraId,
      ...payload,
      Ord_Com_Arc_Adj_Nom: this.getArchivoAdjuntoActual(),
      Ord_Com_Arc_Adj_Rut: this.ordenCompraArchivoRuta || undefined,
      Flg_Est: String(this.form.controls['estado'].value || 'A'),
      Usr_Mod: currentUser
    };

    console.log('Actualizar orden de compra - valores enviados:', {
      request,
      archivo: this.ordenCompraArchivoFile
        ? {
            name: this.ordenCompraArchivoFile.name,
            size: this.ordenCompraArchivoFile.size,
            type: this.ordenCompraArchivoFile.type
          }
        : null
    });

    return this.apiService.patchActualizarOrdenCompra(request, this.ordenCompraArchivoFile);
  }

  private buildOrdenCompraPayloadBase(): Omit<RegistrarOrdenCompraRequest, 'Usr_Reg'> | null {
    const proveedorId = Number(this.form.controls['proveedorId'].value);
    const pedidoIdAtencion = Number(this.form.controls['pedidoIdAtencion'].value);
    const proveedor = String(this.form.controls['proveedor'].value || '').trim();
    const formaPagoId = Number(this.form.controls['formaPagoId'].value);
    const formaPago = String(this.form.controls['formaPago'].value || '').trim();
    const referenciaObra = String(this.form.controls['referenciaObra'].value || '').trim();
    const referencia = String(this.form.controls['referencia'].value || '').trim();
    const observacion = String(this.form.controls['observacion'].value || '').trim();
    const subtotal = this.parseMontoControlValue(this.form.controls['subtotal'].value);
    const igv = this.parseMontoControlValue(this.form.controls['igv'].value);
    const total = this.parseMontoControlValue(this.form.controls['total'].value);
    const detraccionId = this.getDetraccionIdSeleccionada();
    const montoDetraccion = this.parseMontoControlValue(this.form.controls['montoDetraccion'].value);

    if (!proveedorId || !proveedor) {
      this.form.controls['proveedor'].markAsTouched();
      this.saveErrorMessage = 'Selecciona un proveedor antes de guardar.';
      return null;
    }

    if (!Number.isInteger(pedidoIdAtencion) || pedidoIdAtencion <= 0) {
      this.form.controls['pedidoIdAtencion'].markAsTouched();
      this.saveErrorMessage = 'Ingresa un numero de pedido valido antes de guardar.';
      return null;
    }

    if (!formaPagoId || !formaPago) {
      this.form.controls['formaPago'].markAsTouched();
      this.saveErrorMessage = 'Selecciona una forma de pago antes de guardar.';
      return null;
    }

    if (!this.detallesPedidoSeleccionados.length && !(this.isEditingOrdenCompra && this.detallesPendientesDesasignacion.length)) {
      this.saveErrorMessage = 'Selecciona al menos una fila del detalle para la orden de compra.';
      return null;
    }

    if (total <= 0) {
      this.saveErrorMessage = 'El total debe ser mayor a cero.';
      return null;
    }

    return {
      Ord_Com_Prv: proveedorId,
      Ord_Com_For_Pag: formaPagoId,
      Ord_Com_Ref_Obr: referenciaObra,
      Ord_Com_Obs: observacion,
      Ord_Com_Ref: referencia,
      Ord_Com_Sub_Tot: subtotal,
      Ord_Com_Igv: igv,
      Ord_Com_Tot: total,
      Ord_Com_Ped_Id: pedidoIdAtencion,
      Ord_Com_Det_Id: Number.isInteger(detraccionId) && detraccionId > 0 ? detraccionId : 0,
      Ord_Com_Det_Mon: montoDetraccion > 0 ? montoDetraccion : 0
    };
  }

  private sincronizarDetallePedidoSeleccionado(response: unknown): Observable<unknown> {
    if (!this.detallesPedidoSeleccionados.length && !this.detallesPendientesDesasignacion.length) {
      return of(response);
    }

    return this.resolveOrdenCompraIdParaAsignacion(response).pipe(
      switchMap((ordenCompraId) => {
        const currentUser = this.authService.getCurrentUser().trim();
        const detallesParaAsignar = this.isEditingOrdenCompra
          ? this.detallesPedidoSeleccionados.filter((item) => !this.isDetalleYaAsignadoAOrden(item, ordenCompraId))
          : this.detallesPedidoSeleccionados;
        const actualizarDetalleRequests = this.detallesPedidoSeleccionados.map((item) =>
          this.apiService.patchActualizarDetallePedido(
            this.buildActualizarDetallePedidoPayload(item, currentUser)
          ).pipe(
            switchMap((patchResponse: unknown) => {
              this.assertSuccessfulResponse(patchResponse, 'No se pudo actualizar el costo de un detalle del pedido.');
              return of(patchResponse);
            })
          )
        );
        const asignarRequests = detallesParaAsignar.map((item) =>
          this.apiService.patchAsignarOrdenCompraADetallePedido(
            this.buildAsignarOrdenCompraDetallePedidoPayload(item, ordenCompraId, currentUser)
          ).pipe(
            switchMap((patchResponse: unknown) => {
              this.assertSuccessfulResponse(patchResponse, 'No se pudo actualizar un detalle del pedido con la orden de compra.');
              return of(patchResponse);
            })
          )
        );

        const desAsignarRequests = this.detallesPendientesDesasignacion.map((item) =>
          this.apiService.patchDesAsignarOrdenCompraADetallePedido({
            Ord_Com_Id: ordenCompraId,
            Ped_Det_Id: item.id
          } as DesAsignarOrdenCompraDetallePedidoRequest).pipe(
            switchMap((patchResponse: unknown) => {
              this.assertSuccessfulResponse(patchResponse, 'No se pudo desasignar un detalle del pedido.');
              return of(patchResponse);
            })
          )
        );

        const requests = [...actualizarDetalleRequests, ...asignarRequests, ...desAsignarRequests];

        return requests.length ? forkJoin(requests) : of([]);
      }),
      switchMap(() => this.actualizarPedidoCuandoDetalleCompleto()),
      switchMap(() => this.recargarDetallePedidoDespuesDeGuardar())
    );
  }

  private actualizarPedidoCuandoDetalleCompleto(): Observable<unknown> {
    const pedidoId = Number(this.form.controls['pedidoIdAtencion'].value);

    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      return of(null);
    }

    return this.apiService.patchActualizarPedidoCuandoDetalleCompleto({ Ped_Id: pedidoId }).pipe(
      switchMap((response: unknown) => {
        this.assertSuccessfulResponse(response, 'No se pudo actualizar el estado del pedido.');
        return of(response);
      })
    );
  }

  private cargarOrdenesCompra(): void {
    this.isLoadingOrdenesCompra = true;
    this.errorMessage = '';

    this.apiService.getListarOrdenCompraActivo(this.getFiltros()).subscribe({
      next: (response: unknown) => {
        this.ordenesCompra = this.extractRecords(response)
          .map((item, index) => this.mapOrdenCompra(item, index))
          .filter((item): item is OrdenCompraRow => item !== null);
        this.currentOrdenesCompraPage = normalizePaginationPage(this.currentOrdenesCompraPage, this.ordenesCompra.length, this.pageSize);
        this.reconciliarEtiquetasCatalogo();
        this.isLoadingOrdenesCompra = false;
      },
      error: (error: unknown) => {
        this.ordenesCompra = [];
        this.currentOrdenesCompraPage = 1;
        this.isLoadingOrdenesCompra = false;
        this.errorMessage = this.resolveErrorMessage(error, 'No se pudieron cargar las ordenes de compra.');
      }
    });
  }

  private cargarProveedores(): void {
    this.isLoadingProveedores = true;

    this.apiService.getListarProveedorActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.proveedores = this.extractRecords(response)
          .map((item) => this.mapProveedor(item))
          .filter((provider) => provider.code > 0 && !!provider.name);
        this.reconciliarProveedorEditor();
        this.reconciliarEtiquetasCatalogo();
        this.isLoadingProveedores = false;
      },
      error: () => {
        this.proveedores = [];
        this.isLoadingProveedores = false;
      }
    });
  }

  private cargarFormasPago(): void {
    this.isLoadingFormasPago = true;

    this.apiService.getListarFormaPagoActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.formasPago = this.extractRecords(response)
          .map((item) => this.mapFormaPago(item))
          .filter((paymentOption) => paymentOption.code > 0 && !!paymentOption.description);
        this.reconciliarEtiquetasCatalogo();
        this.isLoadingFormasPago = false;
      },
      error: () => {
        this.formasPago = [];
        this.isLoadingFormasPago = false;
      }
    });
  }

  private cargarCentrosCosto(): void {
    this.isLoadingCentrosCosto = true;

    this.apiService.getListarCentroCostoActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.centrosCostoCatalogo = this.extractRecords(response)
          .map((item) => this.mapCentroCosto(item))
          .filter((centroCosto): centroCosto is OrdenCompraCentroCostoRow => centroCosto !== null);
        this.reconciliarDescripcionCentrosCosto();
        this.isLoadingCentrosCosto = false;
      },
      error: () => {
        this.centrosCostoCatalogo = [];
        this.centrosCosto = [];
        this.isLoadingCentrosCosto = false;
      }
    });
  }

  private cargarPedidosPendientes(): void {
    this.isLoadingOrdenesCompra = true;
    this.errorMessage = '';

    this.apiService.getListarPedidoAprobadoParaOC(this.getPedidoPendienteFiltros()).subscribe({
      next: (response: unknown) => {
        this.pedidosPendientes = this.extractRecords(response)
          .map((item, index) => this.mapPedidoPendiente(item, index))
          .filter((item): item is PedidoPendienteRow => item !== null);
        this.currentPedidosPendientesPage = normalizePaginationPage(
          this.currentPedidosPendientesPage,
          this.pedidosPendientes.length,
          this.pageSize
        );
        this.isLoadingOrdenesCompra = false;
      },
      error: (error: unknown) => {
        this.pedidosPendientes = [];
        this.currentPedidosPendientesPage = 1;
        this.isLoadingOrdenesCompra = false;
        this.errorMessage = this.resolveErrorMessage(error, 'No se pudieron cargar los pedidos pendientes.');
      }
    });
  }

  private cargarListadoSeleccionado(): void {
    if (this.isListadoGenerados) {
      this.pedidosPendientes = [];
      this.currentPedidosPendientesPage = 1;
      this.cargarOrdenesCompra();
      return;
    }

    this.ordenesCompra = [];
    this.currentOrdenesCompraPage = 1;
    this.cargarPedidosPendientes();
  }

  private getListadoModo(): OrdenCompraListadoModo {
    const value = String(this.filtersForm.controls['modoListado'].value || '').trim();
    return value === 'pendientes' ? 'pendientes' : 'generados';
  }

  private cargarDetracciones(): void {
    this.isLoadingDetracciones = true;

    this.apiService.getListarDetraccion({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.detracciones = this.extractRecords(response)
          .map((item) => this.mapDetraccionOption(item))
          .filter((item): item is DetraccionOption => item !== null)
          .sort((left, right) => left.descripcion.localeCompare(right.descripcion));
        this.isLoadingDetracciones = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando detracciones:', error);
        this.detracciones = [];
        this.isLoadingDetracciones = false;
      }
    });
  }

  private cargarOrdenCompraParaModificar(ordenCompra: OrdenCompraRow): void {
    this.apiService.getListarOrdenCompraModificar(ordenCompra.ordenCompraId ?? 0).subscribe({
      next: (response: unknown) => {
        const detalle = this.extractRecords(response)
          .map((item, index) => this.mapOrdenCompra(item, index))
          .find((item): item is OrdenCompraRow => item !== null) ?? ordenCompra;

        this.abrirEditorOrdenCompra(detalle);
      },
      error: () => {
        this.abrirEditorOrdenCompra(ordenCompra);
      }
    });
  }

  private abrirEditorOrdenCompra(ordenCompra: OrdenCompraRow): void {
    this.populateForm(ordenCompra);
    this.esParcial = false;
    this.aplicarModoCentrosCosto();
    this.mostrarEditor = true;

    if (ordenCompra.pedidoIdAtencion) {
      this.cargarCentrosCostoDesdePedido();
    }
  }

  private populateForm(item: OrdenCompraRow): void {
      this.form.patchValue({
        ordenCompraId: item.ordenCompraId,
        pedidoIdAtencion: item.pedidoIdAtencion,
        proveedorId: item.proveedorId,
        proveedor: item.proveedor,
        telefono: this.resolveProveedor(item.proveedorId)?.phone || '',
        direccion: this.resolveProveedor(item.proveedorId)?.address || '',
        contacto: this.resolveProveedor(item.proveedorId)?.contact || '',
        ruc: this.resolveProveedor(item.proveedorId)?.ruc || '',
        formaPagoId: item.formaPagoId,
        formaPago: item.formaPago,
        referenciaObra: item.referenciaObra,
      referencia: item.referencia,
      observacion: item.observacion,
      archivo: item.archivo || 'Sin archivo adjunto',
      detraccionId: item.detraccionId > 0 ? item.detraccionId : null,
      montoDetraccion: item.montoDetraccion,
      subtotal: item.subtotal,
      igv: item.igv,
      total: item.total,
      estado: item.estadoCodigo
    });
    this.ordenCompraArchivoAdjunto = item.archivo || 'Sin archivo adjunto';
    this.ordenCompraArchivoRuta = item.archivoRuta;
    this.ordenCompraArchivoFile = null;
  }

  private getOrdenCompraSeleccionada(): OrdenCompraRow | null {
    if (this.selectedOrdenCompraId === null) {
      return null;
    }

    return this.ordenesCompra.find((item) => item.id === this.selectedOrdenCompraId) ?? null;
  }

  private getArchivoAdjuntoActual(): string | undefined {
    const archivo = String(this.form.controls['archivo'].value || '').trim();
    return archivo && archivo !== 'Sin archivo adjunto' ? archivo : undefined;
  }

  private getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'txt':
        return 'text/plain';
      case 'sql':
        return 'text/plain';
      case 'csv':
        return 'text/csv';
      case 'gif':
        return 'image/gif';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }

  private getFiltros(): OrdenCompraFiltro {
    const ordenCompraId = Number(this.filtersForm.controls['ordenCompraId'].value);
    const proveedor = String(this.filtersForm.controls['proveedor'].value || '').trim();
    const estado = String(this.filtersForm.controls['estado'].value || '').trim();
    const filtros: OrdenCompraFiltro = {};

    if (Number.isInteger(ordenCompraId) && ordenCompraId > 0) {
      filtros.Ord_Com_Id = ordenCompraId;
    }

    if (proveedor) {
      filtros.Ord_Com_Prv = proveedor;
    }

    if (estado) {
      filtros.Flg_Est = estado;
    }

    return filtros;
  }

  private getPedidoPendienteFiltros(): PedidosFiltro {
    return { Flg_Est: 'A' };
  }

  private mapOrdenCompra(item: DataRecord, index: number): OrdenCompraRow | null {
    const ordenCompraId = this.getNumberValue(item, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId', 'id', 'Id']);
    const trackingId = ordenCompraId ?? -1 * (index + 1);

    const pedidoIdAtencion = this.getNumberValue(item, ['Ord_Com_Ped_Id', 'ord_Com_Ped_Id', 'ordComPedId']);
    const proveedorId = this.getNumberValue(item, ['Ord_Com_Prv', 'ord_Com_Prv', 'ordComPrv']) ?? 0;
    const formaPagoId = this.getNumberValue(item, ['Ord_Com_For_Pag', 'ord_Com_For_Pag', 'ordComForPag']) ?? 0;
    const estadoCodigo = this.getTextValue(item, ['Flg_Est', 'flg_Est', 'flgEst']);
    const proveedorFallback = this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom', 'Proveedor', 'proveedor']);
    const formaPagoFallback = this.getTextValue(item, ['For_Pag_Des', 'for_Pag_Des', 'forPagDes', 'FormaPago', 'formaPago']);

    if (!ordenCompraId && !proveedorFallback && !formaPagoFallback) {
      return null;
    }

    return {
      id: trackingId,
      ordenCompraId,
      pedidoIdAtencion,
      proveedorId,
      proveedor: this.resolveProveedorNombre(proveedorId, proveedorFallback),
      formaPagoId,
      formaPago: this.resolveFormaPagoDescripcion(formaPagoId, formaPagoFallback),
      referenciaObra: this.getTextValue(item, ['Ord_Com_Ref_Obr', 'ord_Com_Ref_Obr', 'ordComRefObr']),
      referencia: this.getTextValue(item, ['Ord_Com_Ref', 'ord_Com_Ref', 'ordComRef']),
      observacion: this.getTextValue(item, ['Ord_Com_Obs', 'ord_Com_Obs', 'ordComObs']),
      subtotal: this.getDecimalValue(item, ['Ord_Com_Sub_Tot', 'ord_Com_Sub_Tot', 'ordComSubTot']),
      igv: this.getDecimalValue(item, ['Ord_Com_Igv', 'ord_Com_Igv', 'ordComIgv']),
      total: this.getDecimalValue(item, ['Ord_Com_Tot', 'ord_Com_Tot', 'ordComTot']),
      detraccionId: this.getNumberValue(item, ['Ord_Com_Det_Id', 'ord_Com_Det_Id', 'ordComDetId']) ?? 0,
      montoDetraccion: this.getDecimalValue(item, ['Ord_Com_Det_Mon', 'ord_Com_Det_Mon', 'ordComDetMon']),
      archivo: this.getTextValue(item, [
        'Ord_Com_Arc_Adj_Nom',
        'ord_Com_Arc_Adj_Nom',
        'ord_com_arc_adj_nom',
        'ordComArcAdjNom',
        'OrdComArcAdjNom',
        'archivo',
        'Archivo'
      ]) || 'Sin archivo adjunto',
      archivoRuta: this.getTextValue(item, [
        'Ord_Com_Arc_Adj_Rut',
        'ord_Com_Arc_Adj_Rut',
        'ord_com_arc_adj_rut',
        'ordComArcAdjRut',
        'OrdComArcAdjRut',
        'archivoRuta',
        'ArchivoRuta'
      ]),
      estadoCodigo,
      estado: estadoCodigo ? this.mapEstadoDescripcion(estadoCodigo) : '-',
      canEdit: ordenCompraId !== null
    };
  }

  private mapProveedor(item: DataRecord): ProviderRecord {
    return {
      code: this.getNumberValue(item, ['Prv_Id', 'prv_Id', 'prvId', 'id', 'Id']) ?? 0,
      name: this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom']),
      phone: this.getTextValue(item, ['Prv_Tel', 'prv_Tel', 'prvTel']),
      address: this.getTextValue(item, ['Prv_Dir', 'prv_Dir', 'prvDir']),
      contact: this.getTextValue(item, ['Prv_Nom_Con', 'prv_Nom_Con', 'prvNomCon']),
      ruc: this.getTextValue(item, ['Prv_Ruc', 'prv_Ruc', 'prvRuc']),
      email: this.getTextValue(item, ['Prv_Email', 'prv_Email', 'prvEmail']),
      bankCode: this.getNumberValue(item, ['Prv_Ban', 'prv_Ban', 'prvBan']) ?? 0,
      bankName: '',
      bankAccountNumber: this.getTextValue(item, ['Prv_Nro_Cue_Ban', 'prv_Nro_Cue_Ban', 'prvNroCueBan']),
      bankCci: this.getTextValue(item, ['Prv_Nro_Cue_Ban_CCI', 'prv_Nro_Cue_Ban_CCI', 'prvNroCueBanCci'])
    };
  }

  private mapFormaPago(item: DataRecord): PaymentOption {
    return {
      code: this.getNumberValue(item, ['For_Pag_Id', 'for_Pag_Id', 'forPagId', 'id', 'Id']) ?? 0,
      description: this.getTextValue(item, ['For_Pag_Des', 'for_Pag_Des', 'forPagDes', 'description', 'Description'])
    };
  }

  private mapCentroCosto(item: DataRecord): OrdenCompraCentroCostoRow | null {
    const codigo = this.getNumberValue(item, ['Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId', 'id', 'Id']);

    if (!codigo) {
      return null;
    }

    const descripcion = this.getTextValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes', 'descripcion', 'Descripcion']);

    if (!descripcion) {
      return null;
    }

    return {
      id: codigo,
      codigo,
      descripcion,
      selected: false
    };
  }

  private mapCentroCostoPedido(response: unknown): OrdenCompraCentroCostoRow[] {
    const codigosRegistrados = new Set<number>();

    return this.extractRecords(response)
      .map((item) => {
        const codigoDesdeCatalogo = this.getNumberValue(item, ['Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId']);
        const codigoTexto = this.getTextValue(item, ['Ped_Cen_Cos', 'ped_Cen_Cos', 'pedCenCos']);
        const codigo = codigoDesdeCatalogo ?? Number(codigoTexto);

        if (!Number.isInteger(codigo) || codigo <= 0 || codigosRegistrados.has(codigo)) {
          return null;
        }

        codigosRegistrados.add(codigo);

        return {
          id: codigo,
          codigo,
          descripcion: this.resolveCentroCostoDescripcion(codigo),
          selected: false
        };
      })
      .filter((item): item is OrdenCompraCentroCostoRow => item !== null);
  }

  private mapDetallePedido(item: DataRecord): OrdenCompraDetallePedidoRow | null {
    const id = this.getNumberValue(item, ['Ped_Det_Id', 'ped_Det_Id', 'pedDetId', 'Id', 'id']);
    const itemCodigo = this.getTextValue(item, ['Ped_Cod_Itm', 'ped_Cod_Itm', 'pedCodItm']);
    const itemDescripcion = this.getTextValue(item, ['Itm_Des', 'itm_Des', 'itmDes', 'descripcionItem', 'DescripcionItem']);

    if (!id || !itemCodigo) {
      return null;
    }

    const unidadCodigo = this.getTextValue(item, ['Ped_Uni_Med', 'ped_Uni_Med', 'pedUniMed']) || '-';
    const unidadDescripcion = this.getTextValue(item, ['Uni_Med_Des', 'uni_Med_Des', 'uniMedDes']) || unidadCodigo;
    const centroCostoCodigo = this.getNumberValue(item, ['Ped_Cen_Cos_Asg', 'ped_Cen_Cos_Asg', 'pedCenCosAsg']);
    const centroCostoDescripcion = this.getTextValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes']) || '-';

    return {
      id,
      ordenCompraId: this.getNumberValue(item, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId']) ?? null,
      itemCodigo,
      itemDescripcion: itemDescripcion || itemCodigo,
      unidadCodigo,
      unidadDescripcion,
      centroCostoCodigo,
      centroCostoDescripcion,
      cantidad: this.getDecimalValue(item, ['Ped_Can', 'ped_Can', 'pedCan']),
      costoUnitario: this.getDecimalValue(item, ['Ped_Cos_Uni', 'ped_Cos_Uni', 'pedCosUni']),
      subtotal: this.getDecimalValue(item, ['Ped_Cos_Tot', 'ped_Cos_Tot', 'pedCosTot']),
      observacion: this.getTextValue(item, ['Ped_Obs', 'ped_Obs', 'pedObs', 'Observacion', 'observacion']),
      selected: false
    };
  }

  private loadPedidoData(pedidoId: number): Observable<{ centrosCostoResponse: unknown; detalleResponse: unknown }> {
    const ordenCompraId = Number(this.form.controls['ordenCompraId'].value);
    const detalleRequest = this.isEditingOrdenCompra && Number.isInteger(ordenCompraId) && ordenCompraId > 0
      ? this.apiService.getListarItemsAsignadosPedidoCentroCostoModificar(ordenCompraId, pedidoId)
      // En nuevo solo se listan items pendientes de asignar a una orden de compra.
      : this.apiService.getListarItemsAsignadosPedidoCentroCosto(pedidoId);

    return forkJoin({
      centrosCostoResponse: this.apiService.getListarPedidoRegistradoCentroCosto(pedidoId),
      detalleResponse: detalleRequest
    });
  }

  private applyPedidoDataResponse(centrosCostoResponse: unknown, detalleResponse: unknown): void {
    const centros = this.mapCentroCostoPedido(centrosCostoResponse);
    const seleccionarDetalles = this.debeSeleccionarDetallesAlCargar();

    this.centrosCosto = centros.map((item) => ({
      ...item,
      selected: false
    }));
    this.pedidoDetalles = this.extractRecords(detalleResponse)
      .map((item) => this.mapDetallePedido(item))
      .filter((item): item is OrdenCompraDetallePedidoRow => item !== null)
      .map((item) => ({
        ...item,
        selected: seleccionarDetalles
      }));
    this.currentDetallePedidoPage = normalizePaginationPage(this.currentDetallePedidoPage, this.pedidoDetalles.length, this.pageSize);
    this.centrosCostoErrorMessage = this.centrosCosto.length
      ? ''
      : 'El pedido ingresado no tiene centros de costo vinculados.';
    this.detallePedidoErrorMessage = this.pedidoDetalles.length
      ? ''
      : 'El pedido ingresado no tiene detalle registrado.';
    if (this.detallesPendientesDesasignacion.length) {
      this.detallePedidoErrorMessage = 'Hay detalles marcados para desasignacion. Los cambios se aplicaran al actualizar.';
    }
    this.syncTotalesCalculados();
    this.isLoadingPedidoCentrosCosto = false;
    this.isLoadingPedidoDetalle = false;
  }

  private debeSeleccionarDetallesAlCargar(): boolean {
    const ordenCompraId = Number(this.form.controls['ordenCompraId'].value);
    return this.isEditingOrdenCompra || (Number.isInteger(ordenCompraId) && ordenCompraId > 0);
  }

  private handlePedidoDataError(error: unknown): void {
    this.centrosCosto = [];
    this.pedidoDetalles = [];
    this.currentDetallePedidoPage = 1;
    this.centrosCostoErrorMessage = this.resolveErrorMessage(error, 'No se pudieron cargar los centros de costo del pedido.');
    this.detallePedidoErrorMessage = this.resolveErrorMessage(error, 'No se pudo cargar el detalle del pedido.');
    this.syncTotalesCalculados();
    this.isLoadingPedidoCentrosCosto = false;
    this.isLoadingPedidoDetalle = false;
  }

  private resolveOrdenCompraIdParaAsignacion(response: unknown): Observable<number> {
    const ordenCompraIdActual = Number(this.form.controls['ordenCompraId'].value);

    if (Number.isInteger(ordenCompraIdActual) && ordenCompraIdActual > 0) {
      return of(ordenCompraIdActual);
    }

    const ordenCompraIdResponse = this.extractOrdenCompraIdFromResponse(response);

    if (ordenCompraIdResponse) {
      this.form.patchValue({ ordenCompraId: ordenCompraIdResponse }, { emitEvent: false });
      return of(ordenCompraIdResponse);
    }

    return this.buscarOrdenCompraGuardadaRecientemente();
  }

  private buildAsignarOrdenCompraDetallePedidoPayload(
    item: OrdenCompraDetallePedidoRow,
    ordenCompraId: number,
    currentUser: string
  ): AsignarOrdenCompraDetallePedidoRequest {
    const observacion = String(item.observacion || '').trim();

    return {
      Ord_Com_Id: ordenCompraId,
      Ped_Det_Id: item.id,
      Ped_Cos_Uni: this.normalizeDecimal(item.costoUnitario),
      Ped_Obs: observacion || undefined,
      Usr_Mod: currentUser || undefined
    };
  }

  private buildActualizarDetallePedidoPayload(
    item: OrdenCompraDetallePedidoRow,
    currentUser: string
  ): ActualizarDetallePedidoRequest {
    const itemCodigo = Number(item.itemCodigo);
    const unidadCodigo = Number(item.unidadCodigo);
    const centroCostoCodigo = Number(item.centroCostoCodigo);

    return {
      Ped_Det_Id: item.id,
      Ped_Cod_Itm: Number.isInteger(itemCodigo) && itemCodigo > 0 ? itemCodigo : 0,
      Ped_Uni_Med: Number.isInteger(unidadCodigo) && unidadCodigo > 0 ? unidadCodigo : 0,
      Ped_Cen_Cos_Asg: Number.isInteger(centroCostoCodigo) && centroCostoCodigo > 0 ? centroCostoCodigo : 0,
      Ped_Can: this.normalizeDecimal(item.cantidad),
      Ped_Cos_Uni: this.normalizeDecimal(item.costoUnitario),
      Ped_Cos_Tot: this.normalizeDecimal(item.subtotal),
      Usr_Mod: currentUser,
      Ped_Obs_Ped: String(item.observacion || '').trim() || undefined
    };
  }

  private mapPedidoPendiente(item: DataRecord, index: number): PedidoPendienteRow | null {
    const pedidoId = this.getNumberValue(item, ['Ped_Id', 'ped_Id', 'pedId', 'id', 'Id']);
    const proveedor = this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom', 'Proveedor', 'proveedor']);
    const estadoCodigo = this.getTextValue(item, ['Flg_Est', 'flg_Est', 'flgEst']);

    if (!pedidoId && !proveedor) {
      return null;
    }

    return {
      id: pedidoId ?? -1 * (index + 1),
      pedidoId: pedidoId ?? 0,
      proveedor: proveedor || '-',
      tipoServicio: this.getTextValue(item, ['Tip_Ser_Des', 'tip_Ser_Des', 'tipSerDes', 'Ped_Tip_Com_Des', 'ped_Tip_Com_Des']) || '-',
      referencia: this.getTextValue(item, ['Ped_Ref', 'ped_Ref', 'pedRef', 'Referencia', 'referencia']) || '-',
      moneda: this.getTextValue(item, ['Mon_Des', 'mon_Des', 'monDes', 'Mon_Abr', 'mon_Abr', 'monAbr']) || '-',
      total: this.getDecimalValue(item, ['Ped_Can_Tot', 'ped_Can_Tot', 'pedCanTot', 'Total', 'total']),
      estadoCodigo,
      estado: estadoCodigo ? this.mapPedidoEstadoDescripcion(estadoCodigo) : '-'
    };
  }

  private isDetalleYaAsignadoAOrden(item: OrdenCompraDetallePedidoRow, ordenCompraId: number): boolean {
    return item.ordenCompraId === ordenCompraId;
  }

  private recargarDetallePedidoDespuesDeGuardar(): Observable<unknown> {
    const pedidoId = Number(this.form.controls['pedidoIdAtencion'].value);

    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      return of(null);
    }

    this.isLoadingPedidoCentrosCosto = true;
    this.isLoadingPedidoDetalle = true;

    return new Observable<unknown>((subscriber) => {
      this.loadPedidoData(pedidoId).subscribe({
        next: ({ centrosCostoResponse, detalleResponse }) => {
          this.applyPedidoDataResponse(centrosCostoResponse, detalleResponse);
          subscriber.next(null);
          subscriber.complete();
        },
        error: (error: unknown) => {
          this.handlePedidoDataError(error);
          subscriber.error(error);
        }
      });
    });
  }

  private extractOrdenCompraIdFromResponse(response: unknown): number | null {
    if (typeof response === 'number' && Number.isInteger(response) && response > 0) {
      return response;
    }

    if (!this.isDataRecord(response)) {
      return null;
    }

    const directId = this.getNumberValue(response, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId', 'Id', 'id']);

    if (directId) {
      return directId;
    }

    const dataAsId = this.getNumberValue(response, ['data', 'Data']);

    if (dataAsId) {
      return dataAsId;
    }

    const nestedKeys = ['ordenCompra', 'OrdenCompra', 'data', 'Data', 'result', 'Result', 'element', 'Element'];

    for (const key of nestedKeys) {
      const nestedValue = response[key];

      if (Array.isArray(nestedValue)) {
        for (const item of nestedValue) {
          if (!this.isDataRecord(item)) {
            continue;
          }

          const nestedId = this.getNumberValue(item, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId', 'Id', 'id']);

          if (nestedId) {
            return nestedId;
          }
        }
      }

      if (!this.isDataRecord(nestedValue)) {
        continue;
      }

      const nestedId = this.getNumberValue(nestedValue, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId', 'Id', 'id']);

      if (nestedId) {
        return nestedId;
      }
    }

    return null;
  }

  private buscarOrdenCompraGuardadaRecientemente(): Observable<number> {
    const pedidoIdAtencion = Number(this.form.controls['pedidoIdAtencion'].value);
    const proveedorId = Number(this.form.controls['proveedorId'].value);
    const formaPagoId = Number(this.form.controls['formaPagoId'].value);
    const referenciaObra = String(this.form.controls['referenciaObra'].value || '').trim();
    const referencia = String(this.form.controls['referencia'].value || '').trim();
    const observacion = String(this.form.controls['observacion'].value || '').trim();
    const subtotal = this.parseMontoControlValue(this.form.controls['subtotal'].value);
    const igv = this.parseMontoControlValue(this.form.controls['igv'].value);
    const total = this.parseMontoControlValue(this.form.controls['total'].value);

    return new Observable<number>((subscriber) => {
      this.apiService.getListarOrdenCompraActivo({ Flg_Est: 'A' }).subscribe({
        next: (response: unknown) => {
          const matches = this.extractRecords(response)
            .map((item, index) => this.mapOrdenCompra(item, index))
            .filter((item): item is OrdenCompraRow => item !== null)
            .filter((item) =>
              item.ordenCompraId !== null &&
              item.pedidoIdAtencion === pedidoIdAtencion &&
              item.proveedorId === proveedorId &&
              item.formaPagoId === formaPagoId &&
              item.referenciaObra === referenciaObra &&
              item.referencia === referencia &&
              item.observacion === observacion &&
              item.subtotal === subtotal &&
              item.igv === igv &&
              item.total === total
            )
            .sort((a, b) => (b.ordenCompraId ?? 0) - (a.ordenCompraId ?? 0));

          const ordenCompraId = matches[0]?.ordenCompraId ?? null;

          if (!ordenCompraId) {
            subscriber.error(new Error('Se guardo la orden, pero no se pudo identificar el Ord_Com_Id para actualizar el detalle.'));
            return;
          }

          this.form.patchValue({ ordenCompraId: ordenCompraId }, { emitEvent: false });
          subscriber.next(ordenCompraId);
          subscriber.complete();
        },
        error: (error: unknown) => subscriber.error(error)
      });
    });
  }

  private syncTotalesCalculados(): void {
    this.form.patchValue({
      subtotal: this.subtotalCalculado,
      igv: this.igvCalculado,
      montoDetraccion: this.montoDetraccionCalculado,
      total: this.totalCalculado
    }, { emitEvent: false });
  }

  private mapDetraccionOption(item: DataRecord): DetraccionOption | null {
    const id = this.getNumberValue(item, ['Det_Id', 'det_Id', 'detId', 'id', 'Id']);
    const descripcion = this.getTextValue(item, ['Det_Des', 'det_Des', 'detDes', 'descripcion', 'Descripcion']);
    const porcentaje = this.getDecimalValue(item, ['Det_Por', 'det_Por', 'detPor', 'porcentaje', 'Porcentaje']);

    if (!id || !descripcion) {
      return null;
    }

    return {
      id,
      descripcion,
      porcentaje,
      label: `${descripcion} - ${porcentaje.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
    };
  }

  private parseMontoControlValue(value: unknown): number {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return 0;
    }

    const normalized = raw.replace(/,/g, '');
    const parsed = Number(normalized);

    return this.normalizeDecimal(parsed);
  }

  private sanitizeDecimalInput(value: string): string {
    const sanitized = String(value || '')
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1');
    const [integerPart, decimalPart] = sanitized.split('.');

    if (decimalPart === undefined) {
      return integerPart;
    }

    return `${integerPart}.${decimalPart.slice(0, 2)}`;
  }

  private reconciliarDescripcionCentrosCosto(): void {
    if (!this.centrosCosto.length) {
      return;
    }

    this.centrosCosto = this.centrosCosto.map((item) => ({
      ...item,
      descripcion: this.resolveCentroCostoDescripcion(item.codigo)
    }));
  }

  private resolveCentroCostoDescripcion(codigo: number): string {
    return this.centrosCostoCatalogo.find((item) => item.codigo === codigo)?.descripcion || `Centro de costo ${codigo}`;
  }

  private reconciliarEtiquetasCatalogo(): void {
    if (!this.ordenesCompra.length) {
      return;
    }

    this.ordenesCompra = this.ordenesCompra.map((item) => ({
      ...item,
      proveedor: this.resolveProveedorNombre(item.proveedorId, item.proveedor),
      formaPago: this.resolveFormaPagoDescripcion(item.formaPagoId, item.formaPago)
    }));
  }

  private resolveProveedorNombre(proveedorId: number, fallback: string): string {
    return this.proveedores.find((item) => item.code === proveedorId)?.name || fallback || (proveedorId ? String(proveedorId) : '-');
  }

  private resolveProveedor(proveedorId: number): ProviderRecord | null {
    return this.proveedores.find((item) => item.code === proveedorId) ?? null;
  }

  private reconciliarProveedorEditor(): void {
    const proveedorId = Number(this.form.controls['proveedorId'].value);
    const proveedor = this.resolveProveedor(proveedorId);

    if (!proveedor) {
      return;
    }

    this.form.patchValue({
      proveedor: proveedor.name,
      telefono: proveedor.phone,
      direccion: proveedor.address,
      contacto: proveedor.contact,
      ruc: proveedor.ruc
    }, { emitEvent: false });
  }

  private resolveFormaPagoDescripcion(formaPagoId: number, fallback: string): string {
    return this.formasPago.find((item) => item.code === formaPagoId)?.description || fallback || (formaPagoId ? String(formaPagoId) : '-');
  }

  private mapEstadoDescripcion(value: string): string {
    return this.estadoOptions.find((item) => item.codigo === value)?.descripcion || value || '-';
  }

  private mapPedidoEstadoDescripcion(value: string): string {
    switch (value) {
      case 'P':
        return 'Pendiente';
      case 'A':
        return 'Aprobado';
      case 'C':
        return 'Cancelado';
      default:
        return value || '-';
    }
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((value): value is DataRecord => this.isDataRecord(value));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = [
      'ordenesCompra',
      'OrdenesCompra',
      'centrosCosto',
      'CentrosCosto',
      'elements',
      'Elements',
      'data',
      'Data',
      'result',
      'Result'
    ];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is DataRecord => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private assertSuccessfulResponse(response: unknown, fallbackMessage: string): void {
    if (!this.isDataRecord(response)) {
      return;
    }

    if (response['success'] === false || response['Success'] === false) {
      const message = this.getTextValue(response, ['message', 'Message']) || fallbackMessage;
      throw new Error(message);
    }

    const codeResult = this.getNumberValue(response, ['codeResult', 'CodeResult']);

    if (codeResult !== null && codeResult >= 400) {
      const message = this.getTextValue(response, ['message', 'Message']) || fallbackMessage;
      throw new Error(message);
    }
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

      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private getDecimalValue(item: DataRecord, keys: string[]): number {
    for (const key of keys) {
      const value = Number(item[key]);

      if (Number.isFinite(value)) {
        return this.normalizeDecimal(value);
      }
    }

    return 0;
  }

  private isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeDecimal(value: unknown): number {
    const decimal = Number(value);

    if (!Number.isFinite(decimal) || decimal < 0) {
      return 0;
    }

    return Math.round(decimal * 100) / 100;
  }

  private resolveErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error.trim();
      }

      if (this.isDataRecord(error.error)) {
        const message = this.getTextValue(error.error, ['message', 'Message']);

        if (message) {
          return message;
        }
      }
    }

    return fallbackMessage;
  }
}
