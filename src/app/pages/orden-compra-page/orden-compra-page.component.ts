import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import {
  ActualizarOrdenCompraRequest,
  ApiService,
  OrdenCompraFiltro,
  RegistrarOrdenCompraRequest
} from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { PaymentSelectorDialogComponent } from 'src/app/features/provider-form/dialogs/payment-selector-dialog.component';
import { ProviderSelectorDialogComponent } from 'src/app/features/provider-form/dialogs/provider-selector-dialog.component';
import { PaymentOption, ProviderRecord } from 'src/app/features/provider-form/provider-form.models';
import { DEFAULT_GRID_PAGE_SIZE, normalizePaginationPage, paginateItems } from 'src/app/shared/utils/pagination.utils';
import { noWhitespaceValidator } from 'src/app/shared/validators/form-validators';

import { OrdenCompraParcialDialogComponent } from './orden-compra-parcial-dialog.component';

type DataRecord = Record<string, unknown>;

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
  estadoCodigo: string;
  estado: string;
  canEdit: boolean;
}

interface OrdenCompraCentroCostoRow {
  id: number;
  codigo: number;
  descripcion: string;
  selected: boolean;
}

interface OrdenCompraDetallePedidoRow {
  id: number;
  itemCodigo: string;
  unidadCodigo: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  selected: boolean;
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
  readonly actionButtons = ['Nuevo', 'Modificar', 'Cerrar'];

  ordenesCompra: OrdenCompraRow[] = [];
  proveedores: ProviderRecord[] = [];
  formasPago: PaymentOption[] = [];
  centrosCostoCatalogo: OrdenCompraCentroCostoRow[] = [];
  centrosCosto: OrdenCompraCentroCostoRow[] = [];
  pedidoDetalles: OrdenCompraDetallePedidoRow[] = [];
  currentOrdenesCompraPage = 1;
  currentDetallePedidoPage = 1;

  selectedOrdenCompraId: number | null = null;
  mostrarEditor = false;
  isEditingOrdenCompra = false;
  isLoadingOrdenesCompra = false;
  isLoadingProveedores = false;
  isLoadingFormasPago = false;
  isLoadingCentrosCosto = false;
  isLoadingPedidoCentrosCosto = false;
  isLoadingPedidoDetalle = false;
  isSavingOrdenCompra = false;
  esParcial = false;
  errorMessage = '';
  saveErrorMessage = '';
  centrosCostoErrorMessage = '';
  detallePedidoErrorMessage = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.filtersForm = this.formBuilder.group({
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
      referenciaObra: ['', [Validators.required, noWhitespaceValidator()]],
      referencia: ['', [Validators.required, noWhitespaceValidator()]],
      observacion: ['', [Validators.required, noWhitespaceValidator()]],
      subtotal: [0, Validators.min(0)],
      igv: [0, Validators.min(0)],
      estado: ['A', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarProveedores();
    this.cargarFormasPago();
    this.cargarCentrosCosto();
    this.cargarOrdenesCompra();
    this.resetEditor();
  }

  get proveedorButtonLabel(): string {
    return this.form.controls['proveedor'].value?.trim() || 'Seleccionar proveedor';
  }

  get canModifySelectedOrdenCompra(): boolean {
    return !!this.getOrdenCompraSeleccionada()?.canEdit;
  }

  get formaPagoButtonLabel(): string {
    return this.form.controls['formaPago'].value?.trim() || 'Seleccionar forma de pago';
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
    return this.normalizeDecimal(this.subtotalCalculado + this.igvCalculado);
  }

  get centrosCostoSeleccionados(): OrdenCompraCentroCostoRow[] {
    return this.centrosCosto.filter((item) => item.selected);
  }

  get estanTodosLosCentrosSeleccionados(): boolean {
    return !!this.centrosCosto.length && this.centrosCosto.every((item) => item.selected);
  }

  get detallesPedidoSeleccionados(): OrdenCompraDetallePedidoRow[] {
    return this.pedidoDetalles.filter((item) => item.selected);
  }

  get paginatedOrdenesCompra(): OrdenCompraRow[] {
    return paginateItems(this.ordenesCompra, this.currentOrdenesCompraPage, this.pageSize);
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
    this.cargarOrdenesCompra();
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      ordenCompraId: '',
      proveedor: '',
      estado: 'A'
    });
    this.cargarOrdenesCompra();
  }

