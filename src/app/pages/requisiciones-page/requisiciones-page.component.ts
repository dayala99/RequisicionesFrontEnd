import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, from, of } from 'rxjs';
import { concatMap, map, switchMap, toArray } from 'rxjs/operators';

import { ActualizarPedidoRequest, ApiService, CatalogoNumeroOption, CatalogoTextoOption, PedidosFiltro, RegistrarCentroCostoPedidoRequest, RegistrarPedidoRequest } from 'src/app/Services/api.services';
import { ProviderFormComponent } from 'src/app/features/provider-form/provider-form.component';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ApprovalUserOption, ApprovalUserSelectorDialogComponent } from './approval-user-selector-dialog.component';
import { CentroCostoOption, CentroCostoSelectorDialogComponent } from './centro-costo-selector-dialog.component';
import { PedidoCancelDialogComponent } from './pedido-cancel-dialog.component';

type DataRecord = Record<string, unknown>;

type ProviderFormData = {
  supplierCode: number;
  supplierName: string;
  phone: string;
  address: string;
  contact: string;
  ruc: string;
  paymentCode: number;
  paymentDescription: string;
  isEventual: boolean;
};

interface RequisitionRow {
  requisicion: number;
  codigo: string;
  archivo: string;
  gerencia: string;
  fecha: string;
  proveedor: string;
  moneda: string;
  total: number;
  estado: string;
  codigoUsr: string;
  usrAprobacion: string;
  fechaUsrGa: string;
  gn: string;
  tipo: string;
}

interface CentroCostoRow {
  id: number;
  codigo: number;
  costo: string;
  cantidad: number;
  persistedId: number | null;
}
@Component({
  selector: 'app-requisiciones-page',
  templateUrl: './requisiciones-page.component.html',
  styleUrls: ['./requisiciones-page.component.scss']
})
export class RequisicionesPageComponent implements OnInit {
  @ViewChild('providerFormRef')
  set providerFormComponent(value: ProviderFormComponent | undefined) {
    this._providerFormComponent = value;

    if (value && this.pendingProviderFormData) {
      value.hydrateForm(this.pendingProviderFormData);
      this.pendingProviderFormData = null;
    }
  }

  get providerFormComponent(): ProviderFormComponent | undefined {
    return this._providerFormComponent;
  }

  readonly filtersForm: FormGroup;
  readonly cabeceraForm: FormGroup;
  readonly centroCostoForm: FormGroup;
  readonly detalleForm: FormGroup;
  readonly estadoOptions = ['Todos', 'Pendiente', 'Aprobado', 'Observado', 'Cerrado'];
  readonly gnOptions = ['Todos', 'GN', 'GA', 'GC'];
  readonly tipoOptions = ['Todos', 'Con O/C', 'Sin O/C'];
  readonly actionButtons = ['Nuevo', 'Modificar', 'Eliminar', 'Duplicar', 'Imprimir', 'Aprobar', 'Cerrar'];
  readonly tipoCompraOptions = ['Sin enlazar', 'Local', 'Importacion'];
  readonly tipoOc: CatalogoTextoOption[] = [
    { codigo: 'CO', descripcion: 'Con O/C' },
    { codigo: 'SO', descripcion: 'Sin O/C' }
  ];
  readonly tipoMoneda: CatalogoNumeroOption[] = [
    { codigo: 1, descripcion: 'PEN' },
    { codigo: 2, descripcion: 'USD' }
  ];
  readonly pedidoEstadosConsulta = ['A', 'P', 'O', 'C'];

  requisiciones: RequisitionRow[] = [];
  centrosCosto: CentroCostoRow[] = [];
  editandoCentroCostoId: number | null = null;
  editandoCentroCostoCantidad = 0;
  archivoAdjunto = 'Sin archivo adjunto';
  mostrarEditorPedido = false;
  isLoadingPedidos = false;
  isLoadingApprovalUsers = false;
  isLoadingCentrosCosto = false;
  errorMessage = '';
  isLoadingCorrelativo = false;
  isSavingPedido = false;
  approvalUsers: ApprovalUserOption[] = [];
  centroCostoOptions: CentroCostoOption[] = [];
  saveErrorMessage = '';
  selectedPedidoId: number | null = null;
  isEditingPedido = false;
  isLoadingPedidoDetalle = false;

  private nextCentroCostoId = 1;
  private _providerFormComponent?: ProviderFormComponent;
  private pendingProviderFormData: ProviderFormData | null = null;
  private deletedCentroCostoIds: number[] = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.filtersForm = this.formBuilder.group({
      nroRequisicion: [''],
      proveedor: [''],
      estado: ['Aprobado'],
      gn: ['Todos'],
      tipo: ['Todos']
    });

    this.cabeceraForm = this.formBuilder.group({
      requisicionCompra: [null],
      usuarioAprobacionId: [0],
      usuarioAprobacion: ['']
    });

    this.centroCostoForm = this.formBuilder.group({
      centroCostoId: [0],
      centroCosto: ['']
    });

    this.detalleForm = this.formBuilder.group({
      lugarEntrega: ['Los Rosales 555 Santa Anita'],
      referencia: ['Compra de materiales para mantenimiento preventivo'],
      tipoCompra: ['Sin enlazar'],
      ocImportacion: ['0'],
      oc: [''],
      moneda: [null],
      fechaEntrega: ['04-30-2026'],
      sustento: ['Detalle preliminar de distribucion por centros de costo.'],
      archivo: ['Sin archivo adjunto']
    });
  }

  ngOnInit(): void {
    this.cargarUsuariosAprobacion();
    this.cargarCentrosCosto();
    this.cargarPedidos();
    this.resetPedidoEditor();
    this.mostrarEditorPedido = false;
  }

  get totalPorcentaje(): number {
    return this.centrosCosto.reduce((accumulator, item) => accumulator + item.cantidad, 0);
  }

  get approvalUserButtonLabel(): string {
    return this.cabeceraForm.controls['usuarioAprobacion'].value?.trim() || 'Seleccionar';
  }

  get centroCostoButtonLabel(): string {
    return this.centroCostoForm.controls['centroCosto'].value?.trim() || '+ Clic para seleccionar centro de costo';
  }

  get canModifyPedido(): boolean {
    return this.selectedPedidoId !== null && !this.isLoadingPedidoDetalle;
  }

  aplicarFiltros(): void {
    this.cargarPedidos();
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      nroRequisicion: '',
      proveedor: '',
      estado: 'Aprobado',
      gn: 'Todos',
      tipo: 'Todos'
    });
    this.cargarPedidos();
  }

  formatTotal(total: number, moneda: string): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(total) + ` ${moneda}`;
  }

  ejecutarAccion(action: string): void {
    if (action === 'Nuevo') {
      this.iniciarNuevoPedido();
      return;
    }

    if (action === 'Modificar') {
      this.modificarPedidoSeleccionado();
      return;
    }

    if (action === 'Cerrar') {
      this.cerrarEditorPedido();
    }
  }

  isActionDisabled(action: string): boolean {
    if (action === 'Modificar') {
      return !this.canModifyPedido;
    }

    return false;
  }

  iniciarNuevoPedido(): void {
    this.resetPedidoEditor();
    this.isEditingPedido = false;
    this.mostrarEditorPedido = true;
    this.cargarCorrelativoNuevo();
  }

  seleccionarPedido(item: RequisitionRow): void {
    this.selectedPedidoId = item.requisicion;
  }

  isPedidoSeleccionado(item: RequisitionRow): boolean {
    return this.selectedPedidoId === item.requisicion;
  }

  modificarPedidoSeleccionado(): void {
    if (this.selectedPedidoId === null || this.isLoadingPedidoDetalle) {
      return;
    }

    this.resetPedidoEditor();
    this.mostrarEditorPedido = true;
    this.isEditingPedido = true;
    this.isLoadingPedidoDetalle = true;
    this.saveErrorMessage = '';

    forkJoin({
      pedidoResponse: this.apiService.getListarPedidoModificar(this.selectedPedidoId),
      centroCostoResponse: this.apiService.getListarPedidoRegistradoCentroCosto(this.selectedPedidoId)
    }).subscribe({
      next: ({ pedidoResponse, centroCostoResponse }) => {
        const pedido = this.extractRecords(pedidoResponse)[0];

        if (!pedido) {
          this.saveErrorMessage = 'No se encontro informacion del pedido seleccionado.';
          this.isLoadingPedidoDetalle = false;
          return;
        }

        this.populatePedidoEditor(pedido);
        this.populateCentroCostoEditor(centroCostoResponse);
        this.isLoadingPedidoDetalle = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando pedido para modificar:', error);
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo cargar la informacion del pedido seleccionado.');
        this.isLoadingPedidoDetalle = false;
      }
    });
  }

  openApprovalUserDialog(): void {
    if (!this.approvalUsers.length) {
      return;
    }

    const dialogRef = this.dialog.open(ApprovalUserSelectorDialogComponent, {
      autoFocus: false,
      width: '36rem',
      data: {
        users: this.approvalUsers
      }
    });

    dialogRef.afterClosed().subscribe((selectedUser?: ApprovalUserOption) => {
      if (selectedUser) {
        this.cabeceraForm.patchValue({
          usuarioAprobacionId: selectedUser.id,
          usuarioAprobacion: selectedUser.code
        });
      }
    });
  }

  openCentroCostoDialog(): void {
    if (!this.centroCostoOptions.length) {
      return;
    }

    const dialogRef = this.dialog.open(CentroCostoSelectorDialogComponent, {
      autoFocus: false,
      width: '38rem',
      data: {
        centrosCosto: this.centroCostoOptions
      }
    });

    dialogRef.afterClosed().subscribe((selectedCentroCosto?: CentroCostoOption) => {
      if (selectedCentroCosto) {
        this.applySelectedCentroCosto(selectedCentroCosto);
      }
    });
  }

  confirmarCancelacionPedido(): void {
    const dialogRef = this.dialog.open(PedidoCancelDialogComponent, {
      width: 'min(30rem, 92vw)',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.cerrarEditorPedido();
      }
    });
  }

  cerrarEditorPedido(): void {
    this.resetPedidoEditor();
    this.mostrarEditorPedido = false;
    this.editandoCentroCostoId = null;
    this.isEditingPedido = false;
    this.isLoadingPedidoDetalle = false;
  }

  guardarPedido(): void {
    if (this.isSavingPedido) {
      return;
    }

    if (this.editandoCentroCostoId !== null) {
      this.guardarCantidadCentroCosto(this.editandoCentroCostoId);
    }

    if (this.isEditingPedido) {
      const payload = this.buildActualizarPedidoPayload();

      if (!payload) {
        return;
      }

      this.isSavingPedido = true;
      this.saveErrorMessage = '';
      console.debug('Ped_Can_Tot actualizar:', payload.Ped_Can_Tot);

      this.apiService.patchActualizarPedido(payload).pipe(
        switchMap((response: unknown) => {
          this.assertSuccessfulResponse(response, 'No se pudo actualizar el pedido.');
          return this.sincronizarCentrosCostoPedido(payload.Ped_Id);
        })
      ).subscribe({
        next: () => {
          this.isSavingPedido = false;
          this.cerrarEditorPedido();
          this.cargarPedidos();
        },
        error: (error: unknown) => {
          console.error('Error guardando pedido:', error);
          this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo actualizar el pedido. Intenta nuevamente.');
          this.isSavingPedido = false;
        }
      });

      return;
    }

    const payload = this.buildRegistrarPedidoPayload();

    if (!payload) {
      return;
    }

    this.isSavingPedido = true;
    this.saveErrorMessage = '';
    console.debug('Ped_Can_Tot registrar:', payload.Ped_Can_Tot);

    this.apiService.postRegistrarPedido(payload).pipe(
      switchMap((response: unknown) => {
        this.assertSuccessfulResponse(response, 'No se pudo registrar el pedido.');
        return this.registrarCentrosCostoPedido(payload.Ped_Id);
      })
    ).subscribe({
      next: () => {
        this.isSavingPedido = false;
        this.cerrarEditorPedido();
        this.cargarPedidos();
      },
      error: (error: unknown) => {
        console.error('Error guardando pedido:', error);
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo registrar el pedido. Intenta nuevamente.');
        this.isSavingPedido = false;
      }
    });
  }

  agregarCentroCosto(centroCosto: CentroCostoOption): void {
    const yaExiste = this.centrosCosto.some((item) => item.codigo === centroCosto.id);

    if (yaExiste) {
      this.centroCostoForm.patchValue({
        centroCostoId: 0,
        centroCosto: ''
      });
      return;
    }

    this.centrosCosto = [
      {
        id: this.nextCentroCostoId++,
        codigo: centroCosto.id,
        costo: centroCosto.descripcion,
        cantidad: 0,
        persistedId: null
      },
      ...this.centrosCosto
    ];
    this.centroCostoForm.patchValue({
      centroCostoId: 0,
      centroCosto: ''
    });
  }

  editarCentroCosto(item: CentroCostoRow): void {
    this.editandoCentroCostoId = item.id;
    this.editandoCentroCostoCantidad = item.cantidad;
  }

  onCantidadCentroCostoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cantidad = Number(input.value);

    this.editandoCentroCostoCantidad = this.normalizeCantidadCentroCosto(cantidad);
  }

  guardarCantidadCentroCosto(id: number): void {
    this.centrosCosto = this.centrosCosto.map((item) =>
      item.id === id
        ? {
            ...item,
            cantidad: this.normalizeCantidadCentroCosto(this.editandoCentroCostoCantidad)
          }
        : item
    );

    this.cancelarEdicionCentroCosto();
  }

  eliminarCentroCosto(id: number): void {
    const persistedId = this.centrosCosto.find((item) => item.id === id)?.persistedId;
    this.centrosCosto = this.centrosCosto.filter((item) => item.id !== id);

    if (persistedId) {
      this.deletedCentroCostoIds = [...this.deletedCentroCostoIds, persistedId];
    }

    if (this.editandoCentroCostoId === id) {
      this.cancelarEdicionCentroCosto();
    }
  }

  cancelarEdicionCentroCosto(): void {
    this.editandoCentroCostoId = null;
    this.editandoCentroCostoCantidad = 0;
  }

  adjuntarArchivo(): void {
    this.archivoAdjunto = 'sustento-pedido.pdf';
    this.detalleForm.patchValue({
      archivo: this.archivoAdjunto
    });
  }

  quitarArchivo(): void {
    this.archivoAdjunto = 'Sin archivo adjunto';
    this.detalleForm.patchValue({
      archivo: this.archivoAdjunto
    });
  }

  verArchivo(): void {
    this.archivoAdjunto = this.detalleForm.controls['archivo'].value || 'Sin archivo adjunto';
  }

  trackByRequisicion(_index: number, item: RequisitionRow): number {
    return item.requisicion;
  }

  trackByCentroCosto(_index: number, item: CentroCostoRow): number {
    return item.id;
  }

  private cargarPedidos(): void {
    this.isLoadingPedidos = true;
    this.errorMessage = '';
    this.requisiciones = [];

    this.buildPedidosRequest(this.getFiltros()).subscribe({
      next: (response: unknown) => {
        this.requisiciones = this.extractRecords(response)
          .map((item) => this.mapPedido(item))
          .filter((item) => item.requisicion > 0)
          .sort((left, right) => right.requisicion - left.requisicion);
        this.selectedPedidoId = this.requisiciones.some((item) => item.requisicion === this.selectedPedidoId)
          ? this.selectedPedidoId
          : null;
        this.isLoadingPedidos = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando pedidos:', error);
        this.requisiciones = [];
        this.errorMessage = 'No se pudo cargar la informacion de pedidos. Intenta nuevamente.';
        this.isLoadingPedidos = false;
      }
    });
  }

  private buildPedidosRequest(filtros: PedidosFiltro): Observable<unknown> {
    if (filtros.Flg_Est) {
      return this.apiService.getListarPedido(filtros);
    }

    return forkJoin(
      this.pedidoEstadosConsulta.map((estado) => this.apiService.getListarPedido({ ...filtros, Flg_Est: estado }))
    ).pipe(
      map((responses: unknown[]) => responses.reduce<DataRecord[]>(
        (records, response) => records.concat(this.extractRecords(response)),
        []
      ))
    );
  }

  private cargarUsuariosAprobacion(): void {
    this.isLoadingApprovalUsers = true;

    this.apiService.getListarUsuarioActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.approvalUsers = this.extractRecords(response)
          .map((item) => this.mapApprovalUser(item))
          .filter((user) => user.id > 0 && !!user.code);
        this.isLoadingApprovalUsers = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando usuarios de aprobacion:', error);
        this.approvalUsers = [];
        this.isLoadingApprovalUsers = false;
      }
    });
  }

  private cargarCentrosCosto(): void {
    this.isLoadingCentrosCosto = true;

    this.apiService.getListarCentroCostoActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.centroCostoOptions = this.extractRecords(response)
          .map((item) => this.mapCentroCostoOption(item))
          .filter((item) => item.id > 0 && !!item.descripcion);
        this.isLoadingCentrosCosto = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando centros de costo:', error);
        this.centroCostoOptions = [];
        this.isLoadingCentrosCosto = false;
      }
    });
  }

  private applySelectedCentroCosto(centroCosto: CentroCostoOption): void {
    this.centroCostoForm.patchValue({
      centroCostoId: centroCosto.id,
      centroCosto: centroCosto.descripcion
    });
    this.agregarCentroCosto(centroCosto);
  }

  private buildRegistrarPedidoPayload(): RegistrarPedidoRequest | null {
    const payloadBase = this.buildPedidoPayloadBase();
    const usuarioRegistro = this.authService.getCurrentUser().trim();

    if (!payloadBase) {
      return null;
    }

    if (!usuarioRegistro) {
      this.saveErrorMessage = 'No se encontro el usuario actual de la sesion.';
      return null;
    }

    return {
      ...payloadBase,
      Usr_Reg: usuarioRegistro
    };
  }

  private buildActualizarPedidoPayload(): ActualizarPedidoRequest | null {
    const payloadBase = this.buildPedidoPayloadBase();
    const usuarioModificacion = this.authService.getCurrentUser().trim();

    if (!payloadBase) {
      return null;
    }

    if (!usuarioModificacion) {
      this.saveErrorMessage = 'No se encontro el usuario actual de la sesion.';
      return null;
    }

    return {
      ...payloadBase,
      Usr_Mod: usuarioModificacion
    };
  }

  private buildPedidoPayloadBase(): Omit<RegistrarPedidoRequest, 'Usr_Reg'> | null {
    const providerFormData = this.getProviderFormData();
    const requisicionCompra = Number(this.cabeceraForm.controls['requisicionCompra'].value);
    const usuarioAprobacion = String(this.cabeceraForm.controls['usuarioAprobacion'].value || '').trim();
    const lugarEntrega = String(this.detalleForm.controls['lugarEntrega'].value || '').trim();
    const referencia = String(this.detalleForm.controls['referencia'].value || '').trim();
    const tipoOc = String(this.detalleForm.controls['oc'].value || '').trim();
    const moneda = Number(this.detalleForm.controls['moneda'].value);
    const fechaEntrega = this.normalizePedidoFechaEntrega(String(this.detalleForm.controls['fechaEntrega'].value || '').trim());
    const sustento = String(this.detalleForm.controls['sustento'].value || '').trim();
    const attachmentName = this.archivoAdjunto !== 'Sin archivo adjunto' ? this.archivoAdjunto : '';
    const cantidadTotal = this.getTotalCantidadCentroCosto();

    if (!providerFormData) {
      this.saveErrorMessage = 'No se pudo leer la informacion del proveedor. Vuelve a abrir el formulario.';
      return null;
    }

    if (!Number.isInteger(requisicionCompra) || requisicionCompra <= 0) {
      this.saveErrorMessage = 'La requisicion de compra aun no tiene un correlativo valido.';
      return null;
    }

    if (providerFormData.isEventual) {
      this.saveErrorMessage = 'El modo eventual aun no se puede guardar porque el endpoint requiere un proveedor registrado.';
      return null;
    }

    if (!providerFormData.supplierCode) {
      this.saveErrorMessage = 'Selecciona un proveedor antes de guardar.';
      return null;
    }

    if (!providerFormData.paymentCode) {
      this.saveErrorMessage = 'Selecciona una forma de pago antes de guardar.';
      return null;
    }

    if (!usuarioAprobacion) {
      this.saveErrorMessage = 'Selecciona un usuario de aprobacion antes de guardar.';
      return null;
    }

    if (!tipoOc) {
      this.saveErrorMessage = 'Selecciona una opcion de O/C antes de guardar.';
      return null;
    }

    if (!Number.isInteger(moneda) || moneda <= 0) {
      this.saveErrorMessage = 'Selecciona una moneda antes de guardar.';
      return null;
    }

    if (!fechaEntrega) {
      this.saveErrorMessage = 'Ingresa una fecha de entrega valida antes de guardar.';
      return null;
    }

    return {
      Ped_Id: requisicionCompra,
      Ped_Usr_Apr: usuarioAprobacion,
      Ped_Lug_Ent: lugarEntrega,
      Ped_Ref: referencia,
      Ped_Tip_Com: tipoOc,
      Ped_Tip_Mon: moneda,
      Ped_Fec_Ent: fechaEntrega,
      Ped_Sus: sustento,
      Ped_Arc_Adj_Nom: attachmentName,
      Ped_Arc_Adj_Rut: '',
      Ped_Prv_Cod: providerFormData.supplierCode,
      Ped_For_Pag_Cod: providerFormData.paymentCode,
      Ped_Can_Tot: cantidadTotal
    };
  }

  private registrarCentrosCostoPedido(pedId: number): Observable<unknown> {
    if (!this.centrosCosto.length) {
      return of(null);
    }

    return from(this.centrosCosto).pipe(
      concatMap((item) => this.apiService.postRegistrarCentroCostoPedidoRegistrado(this.buildRegistrarCentroCostoPayload(pedId, item)).pipe(
        switchMap((response: unknown) => {
          this.assertSuccessfulResponse(response, `No se pudo registrar el centro de costo ${item.codigo}.`);
          return of(response);
        })
      )),
      toArray()
    );
  }

  private buildRegistrarCentroCostoPayload(pedId: number, item: CentroCostoRow): RegistrarCentroCostoPedidoRequest {
    return {
      Ped_Id: pedId,
      Ped_Cen_Cos: String(item.codigo),
      Ped_Can: this.normalizeCantidadCentroCosto(item.cantidad)
    };
  }

  private sincronizarCentrosCostoPedido(pedId: number): Observable<unknown> {
    return this.eliminarCentrosCostoPendientes().pipe(
      switchMap(() => this.registrarCentrosCostoPedido(pedId))
    );
  }

  private eliminarCentrosCostoPendientes(): Observable<unknown> {
    if (!this.deletedCentroCostoIds.length) {
      return of(null);
    }

    const ids = [...this.deletedCentroCostoIds];
    this.deletedCentroCostoIds = [];

    return from(ids).pipe(
      concatMap((id) => this.apiService.deleteEliminarCentroCostoPedidoRegistrado({ Ped_Cen_Cos_Id: id }).pipe(
        switchMap((response: unknown) => {
          this.assertSuccessfulResponse(response, `No se pudo eliminar el centro de costo ${id}.`);
          return of(response);
        })
      )),
      toArray()
    );
  }

  private normalizeCantidadCentroCosto(cantidad: number): number {
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      return 0;
    }

    return Math.round(cantidad * 1000) / 1000;
  }

  private getTotalCantidadCentroCosto(): number {
    return this.normalizeCantidadCentroCosto(
      this.centrosCosto.reduce((total, item) => total + this.normalizeCantidadCentroCosto(item.cantidad), 0)
    );
  }

  private getProviderFormData(): ProviderFormData | null {
    const providerFormData = this.providerFormComponent?.form?.getRawValue?.() ?? this.providerFormComponent?.getFormData?.();

    if (!providerFormData) {
      return null;
    }

    return providerFormData as ProviderFormData;
  }

  private normalizePedidoFechaEntrega(value: string): string {
    if (!value) {
      return '';
    }

    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);

    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}T00:00:00`;
    }

    const separatedMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);

    if (separatedMatch) {
      return `${separatedMatch[3]}-${separatedMatch[1].padStart(2, '0')}-${separatedMatch[2].padStart(2, '0')}T00:00:00`;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${parsedDate.getFullYear()}-${month}-${day}T00:00:00`;
  }

  private getFiltros(): PedidosFiltro {
    const filters = this.filtersForm.getRawValue() as {
      nroRequisicion: string;
      proveedor: string;
      estado: string;
      gn: string;
      tipo: string;
    };
    const requisicionBuscada = Number(filters.nroRequisicion);
    const filtros: PedidosFiltro = {};

    if (filters.nroRequisicion && Number.isInteger(requisicionBuscada) && requisicionBuscada > 0) {
      filtros.Ped_Id = requisicionBuscada;
    }

    if (filters.proveedor?.trim()) {
      filtros.Prv_Nom = filters.proveedor.trim();
    }

    const estado = this.mapEstadoFilter(filters.estado);

    if (estado) {
      filtros.Flg_Est = estado;
    }

    const tipo = this.mapTipoFilter(filters.tipo);

    if (tipo) {
      filtros.Ped_Tip_Com = tipo;
    }

    return filtros;
  }

  private cargarCorrelativoNuevo(): void {
    this.isLoadingCorrelativo = true;
    this.cabeceraForm.patchValue({
      requisicionCompra: null
    });

    this.apiService.getListarPedidoCorrelativoNuevo().subscribe({
      next: (response: unknown) => {
        const correlativo = this.extractRecords(response)
          .map((item) => this.getNumberValue(item, ['Ped_Id', 'ped_Id', 'pedId', 'requisicion', 'Requisicion']))
          .find((value): value is number => value !== null);

        this.cabeceraForm.patchValue({
          requisicionCompra: correlativo ?? null
        });
        this.isLoadingCorrelativo = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando correlativo de pedido:', error);
        this.cabeceraForm.patchValue({
          requisicionCompra: null
        });
        this.isLoadingCorrelativo = false;
      }
    });
  }

  private mapEstadoFilter(estado: string): string {
    switch (estado) {
      case 'Pendiente':
        return 'P';
      case 'Aprobado':
        return 'A';
      case 'Observado':
        return 'O';
      case 'Cerrado':
        return 'C';
      default:
        return '';
    }
  }

  private mapTipoFilter(tipo: string): string {
    switch (tipo) {
      case 'Con O/C':
        return 'CO';
      case 'Sin O/C':
        return 'SO';
      default:
        return '';
    }
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((value): value is DataRecord => this.isDataRecord(value));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = ['pedidos', 'Pedidos', 'usuarios', 'Usuarios', 'users', 'Users', 'centrosCosto', 'CentrosCosto', 'elements', 'Elements', 'data', 'Data', 'result', 'Result'];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is DataRecord => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private mapPedido(item: DataRecord): RequisitionRow {
    const requisicion = this.getNumberValue(item, ['Ped_Id', 'ped_Id', 'pedId', 'requisicion', 'Requisicion']) ?? 0;
    const archivoNombre = this.getTextValue(item, ['Ped_Arc_Adj_Nom', 'ped_Arc_Adj_Nom', 'pedArcAdjNom', 'archivo', 'Archivo']);
    const fechaRegistro = this.formatDateValue(this.getTextValue(item, ['Fec_Reg', 'fec_Reg', 'fecReg', 'Fecha', 'fecha']));
    const fechaAprobacion = this.formatDateValue(this.getTextValue(item, ['Fec_Mod', 'fec_Mod', 'fecMod', 'Fec_Reg', 'fecReg', 'FechaUsrGa', 'fechaUsrGa']));
    const proveedor = this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom', 'proveedor', 'Proveedor']) || '-';
    const moneda = this.resolveCurrency(item);
    const total = this.getDecimalValue(item, ['Ped_Tot', 'ped_Tot', 'pedTot', 'total', 'Total']) ?? 0;
    const estado = this.resolveStatus(item);
    const tipo = this.resolveTipo(item);

    return {
      requisicion,
      codigo: this.getTextValue(item, ['Ped_Cod', 'ped_Cod', 'pedCod', 'codigo', 'Codigo']) || (requisicion > 0 ? `REQ-${requisicion}` : '-'),
      archivo: this.resolveAttachmentLabel(archivoNombre),
      gerencia: this.getTextValue(item, ['Gerencia', 'gerencia', 'Are_Des', 'are_Des', 'area']) || '-',
      fecha: fechaRegistro || '-',
      proveedor,
      moneda,
      total,
      estado,
      codigoUsr: this.getTextValue(item, ['Usr_Reg', 'usr_Reg', 'usrReg', 'Usr_Cod', 'usrCod']) || '-',
      usrAprobacion: this.getTextValue(item, ['Ped_Usr_Apr', 'ped_Usr_Apr', 'pedUsrApr', 'Usr_Apr', 'usrApr']) || '-',
      fechaUsrGa: fechaAprobacion || '-',
      gn: this.getTextValue(item, ['Gn', 'gn', 'Ped_Gn', 'ped_Gn']) || '-',
      tipo
    };
  }

  private resolveAttachmentLabel(archivoNombre: string): string {
    if (!archivoNombre) {
      return '-';
    }

    const extension = archivoNombre.split('.').pop()?.trim().toUpperCase();

    return extension || 'ADJ';
  }

  private resolveCurrency(item: DataRecord): string {
    const currencyText = this.getTextValue(item, ['Ped_Tip_Mon_Des', 'ped_Tip_Mon_Des', 'pedTipMonDes', 'Moneda', 'moneda']);

    if (currencyText) {
      return currencyText.toUpperCase();
    }

    const currencyCode = this.getNumberValue(item, ['Ped_Tip_Mon', 'ped_Tip_Mon', 'pedTipMon']);

    switch (currencyCode) {
      case 1:
        return 'PEN';
      case 2:
        return 'USD';
      default:
        return '-';
    }
  }

  private resolveStatus(item: DataRecord): string {
    const statusText = this.getTextValue(item, ['Ped_Est_Des', 'ped_Est_Des', 'pedEstDes', 'Estado', 'estado']);

    if (statusText) {
      return this.toTitleCase(statusText);
    }

    const statusFlag = this.getTextValue(item, ['Flg_Est', 'flg_Est', 'flgEst']).toUpperCase();

    switch (statusFlag) {
      case 'A':
        return 'Aprobado';
      case 'P':
        return 'Pendiente';
      case 'O':
        return 'Observado';
      case 'C':
        return 'Cerrado';
      default:
        return '-';
    }
  }

  private resolveTipo(item: DataRecord): string {
    const tipoText = this.getTextValue(item, ['Ped_Tip_Com_Des', 'ped_Tip_Com_Des', 'pedTipComDes']);

    if (tipoText) {
      return tipoText;
    }

    const tipoCode = this.getTextValue(item, ['Ped_Tip_Com', 'ped_Tip_Com', 'pedTipCom']).toUpperCase();

    switch (tipoCode) {
      case 'CO':
        return 'Con O/C';
      case 'SO':
        return 'Sin O/C';
      default:
        return '-';
    }
  }

  private mapApprovalUser(item: DataRecord): ApprovalUserOption {
    return {
      id: this.getNumberValue(item, ['Usr_Id', 'usr_Id', 'usrId', 'id', 'Id']) ?? 0,
      code: this.getTextValue(item, ['Usr_Cod', 'usr_Cod', 'usrCod']),
      name: this.getTextValue(item, ['Usr_Nom', 'usr_Nom', 'usrNom'])
    };
  }

  private mapCentroCostoOption(item: DataRecord): CentroCostoOption {
    return {
      id: this.getNumberValue(item, ['Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId', 'id', 'Id']) ?? 0,
      descripcion: this.getTextValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes', 'descripcion', 'Descripcion'])
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

      if (Number.isInteger(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private getDecimalValue(item: DataRecord, keys: string[]): number | null {
    for (const key of keys) {
      const value = Number(item[key]);

      if (!Number.isNaN(value)) {
        return value;
      }
    }

    return null;
  }

  private formatDateValue(value: string): string {
    if (!value) {
      return '';
    }

    const datePart = value.trim().split('T')[0].split(' ')[0];
    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(datePart);

    if (isoMatch) {
      return `${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}-${isoMatch[1]}`;
    }

    const separatedMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(datePart);

    if (separatedMatch) {
      return `${separatedMatch[1].padStart(2, '0')}-${separatedMatch[2].padStart(2, '0')}-${separatedMatch[3]}`;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${month}-${day}-${parsedDate.getFullYear()}`;
  }

  private toTitleCase(value: string): string {
    const normalized = value.trim().toLowerCase();

    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '-';
  }

  private isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private assertSuccessfulResponse(response: unknown, fallbackMessage: string): void {
    if (!this.isDataRecord(response)) {
      return;
    }

    if (response['Success'] === false || response['success'] === false) {
      throw new Error(this.extractResponseMessage(response) || fallbackMessage);
    }
  }

  private extractResponseMessage(response: DataRecord): string {
    const message = response['Message'] ?? response['message'];
    return typeof message === 'string' ? message.trim() : '';
  }

  private resolveErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      if (this.isDataRecord(body)) {
        const message = this.extractResponseMessage(body);

        if (message) {
          return message;
        }
      }

      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
    }

    return fallbackMessage;
  }

  private resetPedidoEditor(): void {
    this.cabeceraForm.reset({
      requisicionCompra: null,
      usuarioAprobacionId: 0,
      usuarioAprobacion: ''
    });
    this.centroCostoForm.reset({
      centroCostoId: 0,
      centroCosto: ''
    });
    this.nextCentroCostoId = 1;
    this.detalleForm.reset({
      lugarEntrega: 'Los Rosales 555 Santa Anita',
      referencia: 'Compra de materiales para mantenimiento preventivo',
      tipoCompra: 'Sin enlazar',
      ocImportacion: '0',
      oc: '',
      moneda: null,
      fechaEntrega: '04-30-2026',
      sustento: 'Detalle preliminar de distribucion por centros de costo.',
      archivo: 'Sin archivo adjunto'
    });
    this.centrosCosto = [];
    this.editandoCentroCostoCantidad = 0;
    this.archivoAdjunto = 'Sin archivo adjunto';
    this.saveErrorMessage = '';
    this.isSavingPedido = false;
    this.isLoadingPedidoDetalle = false;
    this.deletedCentroCostoIds = [];
    this.pendingProviderFormData = null;
    this.providerFormComponent?.resetForm();
  }

  private populatePedidoEditor(item: DataRecord): void {
    const pedId = this.getNumberValue(item, ['Ped_Id', 'ped_Id', 'pedId', 'requisicion', 'Requisicion']);
    const approvalCode = this.getTextValue(item, ['Ped_Usr_Apr', 'ped_Usr_Apr', 'pedUsrApr', 'Usr_Apr', 'usrApr']);
    const approvalUser = this.approvalUsers.find((user) => user.code === approvalCode);
    const supplierCode = this.getNumberValue(item, ['Ped_Prv_Cod', 'ped_Prv_Cod', 'pedPrvCod']) ?? 0;
    const paymentCode = this.getNumberValue(item, ['Ped_For_Pag_Cod', 'ped_For_Pag_Cod', 'pedForPagCod']) ?? 0;
    const selectedRow = this.requisiciones.find((row) => row.requisicion === pedId);

    this.cabeceraForm.patchValue({
      requisicionCompra: pedId ?? null,
      usuarioAprobacionId: approvalUser?.id ?? 0,
      usuarioAprobacion: approvalCode
    });

    this.detalleForm.patchValue({
      lugarEntrega: this.getTextValue(item, ['Ped_Lug_Ent', 'ped_Lug_Ent', 'pedLugEnt']),
      referencia: this.getTextValue(item, ['Ped_Ref', 'ped_Ref', 'pedRef']),
      tipoCompra: 'Sin enlazar',
      ocImportacion: '0',
      oc: this.getTextValue(item, ['Ped_Tip_Com', 'ped_Tip_Com', 'pedTipCom']),
      moneda: this.getNumberValue(item, ['Ped_Tip_Mon', 'ped_Tip_Mon', 'pedTipMon']),
      fechaEntrega: this.formatDateValue(this.getTextValue(item, ['Ped_Fec_Ent', 'ped_Fec_Ent', 'pedFecEnt'])),
      sustento: this.getTextValue(item, ['Ped_Sus', 'ped_Sus', 'pedSus']),
      archivo: this.getTextValue(item, ['Ped_Arc_Adj_Nom', 'ped_Arc_Adj_Nom', 'pedArcAdjNom']) || 'Sin archivo adjunto'
    });

    this.archivoAdjunto = String(this.detalleForm.controls['archivo'].value || 'Sin archivo adjunto');

    const providerFormData: ProviderFormData = {
      supplierCode,
      supplierName: selectedRow?.proveedor || '',
      phone: '',
      address: '',
      contact: '',
      ruc: '',
      paymentCode,
      paymentDescription: '',
      isEventual: false
    };

    if (this.providerFormComponent) {
      this.providerFormComponent.hydrateForm(providerFormData);
      this.pendingProviderFormData = null;
      return;
    }

    this.pendingProviderFormData = providerFormData;
  }

  private populateCentroCostoEditor(response: unknown): void {
    const centros = this.extractRecords(response)
      .map((item) => this.mapCentroCostoRegistrado(item))
      .filter((item): item is CentroCostoRow => item !== null);

    this.centrosCosto = centros;
    this.nextCentroCostoId = centros.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
  }

  private mapCentroCostoRegistrado(item: DataRecord): CentroCostoRow | null {
    const id = this.getNumberValue(item, ['Ped_Cen_Cos_Id', 'ped_Cen_Cos_Id', 'pedCenCosId']);
    const codigoTexto = this.getTextValue(item, ['Ped_Cen_Cos', 'ped_Cen_Cos', 'pedCenCos']);
    const codigo = Number(codigoTexto);

    if (!id || !Number.isInteger(codigo) || codigo <= 0) {
      return null;
    }

    const centroCosto = this.centroCostoOptions.find((option) => option.id === codigo);

    return {
      id: this.nextCentroCostoId++,
      codigo,
      costo: centroCosto?.descripcion || `Centro de costo ${codigo}`,
      cantidad: this.getDecimalValue(item, ['Ped_Can', 'ped_Can', 'pedCan']) ?? 0,
      persistedId: id
    };
  }
}