  ejecutarAccion(action: string): void {
    if (action === 'Nuevo') {
      this.iniciarNuevaOrdenCompra();
      return;
    }

    if (action === 'Modificar') {
      this.iniciarEdicionOrdenCompra();
      return;
    }

    this.cerrarVistaActual();
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

  onDetallePedidoPageChange(page: number): void {
    this.currentDetallePedidoPage = normalizePaginationPage(page, this.pedidoDetalles.length, this.pageSize);
  }

  openProveedorDialog(): void {
    if (this.isLoadingProveedores || !this.proveedores.length) {
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

  openFormaPagoDialog(): void {
    if (this.isLoadingFormasPago || !this.formasPago.length) {
      return;
    }

    const dialogRef = this.dialog.open(PaymentSelectorDialogComponent, {
      autoFocus: false,
      width: '34rem',
      data: {
        paymentOptions: this.formasPago
      }
    });

    dialogRef.afterClosed().subscribe((paymentOption?: PaymentOption) => {
      if (!paymentOption) {
        return;
      }

      this.form.patchValue({
        formaPagoId: paymentOption.code,
        formaPago: paymentOption.description
      });
    });
  }

  toggleCentroCosto(item: OrdenCompraCentroCostoRow): void {
    if (!this.esParcial) {
      return;
    }

    this.centrosCosto = this.centrosCosto.map((centroCosto) =>
      centroCosto.id === item.id
        ? { ...centroCosto, selected: !centroCosto.selected }
        : centroCosto
    );
  }

  toggleTodosLosCentrosCosto(): void {
    if (!this.esParcial || !this.centrosCosto.length) {
      return;
    }

    const shouldSelect = !this.estanTodosLosCentrosSeleccionados;

    this.centrosCosto = this.centrosCosto.map((item) => ({
      ...item,
      selected: shouldSelect
    }));
  }

  toggleDetallePedido(item: OrdenCompraDetallePedidoRow): void {
    if (!this.esParcial) {
      return;
    }

    this.pedidoDetalles = this.pedidoDetalles.map((detalle) =>
      detalle.id === item.id
        ? { ...detalle, selected: !detalle.selected }
        : detalle
    );
    this.syncTotalesCalculados();
  }

  toggleTodosLosDetallesPedido(): void {
    if (!this.esParcial || !this.pedidoDetalles.length) {
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

    forkJoin({
      centrosCostoResponse: this.apiService.getListarPedidoRegistradoCentroCosto(pedidoId),
      detalleResponse: this.apiService.getListarDetallePedido(pedidoId)
    }).subscribe({
      next: ({ centrosCostoResponse, detalleResponse }) => {
        const centros = this.mapCentroCostoPedido(centrosCostoResponse);

        this.centrosCosto = centros.map((item) => ({
          ...item,
          selected: this.esParcial ? false : true
        }));
        this.pedidoDetalles = this.extractRecords(detalleResponse)
          .map((item) => this.mapDetallePedido(item))
          .filter((item): item is OrdenCompraDetallePedidoRow => item !== null);
        this.currentDetallePedidoPage = normalizePaginationPage(this.currentDetallePedidoPage, this.pedidoDetalles.length, this.pageSize);
        this.centrosCostoErrorMessage = this.centrosCosto.length
          ? ''
          : 'El pedido ingresado no tiene centros de costo vinculados.';
        this.detallePedidoErrorMessage = this.pedidoDetalles.length
          ? ''
          : 'El pedido ingresado no tiene detalle registrado.';
        this.syncTotalesCalculados();
        this.isLoadingPedidoCentrosCosto = false;
        this.isLoadingPedidoDetalle = false;
      },
      error: (error: unknown) => {
        this.centrosCosto = [];
        this.pedidoDetalles = [];
        this.currentDetallePedidoPage = 1;
        this.centrosCostoErrorMessage = this.resolveErrorMessage(error, 'No se pudieron cargar los centros de costo del pedido.');
        this.detallePedidoErrorMessage = this.resolveErrorMessage(error, 'No se pudo cargar el detalle del pedido.');
        this.syncTotalesCalculados();
        this.isLoadingPedidoCentrosCosto = false;
        this.isLoadingPedidoDetalle = false;
      }
    });
  }

  guardarOrdenCompra(): void {
    this.saveErrorMessage = '';

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
        return this.sincronizarCentrosCostoPlaceholder();
      })
    ).subscribe({
      next: () => {
        this.isSavingOrdenCompra = false;
        this.cerrarEditor();
        this.cargarOrdenesCompra();
      },
      error: (error: unknown) => {
        this.isSavingOrdenCompra = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo guardar la orden de compra.');
      }
    });
  }

  cancelarEdicion(): void {
    this.cerrarEditor();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private iniciarNuevaOrdenCompra(): void {
    this.openParcialDialog((esParcial) => {
      this.isEditingOrdenCompra = false;
      this.resetEditor();
      this.esParcial = esParcial;
      this.aplicarModoCentrosCosto(esParcial);
      this.mostrarEditor = true;
    });
  }

  private iniciarEdicionOrdenCompra(): void {
    const ordenCompra = this.getOrdenCompraSeleccionada();

    if (!ordenCompra || !ordenCompra.canEdit || ordenCompra.ordenCompraId === null) {
      this.errorMessage = 'La orden listada no incluye identificador de O/C para modificarla.';
      return;
    }

    this.isEditingOrdenCompra = true;
    this.errorMessage = '';
    this.populateForm(ordenCompra);
    this.esParcial = false;
    this.aplicarModoCentrosCosto(false);
    this.mostrarEditor = true;

    if (ordenCompra.pedidoIdAtencion) {
      this.cargarCentrosCostoDesdePedido();
    }
  }

  private openParcialDialog(onConfirm: (esParcial: boolean) => void): void {
    const dialogRef = this.dialog.open(OrdenCompraParcialDialogComponent, {
      autoFocus: false,
      width: '28rem'
    });

    dialogRef.afterClosed().subscribe((esParcial?: boolean) => {
      if (typeof esParcial === 'boolean') {
        onConfirm(esParcial);
      }
    });
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
      subtotal: 0,
      igv: 0,
      estado: 'A'
    });
    this.esParcial = false;
    this.centrosCosto = [];
    this.pedidoDetalles = [];
    this.centrosCostoErrorMessage = '';
    this.detallePedidoErrorMessage = '';
    this.syncTotalesCalculados();
  }

  private aplicarModoCentrosCosto(esParcial: boolean): void {
    this.centrosCosto = this.centrosCosto.map((item) => ({
      ...item,
      selected: esParcial ? false : true
    }));
    this.pedidoDetalles = this.pedidoDetalles.map((item) => ({
      ...item,
      selected: esParcial ? false : true
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

    return this.apiService.postRegistrarOrdenCompra(request);
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
      Flg_Est: String(this.form.controls['estado'].value || 'A'),
      Usr_Mod: currentUser
    };

    return this.apiService.patchActualizarOrdenCompra(request);
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
    const subtotal = this.subtotalCalculado;
    const igv = this.igvCalculado;
    const total = this.totalCalculado;

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

    if (!referenciaObra) {
      this.form.controls['referenciaObra'].markAsTouched();
      this.saveErrorMessage = 'Ingresa una referencia de obra valida.';
      return null;
    }

    if (!referencia) {
      this.form.controls['referencia'].markAsTouched();
      this.saveErrorMessage = 'Ingresa una referencia valida.';
      return null;
    }

    if (!observacion) {
      this.form.controls['observacion'].markAsTouched();
      this.saveErrorMessage = 'Ingresa una observacion valida.';
      return null;
    }

    if (!this.centrosCosto.length) {
      this.saveErrorMessage = 'No hay centros de costo disponibles para esta orden de compra.';
      return null;
    }

    if (!this.centrosCostoSeleccionados.length) {
      this.saveErrorMessage = this.esParcial
        ? 'Selecciona al menos un centro de costo para una orden parcial.'
        : 'No hay centros de costo seleccionados para la orden de compra.';
      return null;
    }

    if (!this.detallesPedidoSeleccionados.length) {
      this.saveErrorMessage = this.esParcial
        ? 'Selecciona al menos una fila del detalle para la orden parcial.'
        : 'No hay filas del detalle seleccionadas para la orden de compra.';
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
      Ord_Com_Ped_Id: pedidoIdAtencion
    };
  }

  private sincronizarCentrosCostoPlaceholder(): Observable<unknown> {
    if (!this.centrosCostoSeleccionados.length) {
      return of(null);
    }

    return this.apiService.simularPatchOrdenCompraCentroCosto();
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
      subtotal: item.subtotal,
      igv: item.igv,
      estado: item.estadoCodigo
    });
  }

  private getOrdenCompraSeleccionada(): OrdenCompraRow | null {
    if (this.selectedOrdenCompraId === null) {
      return null;
    }

    return this.ordenesCompra.find((item) => item.id === this.selectedOrdenCompraId) ?? null;
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

    if (!id || !itemCodigo) {
      return null;
    }

    return {
      id,
      itemCodigo,
      unidadCodigo: this.getTextValue(item, ['Ped_Uni_Med', 'ped_Uni_Med', 'pedUniMed']) || '-',
      cantidad: this.getDecimalValue(item, ['Ped_Can', 'ped_Can', 'pedCan']),
      costoUnitario: this.getDecimalValue(item, ['Ped_Cos_Uni', 'ped_Cos_Uni', 'pedCosUni']),
      subtotal: this.getDecimalValue(item, ['Ped_Cos_Tot', 'ped_Cos_Tot', 'pedCosTot']),
      selected: !this.esParcial
    };
  }

  private syncTotalesCalculados(): void {
    this.form.patchValue({
      subtotal: this.subtotalCalculado,
      igv: this.igvCalculado
    }, { emitEvent: false });
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
