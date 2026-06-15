import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { catchError, forkJoin, of } from 'rxjs';

import {
  AlmacenFiltro,
  ActualizarPedidoDetalleIngresoAlmacenRequest,
  ActualizarIngresoAlmacenDetalleRequest,
  ActualizarIngresoAlmacenRequest,
  ApiService,
  CambiarEstadoOrdenCompraRequest,
  CatalogoNumeroOption,
  CatalogoTextoOption,
  RegistrarIngresoAlmacenOrdenCompraRequest,
  RegistrarIngresoAlmacenDetalleRequest,
  RegistrarIngresoAlmacenRequest
} from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ProviderRecord } from 'src/app/features/provider-form/provider-form.models';
import { DEFAULT_GRID_PAGE_SIZE, normalizePaginationPage, paginateItems } from 'src/app/shared/utils/pagination.utils';
import { formatDateRequestValue, formatDisplayDate } from 'src/app/shared/utils/date.utils';
import { PedidoDetalleItemSelectorDialogComponent } from '../requisiciones-page/pedido-detalle-item-selector-dialog.component';
import { PedidoDetalleUnidadSelectorDialogComponent } from '../requisiciones-page/pedido-detalle-unidad-selector-dialog.component';
import { PedidoDetalleItemOption, PedidoDetalleUnidadOption } from '../requisiciones-page/pedido-detalle-dialog.models';

type DataRecord = Record<string, unknown>;

interface AlmacenRow {
  id: number;
  movimientoId: number;
  tipoIngresoId: number;
  tipoIngreso: string;
  ordenCompraId: number;
  pedidoId: number;
  ubicacionId: number;
  centroCostoId: number;
  centroCosto: string;
  solicitanteDocumento: string;
  almacen: string;
  fechaRegistro: string;
  registradoPor: string;
  estadoAprobacion: string;
}

interface OrdenCompraPendienteAlmacenRow {
  id: number;
  ordenCompraId: number;
  pedidoId: number;
  numeroOrden: string;
  pedidoCodigo: string;
  tipo: string;
  fecha: string;
  proveedorId: number;
  proveedor: string;
  proveedorRuc: string;
  formaPago: string;
  refObra: string;
  referencia: string;
  total: number;
  estado: string;
}

interface IngresoOrdenDetalleRow {
  id: number;
  pedidoDetalleId: number;
  itemId: number;
  itemCodigo: string;
  itemDescripcion: string;
  unidadId: number;
  unidad: string;
  centroCostoId: number;
  centroCosto: string;
  compra: number;
  ingresado: number;
  pendiente: number;
  cantidadIngresar: number | null;
  seleccionado: boolean;
}

interface AlmacenSolicitanteOption {
  id: number;
  code: string;
  documentNumber: string;
  name: string;
}

interface AlmacenCentroCostoOption {
  id: number;
  code: string;
  description: string;
}

@Component({
  selector: 'app-almacen-page',
  templateUrl: './almacen-page.component.html',
  styleUrls: ['./almacen-page.component.scss']
})
export class AlmacenPageComponent implements OnInit {
  readonly filtersForm: FormGroup;
  readonly ingresoDirectoForm: FormGroup;
  readonly pageSize = DEFAULT_GRID_PAGE_SIZE;
  readonly actionButtons = ['Ing. Directo'];
  readonly estadoOptions: CatalogoTextoOption[] = [
    { codigo: '', descripcion: 'Todos' },
    { codigo: 'A', descripcion: 'Activo' },
    { codigo: 'I', descripcion: 'Inactivo' }
  ];
  readonly estadoAprobacionOptions: CatalogoTextoOption[] = [
    { codigo: '', descripcion: 'Todos' },
    { codigo: 'I', descripcion: 'Ingresado' },
    { codigo: 'P', descripcion: 'Pendiente' },
    { codigo: 'C', descripcion: 'Cerrado' }
  ];
  readonly tipoIngresoOptions: CatalogoNumeroOption[] = [
    { codigo: 0, descripcion: 'Todos' },
    { codigo: 1, descripcion: 'Ingreso directo' },
    { codigo: 2, descripcion: 'Orden de compra' },
    { codigo: 3, descripcion: 'Orden de servicio' }
  ];
  readonly listadoOptions: CatalogoTextoOption[] = [
    { codigo: 'P', descripcion: 'Pendiente' },
    { codigo: 'I', descripcion: 'Ingresado' }
  ];
  readonly ubicacionOptions: CatalogoTextoOption[] = [
    { codigo: '1', descripcion: 'BASE' },
    { codigo: '2', descripcion: 'OBRA' }
  ];

  readonly solicitanteSearchControl = new FormControl('', { nonNullable: true });
  readonly proveedorSearchControl = new FormControl('', { nonNullable: true });
  readonly centroCostoSearchControl = new FormControl('', { nonNullable: true });
  readonly centrosCostoMaterialSearchControl = new FormControl('', { nonNullable: true });
  readonly listadoControl = new FormControl<'P' | 'I'>('P', { nonNullable: true });

  almacenes: AlmacenRow[] = [];
  ordenesCompraPendientesAlmacen: OrdenCompraPendienteAlmacenRow[] = [];
  solicitanteOptions: AlmacenSolicitanteOption[] = [];
  proveedorOptions: ProviderRecord[] = [];
  centroCostoOptions: AlmacenCentroCostoOption[] = [];
  itemOptions: PedidoDetalleItemOption[] = [];
  unidadOptions: PedidoDetalleUnidadOption[] = [];
  ubicacionIngresoOrdenOptions: CatalogoNumeroOption[] = [];
  globalSearch = '';
  isLoadingAlmacen = false;
  isLoadingCatalogos = false;
  isSavingIngreso = false;
  isLoadingEditor = false;
  showIngresoDirectoForm = false;
  showIngresoOrdenForm = false;
  isEditMode = false;
  errorMessage = '';
  saveErrorMessage = '';
  currentPage = 1;
  ingresoOrdenSeleccionada: OrdenCompraPendienteAlmacenRow | null = null;
  ingresoOrdenDetalles: IngresoOrdenDetalleRow[] = [];
  ingresoOrdenUbicacionId = 1;
  private pendingEditMovimientoId: number | null = null;
  private pendingEditCabeceraRecord: DataRecord | null = null;
  private pendingEditDetalleRecord: DataRecord | null = null;
  private currentEditDetalleId = 0;
  private currentEditFlgEst = 'A';
  private isIngresoOrdenEditMode = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog
  ) {
    this.filtersForm = this.formBuilder.group({
      movimientoId: [''],
      tipoIngreso: [0],
      estado: [''],
      estadoAprobacion: ['']
    });

    this.ingresoDirectoForm = this.formBuilder.group({
      movimientoId: [{ value: 'Auto', disabled: true }],
      tipoIngresoTexto: [{ value: 'Ingreso directo', disabled: true }],
      ubicacion: ['1', Validators.required],
      solicitanteId: [''],
      proveedorId: [0],
      centroCostoSolicitanteId: [0, Validators.required],
      materialId: [0, Validators.required],
      materialCode: [''],
      materialDescription: ['', Validators.required],
      unidadId: [0, Validators.required],
      unidadCode: [''],
      unidadDescription: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.001)]],
      documentoNumero: [''],
      fecha: [this.getTodayDateValue()],
      centrosCostoMaterialIds: [[]]
    });
  }

  ngOnInit(): void {
    this.cargarListadoSeleccionado();
    this.cargarCatalogosEditor();
  }

  get isListadoPendiente(): boolean {
    return this.listadoControl.value === 'P';
  }

  get isListadoIngresado(): boolean {
    return this.listadoControl.value === 'I';
  }

  get filteredAlmacenes(): AlmacenRow[] {
    const search = this.globalSearch.trim().toLowerCase();

    if (!search) {
      return this.almacenes;
    }

    return this.almacenes.filter((item) => {
      const searchableValues = [
        item.movimientoId,
        item.tipoIngreso,
        item.centroCosto,
        item.almacen,
        item.fechaRegistro,
        item.registradoPor,
        item.estadoAprobacion
      ];

      return searchableValues.some((value) => String(value).toLowerCase().includes(search));
    });
  }

  get paginatedAlmacenes(): AlmacenRow[] {
    return paginateItems(this.filteredAlmacenes, this.currentPage, this.pageSize);
  }

  get paginatedOrdenesCompraPendientesAlmacen(): OrdenCompraPendienteAlmacenRow[] {
    return paginateItems(this.ordenesCompraPendientesAlmacen, this.currentPage, this.pageSize);
  }

  get filteredSolicitanteOptions(): AlmacenSolicitanteOption[] {
    const search = this.solicitanteSearchControl.value.trim().toLowerCase();

    if (!search) {
      return this.solicitanteOptions;
    }

    return this.solicitanteOptions.filter((item) =>
      [item.name, item.code, item.documentNumber].some((value) => value.toLowerCase().includes(search))
    );
  }

  get filteredCentroCostoOptions(): AlmacenCentroCostoOption[] {
    const search = this.centroCostoSearchControl.value.trim().toLowerCase();

    if (!search) {
      return this.centroCostoOptions;
    }

    return this.centroCostoOptions.filter((item) =>
      [item.description, item.code].some((value) => value.toLowerCase().includes(search))
    );
  }

  get filteredProveedorOptions(): ProviderRecord[] {
    const search = this.proveedorSearchControl.value.trim().toLowerCase();

    if (!search) {
      return this.proveedorOptions;
    }

    return this.proveedorOptions.filter((item) =>
      [item.name, item.ruc, String(item.code)].some((value) => value.toLowerCase().includes(search))
    );
  }

  get filteredCentrosCostoMaterialOptions(): AlmacenCentroCostoOption[] {
    const search = this.centrosCostoMaterialSearchControl.value.trim().toLowerCase();

    if (!search) {
      return this.centroCostoOptions;
    }

    return this.centroCostoOptions.filter((item) =>
      [item.description, item.code].some((value) => value.toLowerCase().includes(search))
    );
  }

  get selectedMaterialLabel(): string {
    const code = String(this.ingresoDirectoForm.controls['materialCode'].value || '').trim();
    return code || 'Seleccionar material';
  }

  get selectedUnidadLabel(): string {
    const code = String(this.ingresoDirectoForm.controls['unidadCode'].value || '').trim();
    return code || 'Seleccionar unidad';
  }

  get selectedCentroCostosMaterialLabel(): string {
    const selectedIds = (this.ingresoDirectoForm.controls['centrosCostoMaterialIds'].value as number[]) || [];

    if (!selectedIds.length) {
      return 'Seleccionar centros de costo';
    }

    const labels = this.centroCostoOptions
      .filter((item) => selectedIds.includes(item.id))
      .map((item) => item.code);

    return labels.join(', ');
  }

  get editorEyebrow(): string {
    return this.isEditMode ? 'Edicion' : 'Edicion';
  }

  get editorTitle(): string {
    return this.isEditMode ? 'Editar ingreso directo' : 'Registrar ingreso directo';
  }

  aplicarFiltros(): void {
    this.cargarListadoSeleccionado();
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      movimientoId: '',
      tipoIngreso: 0,
      estado: '',
      estadoAprobacion: ''
    });
    this.globalSearch = '';
    this.cargarListadoSeleccionado();
  }

  onGlobalSearchChange(value: string): void {
    this.globalSearch = value;
    this.currentPage = normalizePaginationPage(1, this.filteredAlmacenes.length, this.pageSize);
  }

  onPageChange(page: number): void {
    const totalItems = this.isListadoPendiente
      ? this.ordenesCompraPendientesAlmacen.length
      : this.filteredAlmacenes.length;
    this.currentPage = normalizePaginationPage(page, totalItems, this.pageSize);
  }

  onListadoChange(): void {
    this.currentPage = 1;
    this.globalSearch = '';
    this.errorMessage = '';
    this.cargarListadoSeleccionado();
  }

  ejecutarAccion(action: string): void {
    if (action === 'Ing. Directo') {
      this.abrirIngresoDirecto();
    }
  }

  onSolicitanteSelectOpened(opened: boolean): void {
    if (!opened) {
      this.solicitanteSearchControl.setValue('', { emitEvent: false });
    }
  }

  onCentroCostoSelectOpened(opened: boolean): void {
    if (!opened) {
      this.centroCostoSearchControl.setValue('', { emitEvent: false });
    }
  }

  onProveedorSelectOpened(opened: boolean): void {
    if (opened && !this.proveedorOptions.length && !this.isLoadingCatalogos) {
      this.cargarCatalogosEditor();
    }

    if (!opened) {
      this.proveedorSearchControl.setValue('', { emitEvent: false });
    }
  }

  onCentroCostoMaterialSelectOpened(opened: boolean): void {
    if (!opened) {
      this.centrosCostoMaterialSearchControl.setValue('', { emitEvent: false });
    }
  }

  openMaterialDialog(): void {
    if (!this.itemOptions.length) {
      return;
    }

    const dialogRef = this.dialog.open(PedidoDetalleItemSelectorDialogComponent, {
      autoFocus: false,
      width: '42rem',
      data: {
        items: this.itemOptions
      }
    });

    dialogRef.afterClosed().subscribe((selectedItem?: PedidoDetalleItemOption) => {
      if (!selectedItem) {
        return;
      }

      this.ingresoDirectoForm.patchValue({
        materialId: selectedItem.id,
        materialCode: selectedItem.code,
        materialDescription: selectedItem.description
      });
    });
  }

  openUnidadDialog(): void {
    if (!this.unidadOptions.length) {
      return;
    }

    const dialogRef = this.dialog.open(PedidoDetalleUnidadSelectorDialogComponent, {
      autoFocus: false,
      width: '38rem',
      data: {
        units: this.unidadOptions
      }
    });

    dialogRef.afterClosed().subscribe((selectedUnit?: PedidoDetalleUnidadOption) => {
      if (!selectedUnit) {
        return;
      }

      this.ingresoDirectoForm.patchValue({
        unidadId: selectedUnit.id,
        unidadCode: selectedUnit.code,
        unidadDescription: selectedUnit.description
      });
    });
  }

  guardarIngresoDirecto(): void {
    if (this.isEditMode) {
      this.actualizarIngresoDirecto();
      return;
    }

    if (this.ingresoDirectoForm.invalid) {
      this.ingresoDirectoForm.markAllAsTouched();
      const invalidControls = this.getInvalidIngresoDirectoControls();
      console.log('Almacen ingreso directo invalid controls', invalidControls);
      this.saveErrorMessage = `Completa los campos obligatorios para registrar el ingreso directo. Campos invalidos: ${invalidControls.join(', ')}`;
      return;
    }

    const cabeceraPayload = this.buildRegistrarIngresoAlmacenPayload();

    if (!cabeceraPayload) {
      return;
    }

    this.isSavingIngreso = true;
    this.saveErrorMessage = '';

    this.apiService.postRegistrarIngresoAlmacen(cabeceraPayload).subscribe({
      next: (cabeceraResponse: unknown) => {
        try {
          this.assertSuccessfulResponse(cabeceraResponse, 'No se pudo registrar la cabecera del ingreso a almacen.');
        } catch (error: unknown) {
          this.isSavingIngreso = false;
          this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo registrar la cabecera del ingreso a almacen.');
          return;
        }

        const movimientoId = this.extractAlmacenMovimientoIdFromResponse(cabeceraResponse);

        if (!movimientoId) {
          this.isSavingIngreso = false;
          this.saveErrorMessage = 'Se registro la cabecera, pero no se pudo identificar el Alm_Mov_Id devuelto por el backend.';
          return;
        }

        const detallePayload = this.buildRegistrarIngresoAlmacenDetallePayload(movimientoId);

        if (!detallePayload) {
          this.isSavingIngreso = false;
          return;
        }

        this.apiService.postRegistrarIngresoAlmacenDetalle(detallePayload).subscribe({
          next: (detalleResponse: unknown) => {
            try {
              this.assertSuccessfulResponse(detalleResponse, 'No se pudo registrar el detalle del ingreso a almacen.');
            } catch (error: unknown) {
              this.isSavingIngreso = false;
              this.saveErrorMessage = this.resolveErrorMessage(
                error,
                `Se registro el movimiento ${movimientoId}, pero no se pudo registrar el detalle del ingreso.`
              );
              return;
            }

            this.isSavingIngreso = false;
            this.filtersForm.patchValue({ movimientoId: movimientoId }, { emitEvent: false });
            this.globalSearch = '';
            this.showIngresoDirectoForm = false;
            this.saveErrorMessage = '';
            this.resetIngresoDirectoForm();
            this.cargarListadoSeleccionado();
          },
          error: (error: unknown) => {
            this.isSavingIngreso = false;
            this.saveErrorMessage = this.resolveErrorMessage(
              error,
              `Se registro el movimiento ${movimientoId}, pero no se pudo registrar el detalle del ingreso.`
            );
          }
        });
      },
      error: (error: unknown) => {
        this.isSavingIngreso = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo registrar el ingreso a almacen.');
      }
    });
  }

  cancelarIngresoDirecto(): void {
    this.showIngresoDirectoForm = false;
    this.isEditMode = false;
    this.saveErrorMessage = '';
    this.clearPendingEditData();
    this.resetIngresoDirectoForm();
  }

  abrirIngresoOrden(item: OrdenCompraPendienteAlmacenRow): void {
    console.log('Almacen ingresar orden - fila seleccionada:', item);
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.isLoadingEditor = true;
    this.showIngresoDirectoForm = false;
    this.showIngresoOrdenForm = true;
    this.isIngresoOrdenEditMode = false;
    this.ingresoOrdenSeleccionada = item;
    this.ingresoOrdenDetalles = [];
    this.ingresoOrdenUbicacionId = 1;

    this.apiService.getListarCabeceraIngresoAlmacen(item.ordenCompraId).subscribe({
      next: (response: unknown) => {
        console.log('Almacen ingresar orden - cabecera response:', response);
        const record = this.extractRecords(response)[0] ?? null;
        const cabecera = record
          ? this.mapCabeceraIngresoOrden(record, item)
          : item;
        this.ingresoOrdenSeleccionada = cabecera;
        this.cargarDetalleIngresoOrden(cabecera, item);
      },
      error: (error: unknown) => {
        this.isLoadingEditor = false;
        this.saveErrorMessage = this.resolveErrorMessage(
          error,
          'No se pudo cargar la cabecera del ingreso a almacen.'
        );
      }
    });
  }

  cancelarIngresoOrden(): void {
    this.showIngresoOrdenForm = false;
    this.ingresoOrdenSeleccionada = null;
    this.ingresoOrdenDetalles = [];
    this.ingresoOrdenUbicacionId = 1;
    this.saveErrorMessage = '';
    this.isIngresoOrdenEditMode = false;
  }

  trackByAlmacen(_: number, item: AlmacenRow): number {
    return item.id;
  }

  trackByOrdenCompraPendienteAlmacen(_: number, item: OrdenCompraPendienteAlmacenRow): number {
    return item.id;
  }

  trackByIngresoOrdenDetalle(_: number, item: IngresoOrdenDetalleRow): number {
    return item.id;
  }

  setCantidadIngresoDetalle(item: IngresoOrdenDetalleRow, value: string): void {
    const cantidad = Number(value);
    item.cantidadIngresar = value === '' || !Number.isFinite(cantidad) ? null : cantidad;
  }

  setSeleccionIngresoDetalle(item: IngresoOrdenDetalleRow, checked: boolean): void {
    item.seleccionado = checked;
  }

  get areAllIngresoOrdenDetallesSelected(): boolean {
    return this.ingresoOrdenDetalles.length > 0
      && this.ingresoOrdenDetalles.every((item) => item.seleccionado);
  }

  setSeleccionTodosIngresoOrdenDetalles(checked: boolean): void {
    this.ingresoOrdenDetalles = this.ingresoOrdenDetalles.map((item) => ({
      ...item,
      seleccionado: checked
    }));
  }

  setIngresoOrdenUbicacion(value: number): void {
    this.ingresoOrdenUbicacionId = Number(value) || 0;
  }

  getCantidadMaximaIngreso(item: IngresoOrdenDetalleRow): number {
    return this.isIngresoOrdenEditMode ? item.compra : item.pendiente;
  }

  get esIngresoOrdenServicio(): boolean {
    return this.ingresoOrdenSeleccionada
      ? this.esOrdenServicio(this.ingresoOrdenSeleccionada.tipo || this.ingresoOrdenSeleccionada.formaPago)
      : false;
  }

  guardarIngresoOrden(): void {
    if (this.isIngresoOrdenEditMode) {
      this.actualizarIngresoOrden();
      return;
    }

    const cabecera = this.ingresoOrdenSeleccionada;
    const cabeceraPayload = this.buildRegistrarIngresoAlmacenOrdenCompraPayload();
    const detallePayloads = this.esIngresoOrdenServicio ? [] : this.buildActualizarPedidoDetalleIngresoAlmacenPayloads();

    if (!cabecera || !cabeceraPayload || (!this.esIngresoOrdenServicio && !detallePayloads.length)) {
      return;
    }

    this.isSavingIngreso = true;
    this.saveErrorMessage = '';

    if (this.esIngresoOrdenServicio) {
      this.cambiarEstadoOrdenCompraIngresada(cabecera, () => {
        this.registrarIngresoOrdenCompra(cabeceraPayload, []);
      });
      return;
    }

    this.cambiarEstadoOrdenCompraIngresada(cabecera, () => {
      this.registrarIngresoOrdenCompra(cabeceraPayload, detallePayloads);
    });
  }

  private registrarIngresoOrdenCompra(
    cabeceraPayload: RegistrarIngresoAlmacenOrdenCompraRequest,
    detallePayloads: ActualizarPedidoDetalleIngresoAlmacenRequest[]
  ): void {
    this.apiService.postRegistrarIngresoAlmacenOrdenCompra(cabeceraPayload).subscribe({
      next: (cabeceraResponse: unknown) => {
        try {
          this.assertSuccessfulResponse(cabeceraResponse, 'No se pudo registrar el ingreso de almacen por orden de compra.');
        } catch (error: unknown) {
          this.isSavingIngreso = false;
          this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo registrar el ingreso de almacen por orden de compra.');
          return;
        }

        if (!detallePayloads.length) {
          this.finalizarGuardadoIngresoOrden();
          return;
        }

        forkJoin(detallePayloads.map((detalle) => this.apiService.patchActualizarPedidoDetalleIngresoAlmacen(detalle))).subscribe({
          next: (detalleResponses: unknown[]) => {
            try {
              detalleResponses.forEach((response) => {
                this.assertSuccessfulResponse(response, 'No se pudo actualizar el detalle del pedido para ingreso de almacen.');
              });
            } catch (error: unknown) {
              this.isSavingIngreso = false;
              this.saveErrorMessage = this.resolveErrorMessage(
                error,
                'Se registro el ingreso, pero no se pudo actualizar el detalle del pedido.'
              );
              return;
            }

            this.finalizarGuardadoIngresoOrden();
          },
          error: (error: unknown) => {
            this.isSavingIngreso = false;
            this.saveErrorMessage = this.resolveErrorMessage(
              error,
              'Se registro el ingreso, pero no se pudo actualizar el detalle del pedido.'
            );
          }
        });
      },
      error: (error: unknown) => {
        this.isSavingIngreso = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo registrar el ingreso de almacen por orden de compra.');
      }
    });
  }

  private actualizarIngresoOrden(): void {
    if (this.esIngresoOrdenServicio) {
      this.finalizarGuardadoIngresoOrden();
      return;
    }

    const detallePayloads = this.buildActualizarPedidoDetalleIngresoAlmacenPayloads();

    if (!this.ingresoOrdenSeleccionada || !detallePayloads.length) {
      return;
    }

    this.isSavingIngreso = true;
    this.saveErrorMessage = '';

    forkJoin(detallePayloads.map((detalle) => this.apiService.patchActualizarPedidoDetalleIngresoAlmacen(detalle))).subscribe({
      next: (detalleResponses: unknown[]) => {
        try {
          detalleResponses.forEach((response) => {
            this.assertSuccessfulResponse(response, 'No se pudo actualizar el detalle del ingreso por orden.');
          });
        } catch (error: unknown) {
          this.isSavingIngreso = false;
          this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo actualizar el detalle del ingreso por orden.');
          return;
        }

        this.finalizarGuardadoIngresoOrden();
      },
      error: (error: unknown) => {
        this.isSavingIngreso = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo actualizar el detalle del ingreso por orden.');
      }
    });
  }

  private cambiarEstadoOrdenCompraIngresada(cabecera: OrdenCompraPendienteAlmacenRow, onSuccess: () => void): void {
    const payload: CambiarEstadoOrdenCompraRequest = {
      Ord_Com_Id: cabecera.ordenCompraId,
      Flg_Alm: 'I'
    };

    console.log('Almacen ingreso orden - cambiar estado OC:', payload);

    this.apiService.patchCambiarEstadoOrdenCompra(payload).subscribe({
      next: (response: unknown) => {
        try {
          this.assertSuccessfulResponse(response, 'No se pudo cambiar el estado de almacen de la orden de compra.');
        } catch (error: unknown) {
          this.isSavingIngreso = false;
          this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo cambiar el estado de almacen de la orden de compra.');
          return;
        }

        onSuccess();
      },
      error: (error: unknown) => {
        this.isSavingIngreso = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo cambiar el estado de almacen de la orden de compra.');
      }
    });
  }

  private finalizarGuardadoIngresoOrden(): void {
    this.isSavingIngreso = false;
    this.showIngresoOrdenForm = false;
    this.ingresoOrdenSeleccionada = null;
    this.ingresoOrdenDetalles = [];
    this.ingresoOrdenUbicacionId = 1;
    this.saveErrorMessage = '';
    this.isIngresoOrdenEditMode = false;
    this.cargarListadoSeleccionado();
    window.dispatchEvent(new CustomEvent('process-notifications-refresh'));
  }

  trackBySolicitante(_: number, item: AlmacenSolicitanteOption): number {
    return item.id;
  }

  formatSolicitanteLabel(option: AlmacenSolicitanteOption): string {
    return option.name;
  }

  trackByCentroCosto(_: number, item: AlmacenCentroCostoOption): number {
    return item.id;
  }

  editarMovimiento(item: AlmacenRow): void {
    if (this.esIngresoPorOrden(item)) {
      this.editarIngresoOrden(item);
      return;
    }

    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.isLoadingEditor = true;
    this.showIngresoDirectoForm = true;
    this.showIngresoOrdenForm = false;
    this.isIngresoOrdenEditMode = false;
    this.isEditMode = true;
    this.resetIngresoDirectoForm();

    forkJoin({
      cabecera: this.apiService.getListarIngresoAlmacenModificar(item.movimientoId),
      detalle: this.apiService.getListarIngresoAlmacenDetalleModificar(item.movimientoId)
    }).subscribe({
      next: ({ cabecera, detalle }) => {
        console.log('getListarIngresoAlmacenModificar response', cabecera);
        const cabeceraRecord = this.extractRecords(cabecera)[0] ?? null;
        const detalleRecord = this.extractRecords(detalle)[0] ?? null;

        if (!cabeceraRecord && !detalleRecord) {
          this.isLoadingEditor = false;
          this.saveErrorMessage = 'No se encontraron datos para editar el ingreso seleccionado.';
          return;
        }

        this.pendingEditMovimientoId = item.movimientoId;
        this.pendingEditCabeceraRecord = cabeceraRecord;
        this.pendingEditDetalleRecord = detalleRecord;
        this.tryPatchPendingEditForm();
        this.isLoadingEditor = false;
      },
      error: (error: unknown) => {
        this.isLoadingEditor = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo cargar el ingreso seleccionado para editar.');
      }
    });
  }

  private abrirIngresoDirecto(): void {
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.isEditMode = false;
    this.resetIngresoDirectoForm();
    this.showIngresoOrdenForm = false;
    this.ingresoOrdenSeleccionada = null;
    this.ingresoOrdenUbicacionId = 1;
    this.isIngresoOrdenEditMode = false;
    this.showIngresoDirectoForm = true;
  }

  private resetIngresoDirectoForm(): void {
    this.ingresoDirectoForm.reset({
      movimientoId: 'Auto',
      tipoIngresoTexto: 'Ingreso directo',
      ubicacion: '1',
      solicitanteId: '',
      proveedorId: 0,
      centroCostoSolicitanteId: 0,
      materialId: 0,
      materialCode: '',
      materialDescription: '',
      unidadId: 0,
      unidadCode: '',
      unidadDescription: '',
      cantidad: 1,
      documentoNumero: '',
      fecha: this.getTodayDateValue(),
      centrosCostoMaterialIds: []
    });
    this.solicitanteSearchControl.setValue('', { emitEvent: false });
    this.proveedorSearchControl.setValue('', { emitEvent: false });
    this.centroCostoSearchControl.setValue('', { emitEvent: false });
    this.centrosCostoMaterialSearchControl.setValue('', { emitEvent: false });
    this.currentEditDetalleId = 0;
    this.currentEditFlgEst = 'A';
  }

  private clearPendingEditData(): void {
    this.pendingEditMovimientoId = null;
    this.pendingEditCabeceraRecord = null;
    this.pendingEditDetalleRecord = null;
  }

  private patchIngresoDirectoFormForEdit(
    movimientoId: number,
    cabeceraRecord: DataRecord | null,
    detalleRecord: DataRecord | null
  ): void {
    const sourceRecord = detalleRecord ?? cabeceraRecord ?? {};
    const ubicacion = this.resolveUbicacionCodigo(detalleRecord, cabeceraRecord);
    const solicitanteId = this.resolveSolicitanteId(detalleRecord, cabeceraRecord);
    const centroCostoSolicitanteId = this.resolveCentroCostoId(detalleRecord, cabeceraRecord);
    const materialOption = this.resolveItemOption(detalleRecord);
    const unidadOption = this.resolveUnidadOption(detalleRecord);
    const proveedorId = this.resolveProveedorId(detalleRecord, cabeceraRecord);
    this.currentEditDetalleId = this.getNumberValue(sourceRecord, ['Alm_Det_Id', 'alm_Det_Id', 'almDetId']) ?? 0;
    this.currentEditFlgEst = this.getTextValue(cabeceraRecord ?? sourceRecord, ['Flg_Est', 'flg_Est', 'flgEst']).toUpperCase() || 'A';
    const cantidad = this.getDecimalValue(sourceRecord, ['Alm_Det_Can', 'alm_Det_Can', 'almDetCan', 'Cantidad', 'cantidad']) ?? 1;
    const documentoNumero = this.getTextValue(sourceRecord, ['Alm_Det_Doc_Nro', 'alm_Det_Doc_Nro', 'almDetDocNro', 'Doc_Nro', 'doc_Nro', 'docNro']);
    const materialId = materialOption?.id ?? this.getNumberValue(sourceRecord, ['Alm_Det_Itm_Id', 'alm_Det_Itm_Id', 'almDetItmId', 'Itm_Id', 'itm_Id', 'itmId']) ?? 0;
    const materialCode = materialOption?.code
      || (materialId > 0 ? String(materialId) : '');
    const materialDescription = materialOption?.description
      || this.getTextValue(sourceRecord, ['Itm_Des', 'itm_Des', 'itmDes', 'Material', 'material']);
    const unidadId = unidadOption?.id ?? this.getNumberValue(sourceRecord, ['Alm_Det_Uni_Med_Id', 'alm_Det_Uni_Med_Id', 'almDetUniMedId', 'Uni_Med_Id', 'uni_Med_Id', 'uniMedId']) ?? 0;
    const unidadCode = unidadOption?.code
      || this.getTextValue(sourceRecord, ['Uni_Med_Cod', 'uni_Med_Cod', 'uniMedCod'])
      || (unidadId > 0 ? String(unidadId) : '');
    const unidadDescription = unidadOption?.description
      || this.getTextValue(sourceRecord, ['Uni_Med_Des', 'uni_Med_Des', 'uniMedDes', 'Unidad', 'unidad']);

    this.ingresoDirectoForm.patchValue({
      movimientoId: String(movimientoId),
      tipoIngresoTexto: this.getTextValue(cabeceraRecord ?? sourceRecord, ['Ing_Des', 'ing_Des', 'ingDes']) || 'Ingreso directo',
      ubicacion,
      solicitanteId,
      proveedorId,
      centroCostoSolicitanteId,
      materialId,
      materialCode,
      materialDescription,
      unidadId,
      unidadCode,
      unidadDescription,
      cantidad,
      documentoNumero,
      fecha: this.parseDateValue(this.getTextValue(sourceRecord, ['Alm_Det_Fec', 'alm_Det_Fec', 'almDetFec', 'Fec_Reg', 'fec_Reg', 'fecReg']))
    });
  }

  private tryPatchPendingEditForm(): void {
    if (!this.isEditMode || !this.pendingEditMovimientoId) {
      return;
    }

    this.patchIngresoDirectoFormForEdit(
      this.pendingEditMovimientoId,
      this.pendingEditCabeceraRecord,
      this.pendingEditDetalleRecord
    );

    const solicitanteId = String(this.ingresoDirectoForm.controls['solicitanteId'].value || '').trim();

    if (solicitanteId) {
      this.clearPendingEditData();
    }
  }

  private cargarMovimientos(): void {
    this.isLoadingAlmacen = true;
    this.errorMessage = '';
    this.ordenesCompraPendientesAlmacen = [];

    this.apiService.getListarIngresoAlmacen(this.getFiltros()).subscribe({
      next: (response: unknown) => {
        this.almacenes = this.extractRecords(response)
          .map((item, index) => this.mapAlmacen(item, index))
          .filter((item): item is AlmacenRow => item !== null);
        this.currentPage = normalizePaginationPage(this.currentPage, this.filteredAlmacenes.length, this.pageSize);
        this.isLoadingAlmacen = false;
      },
      error: (error: unknown) => {
        this.almacenes = [];
        this.currentPage = 1;
        this.errorMessage = this.resolveErrorMessage(error, 'No se pudo cargar el listado de ingresos de almacen.');
        this.isLoadingAlmacen = false;
      }
    });
  }

  private cargarOrdenesCompraPendientesAlmacen(): void {
    this.isLoadingAlmacen = true;
    this.errorMessage = '';
    this.almacenes = [];

    this.apiService.getListarOrdenCompraPendienteAlmacen().subscribe({
      next: (response: unknown) => {
        this.ordenesCompraPendientesAlmacen = this.extractRecords(response)
          .map((item, index) => this.mapOrdenCompraPendienteAlmacen(item, index))
          .filter((item): item is OrdenCompraPendienteAlmacenRow => item !== null);
        this.currentPage = normalizePaginationPage(
          this.currentPage,
          this.ordenesCompraPendientesAlmacen.length,
          this.pageSize
        );
        this.isLoadingAlmacen = false;
      },
      error: (error: unknown) => {
        this.ordenesCompraPendientesAlmacen = [];
        this.currentPage = 1;
        this.errorMessage = this.resolveErrorMessage(
          error,
          'No se pudo cargar el listado de ordenes de compra pendientes para almacen.'
        );
        this.isLoadingAlmacen = false;
      }
    });
  }

  private cargarListadoSeleccionado(): void {
    if (this.isListadoPendiente) {
      this.cargarOrdenesCompraPendientesAlmacen();
      return;
    }

    this.cargarMovimientos();
  }

  private cargarDetalleIngresoOrden(
    cabecera: OrdenCompraPendienteAlmacenRow,
    fallback?: OrdenCompraPendienteAlmacenRow
  ): void {
    if (this.esOrdenServicio(cabecera.tipo || cabecera.formaPago || fallback?.tipo || fallback?.formaPago || '')) {
      this.ingresoOrdenDetalles = [];
      this.isLoadingEditor = false;
      return;
    }

    const pedCabId = cabecera.pedidoId || fallback?.pedidoId || 0;
    const ordComId = cabecera.ordenCompraId || fallback?.ordenCompraId || 0;

    console.log('Almacen ingresar orden - detalle request:', {
      Ped_Cab_Id: pedCabId,
      Ord_Com_Id: ordComId,
      cabecera,
      fallback
    });

    if (!pedCabId || !ordComId) {
      this.ingresoOrdenDetalles = [];
      this.isLoadingEditor = false;
      this.saveErrorMessage = 'No se pudo identificar el pedido asociado a la orden seleccionada.';
      return;
    }

    this.apiService.getListarDetalleIngresoAlmacen(pedCabId, ordComId).subscribe({
      next: (response: unknown) => {
        console.log('Almacen ingresar orden - detalle response:', response);
        this.ingresoOrdenDetalles = this.extractRecords(response)
          .map((item, index) => this.mapIngresoOrdenDetalle(item, index))
          .filter((item): item is IngresoOrdenDetalleRow => item !== null);
        this.isLoadingEditor = false;
      },
      error: (error: unknown) => {
        this.ingresoOrdenDetalles = [];
        this.isLoadingEditor = false;
        this.saveErrorMessage = this.resolveErrorMessage(
          error,
          'No se pudo cargar el detalle del ingreso a almacen.'
        );
      }
    });
  }

  private cargarCatalogosEditor(): void {
    this.isLoadingCatalogos = true;
    let pendingRequests = 6;
    const finishRequest = () => {
      pendingRequests -= 1;

      if (pendingRequests <= 0) {
        this.isLoadingCatalogos = false;
      }
    };

    this.apiService.getListarUsuarioActivo({ Flg_Est: 'A' }).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: unknown) => {
        this.solicitanteOptions = this.extractRecords(response)
          .map((item) => this.mapSolicitanteOption(item))
          .filter((item): item is AlmacenSolicitanteOption => item !== null);
        this.refrescarGridAlmacenConCatalogos();
        this.tryPatchPendingEditForm();
        finishRequest();
      },
      error: () => {
        this.solicitanteOptions = [];
        this.refrescarGridAlmacenConCatalogos();
        finishRequest();
      }
    });

    this.apiService.getListarCentroCostoActivo({ Flg_Est: 'A' }).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: unknown) => {
        this.centroCostoOptions = this.extractRecords(response)
          .map((item) => this.mapCentroCostoOption(item))
          .filter((item): item is AlmacenCentroCostoOption => item !== null);
        this.refrescarGridAlmacenConCatalogos();
        this.tryPatchPendingEditForm();
        finishRequest();
      },
      error: () => {
        this.centroCostoOptions = [];
        this.refrescarGridAlmacenConCatalogos();
        finishRequest();
      }
    });

    this.apiService.getListarItem({ Flg_Est: 'A' }).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: unknown) => {
        this.itemOptions = this.extractRecords(response)
          .map((item) => this.mapItemOption(item))
          .filter((item): item is PedidoDetalleItemOption => item !== null);
        this.refrescarGridAlmacenConCatalogos();
        this.tryPatchPendingEditForm();
        finishRequest();
      },
      error: () => {
        this.itemOptions = [];
        this.refrescarGridAlmacenConCatalogos();
        finishRequest();
      }
    });

    this.apiService.getListarUnidadMedida({ Flg_Est: 'A' }).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: unknown) => {
        this.unidadOptions = this.extractRecords(response)
          .map((item) => this.mapUnidadOption(item))
          .filter((item): item is PedidoDetalleUnidadOption => item !== null);
        this.refrescarGridAlmacenConCatalogos();
        this.tryPatchPendingEditForm();
        finishRequest();
      },
      error: () => {
        this.unidadOptions = [];
        this.refrescarGridAlmacenConCatalogos();
        finishRequest();
      }
    });

    this.apiService.getListarProveedorActivo({ Flg_Est: 'A' }).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: unknown) => {
        this.proveedorOptions = this.extractRecords(response)
          .map((item) => this.mapProveedorOption(item))
          .filter((item): item is ProviderRecord => item !== null);
        this.tryPatchPendingEditForm();
        finishRequest();
      },
      error: () => {
        this.proveedorOptions = [];
        finishRequest();
      }
    });

    this.apiService.getListarUbicacionActivo({ Flg_Est: 'A' }).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: unknown) => {
        this.ubicacionIngresoOrdenOptions = this.extractRecords(response)
          .map((item) => this.mapUbicacionOption(item))
          .filter((item): item is CatalogoNumeroOption => item !== null);
        finishRequest();
      },
      error: () => {
        this.ubicacionIngresoOrdenOptions = [];
        finishRequest();
      }
    });
  }

  private esIngresoPorOrden(item: AlmacenRow): boolean {
    const tipoIngreso = item.tipoIngreso.trim().toLowerCase();
    return item.tipoIngresoId > 1 || tipoIngreso.includes('orden');
  }

  private esOrdenServicio(tipo: string): boolean {
    return tipo.trim().toLowerCase().includes('servicio');
  }

  private mapAlmacenRowToIngresoOrdenFallback(item: AlmacenRow): OrdenCompraPendienteAlmacenRow {
    return {
      id: item.ordenCompraId || item.movimientoId,
      ordenCompraId: item.ordenCompraId,
      pedidoId: item.pedidoId,
      numeroOrden: item.ordenCompraId ? this.formatNumeroIngresoOrden(item.ordenCompraId, item.tipoIngreso) : '-',
      pedidoCodigo: this.formatPedidoCodigo(item.pedidoId),
      tipo: item.tipoIngreso,
      fecha: item.fechaRegistro,
      proveedorId: 0,
      proveedor: '-',
      proveedorRuc: '-',
      formaPago: item.tipoIngreso,
      refObra: '-',
      referencia: '-',
      total: 0,
      estado: item.estadoAprobacion
    };
  }

  private editarIngresoOrden(item: AlmacenRow): void {
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.isLoadingEditor = true;
    this.showIngresoDirectoForm = false;
    this.showIngresoOrdenForm = true;
    this.isIngresoOrdenEditMode = true;
    this.isEditMode = false;
    this.ingresoOrdenDetalles = [];
    this.ingresoOrdenUbicacionId = item.ubicacionId || 1;

    const fallback: OrdenCompraPendienteAlmacenRow = this.mapAlmacenRowToIngresoOrdenFallback(item);
    this.ingresoOrdenSeleccionada = fallback;

    this.apiService.getListarIngresoAlmacenModificar(item.movimientoId).subscribe({
      next: (response: unknown) => {
        console.log('Almacen editar ingreso por orden - cabecera almacen response:', response);
        const record = this.extractRecords(response)[0] ?? null;
        const ordenCompraId = record
          ? this.getNumberValue(record, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId']) ?? fallback.ordenCompraId
          : fallback.ordenCompraId;
        const pedidoId = record
          ? this.getNumberValue(record, ['Ped_Id', 'ped_Id', 'pedId', 'Ped_Cab_Id', 'ped_Cab_Id', 'pedCabId']) ?? fallback.pedidoId
          : fallback.pedidoId;
        const ubicacionId = record
          ? this.getNumberValue(record, ['Alm_Ubi', 'alm_Ubi', 'almUbi']) ?? this.ingresoOrdenUbicacionId
          : this.ingresoOrdenUbicacionId;

        this.ingresoOrdenUbicacionId = ubicacionId || 1;

        if (!ordenCompraId || !pedidoId) {
          this.isLoadingEditor = false;
          this.saveErrorMessage = 'No se pudo identificar la orden de compra o el pedido asociado al ingreso.';
          return;
        }

        const fallbackConIds: OrdenCompraPendienteAlmacenRow = {
          ...fallback,
          id: ordenCompraId,
          ordenCompraId,
          pedidoId,
          numeroOrden: this.formatNumeroIngresoOrden(ordenCompraId, fallback.tipo),
          pedidoCodigo: this.formatPedidoCodigo(pedidoId)
        };

        this.apiService.getListarCabeceraIngresoAlmacen(ordenCompraId).subscribe({
          next: (cabeceraResponse: unknown) => {
            console.log('Almacen editar ingreso por orden - cabecera OC response:', cabeceraResponse);
            const cabeceraRecord = this.extractRecords(cabeceraResponse)[0] ?? null;
            const cabecera = cabeceraRecord
              ? this.mapCabeceraIngresoOrden(cabeceraRecord, fallbackConIds)
              : fallbackConIds;
            this.ingresoOrdenSeleccionada = {
              ...cabecera,
              pedidoId: cabecera.pedidoId || pedidoId,
              ordenCompraId: cabecera.ordenCompraId || ordenCompraId
            };
            this.cargarDetalleIngresoOrden(this.ingresoOrdenSeleccionada, fallbackConIds);
          },
          error: (error: unknown) => {
            this.isLoadingEditor = false;
            this.saveErrorMessage = this.resolveErrorMessage(
              error,
              'No se pudo cargar la cabecera de la orden asociada al ingreso.'
            );
          }
        });
      },
      error: (error: unknown) => {
        this.isLoadingEditor = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo cargar el ingreso por orden seleccionado.');
      }
    });
  }

  private getFiltros(): AlmacenFiltro {
    const movimientoId = Number(this.filtersForm.controls['movimientoId'].value);
    const tipoIngreso = Number(this.filtersForm.controls['tipoIngreso'].value);
    const estado = String(this.filtersForm.controls['estado'].value || '').trim();
    const estadoAprobacion = String(this.filtersForm.controls['estadoAprobacion'].value || '').trim();
    const filtros: AlmacenFiltro = {
      Alm_Mov_Id: 0,
      Alm_Tip_Ing: 0
    };

    if (Number.isInteger(movimientoId) && movimientoId > 0) {
      filtros.Alm_Mov_Id = movimientoId;
    }

    if (Number.isInteger(tipoIngreso) && tipoIngreso > 0) {
      filtros.Alm_Tip_Ing = tipoIngreso;
    }

    if (estado) {
      filtros.Flg_Est = estado;
    }

    if (estadoAprobacion) {
      filtros.Flg_Est_Apr = estadoAprobacion;
    }

    return filtros;
  }

  private buildRegistrarIngresoAlmacenPayload(): RegistrarIngresoAlmacenRequest | null {
    const solicitante = this.getSelectedSolicitante();
    const centroCostoId = Number(this.ingresoDirectoForm.controls['centroCostoSolicitanteId'].value);
    const ubicacion = Number(this.ingresoDirectoForm.controls['ubicacion'].value);
    const currentUser = this.getCurrentOperator();

    if (!solicitante) {
      this.saveErrorMessage = 'Selecciona un solicitante valido para registrar el ingreso.';
      return null;
    }

    if (!solicitante.code) {
      this.saveErrorMessage = 'El solicitante seleccionado no tiene codigo asociado para registrar el ingreso.';
      return null;
    }

    if (!Number.isInteger(centroCostoId) || centroCostoId <= 0) {
      this.saveErrorMessage = 'Selecciona un centro de costo valido para el solicitante.';
      return null;
    }

    if (!Number.isInteger(ubicacion) || ubicacion <= 0) {
      this.saveErrorMessage = 'Selecciona una ubicacion valida para registrar el ingreso.';
      return null;
    }

    return {
      Alm_Ubi: ubicacion,
      Alm_Tip_Ing: 1,
      Alm_Sol_Dni: solicitante.code,
      Alm_Cen_Cos: centroCostoId,
      Usr_Reg: currentUser
    };
  }

  private buildRegistrarIngresoAlmacenOrdenCompraPayload(): RegistrarIngresoAlmacenOrdenCompraRequest | null {
    const cabecera = this.ingresoOrdenSeleccionada;
    const ubicacion = Number(this.ingresoOrdenUbicacionId);
    const currentUser = this.getCurrentOperator();

    if (!cabecera) {
      this.saveErrorMessage = 'No se encontro la orden de compra seleccionada para registrar el ingreso.';
      return null;
    }

    if (!Number.isInteger(ubicacion) || ubicacion <= 0) {
      this.saveErrorMessage = 'Selecciona una ubicacion valida para registrar el ingreso.';
      return null;
    }

    if (!Number.isInteger(cabecera.ordenCompraId) || cabecera.ordenCompraId <= 0) {
      this.saveErrorMessage = 'No se pudo identificar la orden de compra seleccionada.';
      return null;
    }

    if (!Number.isInteger(cabecera.pedidoId) || cabecera.pedidoId <= 0) {
      this.saveErrorMessage = 'No se pudo identificar el pedido asociado a la orden de compra.';
      return null;
    }

    const tipoIngreso = this.esOrdenServicio(cabecera.tipo || cabecera.formaPago) ? 3 : 2;

    return {
      Alm_Ubi: ubicacion,
      Alm_Tip_Ing: tipoIngreso,
      Usr_Reg: currentUser,
      Ord_Com_Id: cabecera.ordenCompraId,
      Ped_Id: cabecera.pedidoId
    };
  }

  private buildActualizarPedidoDetalleIngresoAlmacenPayloads(): ActualizarPedidoDetalleIngresoAlmacenRequest[] {
    const cabecera = this.ingresoOrdenSeleccionada;
    const seleccionados = this.ingresoOrdenDetalles.filter((item) => item.seleccionado);

    if (!cabecera) {
      this.saveErrorMessage = 'No se encontro la orden de compra seleccionada para actualizar el detalle.';
      return [];
    }

    if (!seleccionados.length) {
      this.saveErrorMessage = 'Selecciona al menos un producto para registrar el ingreso.';
      return [];
    }

    const detalleSinId = seleccionados.find((item) => !Number.isInteger(item.pedidoDetalleId) || item.pedidoDetalleId <= 0);
    if (detalleSinId) {
      this.saveErrorMessage = `El producto ${detalleSinId.itemDescripcion} no tiene Ped_Det_Id para actualizar el pedido.`;
      return [];
    }

    const detalleSinCantidad = seleccionados.find((item) => !Number.isFinite(item.cantidadIngresar) || Number(item.cantidadIngresar) <= 0);
    if (detalleSinCantidad) {
      this.saveErrorMessage = `Ingresa una cantidad valida para ${detalleSinCantidad.itemDescripcion}.`;
      return [];
    }

    const detalleMayorPendiente = seleccionados.find((item) => Number(item.cantidadIngresar) > this.getCantidadMaximaIngreso(item));
    if (detalleMayorPendiente) {
      this.saveErrorMessage = `La cantidad a ingresar de ${detalleMayorPendiente.itemDescripcion} no puede superar la cantidad permitida.`;
      return [];
    }

    return seleccionados.map((item) => ({
      Ped_Det_Id: item.pedidoDetalleId,
      Ord_Com_Id: cabecera.ordenCompraId,
      Can_Ing: Number(item.cantidadIngresar)
    }));
  }

  private buildRegistrarIngresoAlmacenDetallePayload(movimientoId: number): RegistrarIngresoAlmacenDetalleRequest | null {
    const itemId = Number(this.ingresoDirectoForm.controls['materialId'].value);
    const unidadId = Number(this.ingresoDirectoForm.controls['unidadId'].value);
    const cantidad = Number(this.ingresoDirectoForm.controls['cantidad'].value);
    const fecha = formatDateRequestValue(this.ingresoDirectoForm.controls['fecha'].value);
    const documentoReferencia = String(this.ingresoDirectoForm.controls['documentoNumero'].value || '').trim();
    const centroCostoId = Number(this.ingresoDirectoForm.controls['centroCostoSolicitanteId'].value);
    const proveedorId = Number(this.ingresoDirectoForm.controls['proveedorId'].value);
    const currentUser = this.getCurrentOperator();

    if (!Number.isInteger(itemId) || itemId <= 0) {
      this.saveErrorMessage = 'Selecciona un material valido para registrar el detalle.';
      return null;
    }

    if (!Number.isInteger(unidadId) || unidadId <= 0) {
      this.saveErrorMessage = 'Selecciona una unidad valida para registrar el detalle.';
      return null;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.saveErrorMessage = 'Ingresa una cantidad valida para registrar el detalle.';
      return null;
    }

    if (!Number.isInteger(centroCostoId) || centroCostoId <= 0) {
      this.saveErrorMessage = 'Selecciona un centro de costo valido para registrar el detalle.';
      return null;
    }

    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      this.saveErrorMessage = 'Selecciona un proveedor valido para registrar el detalle.';
      return null;
    }

    return {
      Alm_Mov_Id: movimientoId,
      Alm_Det_Itm_Id: itemId,
      Alm_Det_Uni_Med_Id: unidadId,
      Alm_Det_Can: cantidad,
      Alm_Det_Doc_Nro: documentoReferencia,
      Alm_Det_Fec: fecha,
      Alm_Det_Cen_Cos_Id: centroCostoId,
      Alm_Det_Prv_Id: proveedorId,
      Usr_Reg: currentUser
    };
  }

  private actualizarIngresoDirecto(): void {
    if (this.ingresoDirectoForm.invalid) {
      this.ingresoDirectoForm.markAllAsTouched();
      const invalidControls = this.getInvalidIngresoDirectoControls();
      console.log('Almacen actualizar ingreso directo invalid controls', invalidControls);
      this.saveErrorMessage = `Completa los campos obligatorios para actualizar el ingreso directo. Campos invalidos: ${invalidControls.join(', ')}`;
      return;
    }

    const cabeceraPayload = this.buildActualizarIngresoAlmacenPayload();

    if (!cabeceraPayload) {
      return;
    }

    const detallePayload = this.buildActualizarIngresoAlmacenDetallePayload();

    if (!detallePayload) {
      return;
    }

    this.isSavingIngreso = true;
    this.saveErrorMessage = '';

    this.apiService.patchActualizarIngresoAlmacen(cabeceraPayload).subscribe({
      next: (cabeceraResponse: unknown) => {
        try {
          this.assertSuccessfulResponse(cabeceraResponse, 'No se pudo actualizar la cabecera del ingreso a almacen.');
        } catch (error: unknown) {
          this.isSavingIngreso = false;
          this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo actualizar la cabecera del ingreso a almacen.');
          return;
        }

        this.apiService.patchActualizarIngresoAlmacenDetalle(detallePayload).subscribe({
          next: (detalleResponse: unknown) => {
            try {
              this.assertSuccessfulResponse(detalleResponse, 'No se pudo actualizar el detalle del ingreso a almacen.');
            } catch (error: unknown) {
              this.isSavingIngreso = false;
              this.saveErrorMessage = this.resolveErrorMessage(
                error,
                `Se actualizo el movimiento ${cabeceraPayload.Alm_Mov_Id}, pero no se pudo actualizar el detalle del ingreso.`
              );
              return;
            }

            this.isSavingIngreso = false;
            this.filtersForm.patchValue({ movimientoId: cabeceraPayload.Alm_Mov_Id }, { emitEvent: false });
            this.globalSearch = '';
            this.showIngresoDirectoForm = false;
            this.isEditMode = false;
            this.saveErrorMessage = '';
            this.clearPendingEditData();
            this.resetIngresoDirectoForm();
            this.cargarListadoSeleccionado();
          },
          error: (error: unknown) => {
            this.isSavingIngreso = false;
            this.saveErrorMessage = this.resolveErrorMessage(
              error,
              `Se actualizo el movimiento ${cabeceraPayload.Alm_Mov_Id}, pero no se pudo actualizar el detalle del ingreso.`
            );
          }
        });
      },
      error: (error: unknown) => {
        this.isSavingIngreso = false;
        this.saveErrorMessage = this.resolveErrorMessage(error, 'No se pudo actualizar el ingreso a almacen.');
      }
    });
  }

  private buildActualizarIngresoAlmacenPayload(): ActualizarIngresoAlmacenRequest | null {
    const solicitante = this.getSelectedSolicitante();
    const movimientoId = Number(this.ingresoDirectoForm.controls['movimientoId'].value);
    const centroCostoId = Number(this.ingresoDirectoForm.controls['centroCostoSolicitanteId'].value);
    const ubicacion = Number(this.ingresoDirectoForm.controls['ubicacion'].value);
    const currentUser = this.getCurrentOperator();

    if (!Number.isInteger(movimientoId) || movimientoId <= 0) {
      this.saveErrorMessage = 'No se pudo identificar el movimiento a actualizar.';
      return null;
    }

    if (!solicitante) {
      this.saveErrorMessage = 'Selecciona un solicitante valido para actualizar el ingreso.';
      return null;
    }

    if (!solicitante.code) {
      this.saveErrorMessage = 'El solicitante seleccionado no tiene codigo asociado para actualizar el ingreso.';
      return null;
    }

    if (!Number.isInteger(centroCostoId) || centroCostoId <= 0) {
      this.saveErrorMessage = 'Selecciona un centro de costo valido para el solicitante.';
      return null;
    }

    if (!Number.isInteger(ubicacion) || ubicacion <= 0) {
      this.saveErrorMessage = 'Selecciona una ubicacion valida para actualizar el ingreso.';
      return null;
    }

    return {
      Alm_Mov_Id: movimientoId,
      Alm_Ubi: ubicacion,
      Alm_Sol_Dni: solicitante.code,
      Alm_Cen_Cos: centroCostoId,
      Flg_Est: this.currentEditFlgEst || 'A',
      Usr_Mod: currentUser
    };
  }

  private buildActualizarIngresoAlmacenDetallePayload(): ActualizarIngresoAlmacenDetalleRequest | null {
    const itemId = Number(this.ingresoDirectoForm.controls['materialId'].value);
    const unidadId = Number(this.ingresoDirectoForm.controls['unidadId'].value);
    const cantidad = Number(this.ingresoDirectoForm.controls['cantidad'].value);
    const fecha = formatDateRequestValue(this.ingresoDirectoForm.controls['fecha'].value);
    const documentoReferencia = String(this.ingresoDirectoForm.controls['documentoNumero'].value || '').trim();
    const centroCostoId = Number(this.ingresoDirectoForm.controls['centroCostoSolicitanteId'].value);
    const proveedorId = Number(this.ingresoDirectoForm.controls['proveedorId'].value);
    const currentUser = this.getCurrentOperator();

    if (!Number.isInteger(this.currentEditDetalleId) || this.currentEditDetalleId <= 0) {
      this.saveErrorMessage = 'No se pudo identificar el detalle del ingreso a actualizar.';
      return null;
    }

    if (!Number.isInteger(itemId) || itemId <= 0) {
      this.saveErrorMessage = 'Selecciona un material valido para actualizar el detalle.';
      return null;
    }

    if (!Number.isInteger(unidadId) || unidadId <= 0) {
      this.saveErrorMessage = 'Selecciona una unidad valida para actualizar el detalle.';
      return null;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.saveErrorMessage = 'Ingresa una cantidad valida para actualizar el detalle.';
      return null;
    }

    if (!Number.isInteger(centroCostoId) || centroCostoId <= 0) {
      this.saveErrorMessage = 'Selecciona un centro de costo valido para actualizar el detalle.';
      return null;
    }

    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      this.saveErrorMessage = 'Selecciona un proveedor valido para actualizar el detalle.';
      return null;
    }

    return {
      Alm_Det_Id: this.currentEditDetalleId,
      Alm_Det_Itm_Id: itemId,
      Alm_Det_Uni_Med_Id: unidadId,
      Alm_Det_Can: cantidad,
      Alm_Det_Doc_Nro: documentoReferencia,
      Alm_Det_Fec: fecha,
      Alm_Det_Cen_Cos_Id: centroCostoId,
      Alm_Det_Prv_Id: proveedorId,
      Usr_Reg: currentUser
    };
  }

  private resolveUbicacionCodigo(detalleRecord: DataRecord | null, cabeceraRecord: DataRecord | null): string {
    const source = detalleRecord ?? cabeceraRecord ?? {};
    const directValue = this.getTextValue(source, ['Alm_Ubi', 'alm_Ubi', 'almUbi']);

    if (directValue === '1' || directValue === '2') {
      return directValue;
    }

    const description = this.getTextValue(source, ['Ubi_Des', 'ubi_Des', 'ubiDes']).toUpperCase();
    return description === 'OBRA' ? '2' : '1';
  }

  private resolveSolicitanteId(detalleRecord: DataRecord | null, cabeceraRecord: DataRecord | null): string {
    const detalleSource = detalleRecord ?? {};
    const cabeceraSource = cabeceraRecord ?? {};
    const storedValue = this.getTextValue(cabeceraSource, ['Alm_Sol_Dni', 'alm_Sol_Dni', 'almSolDni', 'Usr_Cod', 'usr_Cod', 'usrCod'])
      || this.getTextValue(detalleSource, ['Alm_Sol_Dni', 'alm_Sol_Dni', 'almSolDni', 'Usr_Cod', 'usr_Cod', 'usrCod'])
      || this.getTextValue(cabeceraSource, ['Usr_Doc_Nro', 'usr_Doc_Nro', 'usrDocNro'])
      || this.getTextValue(detalleSource, ['Usr_Doc_Nro', 'usr_Doc_Nro', 'usrDocNro']);
    const normalizedStoredValue = storedValue.trim().toLowerCase();

    if (normalizedStoredValue) {
      const matchByCode = this.solicitanteOptions.find(
        (item) => item.code.trim().toLowerCase() === normalizedStoredValue
      );

      if (matchByCode) {
        return matchByCode.code;
      }

      const matchByDocument = this.solicitanteOptions.find(
        (item) => item.documentNumber.trim().toLowerCase() === normalizedStoredValue
      );

      if (matchByDocument) {
        return matchByDocument.code;
      }

      return storedValue.trim();
    }

    const name = (
      this.getTextValue(cabeceraSource, ['Usr_Nom', 'usr_Nom', 'usrNom'])
      || this.getTextValue(detalleSource, ['Usr_Nom', 'usr_Nom', 'usrNom'])
    ).toLowerCase();
    return this.solicitanteOptions.find((item) => item.name.toLowerCase() === name)?.code ?? '';
  }

  private resolveCentroCostoId(detalleRecord: DataRecord | null, cabeceraRecord: DataRecord | null): number {
    const source = detalleRecord ?? cabeceraRecord ?? {};
    const directId = this.getNumberValue(source, ['Alm_Cen_Cos', 'alm_Cen_Cos', 'almCenCos', 'Alm_Det_Cen_Cos_Id', 'alm_Det_Cen_Cos_Id', 'almDetCenCosId', 'Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId']);

    if (directId) {
      return directId;
    }

    const description = this.getTextValue(source, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes']).toLowerCase();
    return this.centroCostoOptions.find((item) => item.description.toLowerCase() === description)?.id ?? 0;
  }

  private resolveItemOption(detalleRecord: DataRecord | null): PedidoDetalleItemOption | null {
    if (!detalleRecord) {
      return null;
    }

    const directId = this.getNumberValue(detalleRecord, ['Alm_Det_Itm_Id', 'alm_Det_Itm_Id', 'almDetItmId', 'Itm_Id', 'itm_Id', 'itmId']);

    if (directId) {
      const matchById = this.itemOptions.find((item) => item.id === directId);

      if (matchById) {
        return matchById;
      }
    }

    const description = this.getTextValue(detalleRecord, ['Itm_Des', 'itm_Des', 'itmDes', 'Material', 'material']).toLowerCase();
    return this.itemOptions.find((item) => item.description.toLowerCase() === description) ?? null;
  }

  private resolveUnidadOption(detalleRecord: DataRecord | null): PedidoDetalleUnidadOption | null {
    if (!detalleRecord) {
      return null;
    }

    const directId = this.getNumberValue(detalleRecord, ['Alm_Det_Uni_Med_Id', 'alm_Det_Uni_Med_Id', 'almDetUniMedId', 'Uni_Med_Id', 'uni_Med_Id', 'uniMedId']);

    if (directId) {
      const matchById = this.unidadOptions.find((item) => item.id === directId);

      if (matchById) {
        return matchById;
      }
    }

    const description = this.getTextValue(detalleRecord, ['Uni_Med_Des', 'uni_Med_Des', 'uniMedDes', 'Unidad', 'unidad']).toLowerCase();
    return this.unidadOptions.find((item) => item.description.toLowerCase() === description) ?? null;
  }

  private resolveProveedorId(detalleRecord: DataRecord | null, cabeceraRecord: DataRecord | null): number {
    const source = detalleRecord ?? cabeceraRecord ?? {};
    const directId = this.getNumberValue(source, ['Alm_Det_Prv_Id', 'alm_Det_Prv_Id', 'almDetPrvId', 'Prv_Id', 'prv_Id', 'prvId']);

    if (directId) {
      return directId;
    }

    const name = this.getTextValue(source, ['Prv_Nom', 'prv_Nom', 'prvNom']).toLowerCase();
    return this.proveedorOptions.find((item) => item.name.toLowerCase() === name)?.code ?? 0;
  }

  private mapAlmacen(item: DataRecord, index: number): AlmacenRow | null {
    const movimientoId = this.getNumberValue(item, ['Alm_Mov_Id', 'alm_Mov_Id', 'almMovId', 'id', 'Id']);

    if (!movimientoId) {
      return null;
    }

    const tipoIngresoId = this.getNumberValue(item, ['Alm_Tip_Ing', 'alm_Tip_Ing', 'almTipIng', 'Ing_Id', 'ing_Id', 'ingId']) ?? 0;
    const centroCostoId = this.getNumberValue(item, ['Alm_Cen_Cos', 'alm_Cen_Cos', 'almCenCos', 'Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId']) ?? 0;
    const solicitanteDocumento = this.getTextValue(item, [
      'Alm_Sol_Dni',
      'alm_Sol_Dni',
      'almSolDni',
      'Usr_Doc_Nro',
      'usr_Doc_Nro',
      'usrDocNro'
    ]);
    const tipoIngresoDescripcion = this.getTextValue(item, ['Ing_Des', 'ing_Des', 'ingDes', 'Alm_Tip_Ing_Des', 'alm_Tip_Ing_Des', 'almTipIngDes'])
      || this.resolveTipoIngresoDescripcion(tipoIngresoId)
      || `Tipo ${tipoIngresoId}`;
    const estadoAprobacion = this.resolveEstadoAprobacion(item);

    return {
      id: movimientoId || index + 1,
      movimientoId,
      tipoIngresoId,
      tipoIngreso: tipoIngresoDescripcion,
      ordenCompraId: this.getNumberValue(item, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId']) ?? 0,
      pedidoId: this.getNumberValue(item, ['Ped_Id', 'ped_Id', 'pedId', 'Ped_Cab_Id', 'ped_Cab_Id', 'pedCabId']) ?? 0,
      ubicacionId: this.getNumberValue(item, ['Alm_Ubi', 'alm_Ubi', 'almUbi', 'Ubi_Id', 'ubi_Id', 'ubiId']) ?? 0,
      centroCostoId,
      centroCosto: this.getTextValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes']) || this.resolveCentroCostoDescripcion(centroCostoId),
      solicitanteDocumento,
      almacen: this.getTextValue(item, ['Ubi_Des', 'ubi_Des', 'ubiDes']) || this.resolveUbicacionDescripcion(item),
      fechaRegistro: formatDisplayDate(this.getTextValue(item, ['Fec_Reg', 'fec_Reg', 'fecReg', 'Fecha', 'fecha'])) || '-',
      registradoPor: this.getTextValue(item, ['Usr_Nom', 'usr_Nom', 'usrNom', 'RegistradoPor', 'registradoPor']) || this.resolveSolicitanteNombre(solicitanteDocumento),
      estadoAprobacion
    };
  }

  private mapOrdenCompraPendienteAlmacen(item: DataRecord, index: number): OrdenCompraPendienteAlmacenRow | null {
    const ordenCompraId = this.getNumberValue(item, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId', 'id', 'Id']);

    if (!ordenCompraId) {
      return null;
    }

    return {
      id: ordenCompraId || index + 1,
      ordenCompraId,
      pedidoId: this.getNumberValue(item, ['Ord_Com_Ped_Id', 'ord_Com_Ped_Id', 'ordComPedId', 'Ped_Id', 'ped_Id', 'pedId']) ?? 0,
      numeroOrden: this.getTextValue(item, ['Ord_Num', 'ord_Num', 'ordNum', 'Num_Orden', 'num_Orden', 'numOrden'])
        || this.formatNumeroIngresoOrden(
          ordenCompraId,
          this.getTextValue(item, ['Tip_Ser_Des', 'tip_Ser_Des', 'tipSerDes'])
        ),
      pedidoCodigo: this.formatPedidoCodigo(
        this.getNumberValue(item, ['Ord_Com_Ped_Id', 'ord_Com_Ped_Id', 'ordComPedId', 'Ped_Id', 'ped_Id', 'pedId'])
      ),
      tipo: this.getTextValue(item, ['Tip_Ser_Des', 'tip_Ser_Des', 'tipSerDes']) || '-',
      fecha: formatDisplayDate(this.getTextValue(item, [
        'Fec_Reg',
        'fec_Reg',
        'fecReg',
        'Ord_Com_Fec',
        'ord_Com_Fec',
        'ordComFec',
        'Fecha',
        'fecha'
      ])) || '-',
      proveedorId: this.getNumberValue(item, ['Ord_Com_Prv', 'ord_Com_Prv', 'ordComPrv', 'Prv_Id', 'prv_Id', 'prvId']) ?? 0,
      proveedor: this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom']) || '-',
      proveedorRuc: this.getTextValue(item, ['Prv_Ruc', 'prv_Ruc', 'prvRuc', 'Ruc', 'ruc']) || '-',
      formaPago: this.getTextValue(item, ['For_Pag_Des', 'for_Pag_Des', 'forPagDes']) || '-',
      refObra: this.getTextValue(item, ['Ord_Com_Ref_Obr', 'ord_Com_Ref_Obr', 'ordComRefObr']) || '-',
      referencia: this.getTextValue(item, ['Ord_Com_Ref', 'ord_Com_Ref', 'ordComRef']) || '-',
      total: this.getDecimalValue(item, ['Ord_Com_Tot', 'ord_Com_Tot', 'ordComTot']) ?? 0,
      estado: this.resolveEstadoTexto(this.getTextValue(item, ['Flg_Est', 'flg_Est', 'flgEst']))
    };
  }

  private mapCabeceraIngresoOrden(
    item: DataRecord,
    fallback: OrdenCompraPendienteAlmacenRow
  ): OrdenCompraPendienteAlmacenRow {
    const ordenCompraId = this.getNumberValue(item, ['Ord_Com_Id', 'ord_Com_Id', 'ordComId']) ?? fallback.ordenCompraId;
    const pedidoId = this.getNumberValue(item, [
      'Ped_Cab_Id',
      'ped_Cab_Id',
      'pedCabId',
      'Ped_Id',
      'ped_Id',
      'pedId',
      'Ord_Com_Ped_Id',
      'ord_Com_Ped_Id',
      'ordComPedId'
    ]);

    return {
      ...fallback,
      id: ordenCompraId,
      ordenCompraId,
      pedidoId: pedidoId ?? fallback.pedidoId,
      numeroOrden: this.formatNumeroIngresoOrden(
        ordenCompraId,
        this.getTextValue(item, ['Tip_Ser_Des', 'tip_Ser_Des', 'tipSerDes']) || fallback.tipo
      ),
      pedidoCodigo: this.formatPedidoCodigo(pedidoId ?? fallback.pedidoId),
      tipo: this.getTextValue(item, ['Tip_Ser_Des', 'tip_Ser_Des', 'tipSerDes']) || fallback.tipo,
      fecha: formatDisplayDate(this.getTextValue(item, ['Fec_Reg', 'fec_Reg', 'fecReg'])) || fallback.fecha,
      proveedorId: this.getNumberValue(item, ['Ord_Com_Prv', 'ord_Com_Prv', 'ordComPrv', 'Prv_Id', 'prv_Id', 'prvId']) ?? fallback.proveedorId,
      proveedor: this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom']) || fallback.proveedor,
      proveedorRuc: this.getTextValue(item, ['Prv_Ruc', 'prv_Ruc', 'prvRuc', 'Ruc', 'ruc']) || fallback.proveedorRuc,
      formaPago: this.getTextValue(item, ['Tip_Ser_Des', 'tip_Ser_Des', 'tipSerDes']) || fallback.formaPago
    };
  }

  formatProveedorIngresoOrden(item: OrdenCompraPendienteAlmacenRow): string {
    return item.proveedorId > 0 ? `${item.proveedorId} - ${item.proveedor}` : item.proveedor;
  }

  private mapIngresoOrdenDetalle(item: DataRecord, index: number): IngresoOrdenDetalleRow | null {
    const pedidoDetalleId = this.getNumberValue(item, ['Ped_Det_Id', 'ped_Det_Id', 'pedDetId']) ?? 0;
    const itemId = this.getNumberValue(item, ['Ped_Cod_Itm', 'ped_Cod_Itm', 'pedCodItm', 'Itm_Id', 'itm_Id', 'itmId']) ?? 0;

    if (!pedidoDetalleId && !itemId) {
      return null;
    }

    const compra = this.getDecimalValue(item, ['Ped_Can', 'ped_Can', 'pedCan']) ?? 0;
    const ingresado = this.getDecimalValue(item, ['Can_Ing', 'can_Ing', 'canIng', 'Alm_Det_Can', 'alm_Det_Can', 'almDetCan', 'Ingresado', 'ingresado']) ?? 0;
    const pendiente = Math.max(compra - ingresado, 0);

    return {
      id: index + 1,
      pedidoDetalleId,
      itemId,
      itemCodigo: this.getTextValue(item, ['Itm_Cod', 'itm_Cod', 'itmCod']) || (itemId ? String(itemId) : '-'),
      itemDescripcion: this.getTextValue(item, ['Itm_Des', 'itm_Des', 'itmDes']) || '-',
      unidadId: this.getNumberValue(item, ['Ped_Uni_Med', 'ped_Uni_Med', 'pedUniMed']) ?? 0,
      unidad: this.getTextValue(item, ['Uni_Med_Abr', 'uni_Med_Abr', 'uniMedAbr', 'Uni_Med_Des', 'uni_Med_Des', 'uniMedDes']) || '-',
      centroCostoId: this.getNumberValue(item, ['Ped_Cen_Cos_Asg', 'ped_Cen_Cos_Asg', 'pedCenCosAsg']) ?? 0,
      centroCosto: this.getTextValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes']) || '-',
      compra,
      ingresado,
      pendiente,
      cantidadIngresar: this.isIngresoOrdenEditMode ? ingresado : null,
      seleccionado: this.isIngresoOrdenEditMode
    };
  }

  private formatPedidoCodigo(pedidoId: number | null): string {
    return pedidoId ? `P${pedidoId}` : '-';
  }

  private formatNumeroIngresoOrden(ordenId: number, tipo: string): string {
    if (!ordenId) {
      return '-';
    }

    const normalizedTipo = tipo.trim().toLowerCase();
    const prefijo = this.esOrdenServicio(normalizedTipo) ? 'OS' : 'OC';
    return `${prefijo}${ordenId}`;
  }

  private mapSolicitanteOption(item: DataRecord): AlmacenSolicitanteOption | null {
    const id = this.getNumberValue(item, [
      'Usr_Id',
      'usr_Id',
      'usrId',
      'id',
      'Id',
      'Usr_Doc_Nro',
      'usr_Doc_Nro',
      'usrDocNro',
      'Usr_Doc',
      'usr_Doc',
      'usrDoc',
      'Usr_Dni',
      'usr_Dni',
      'usrDni',
      'Doc_Nro',
      'doc_Nro',
      'docNro',
      'Dni',
      'dni'
    ]);
    const code = this.getTextValue(item, ['Usr_Cod', 'usr_Cod', 'usrCod']);
    const documentNumber = this.getTextValue(item, [
      'Usr_Doc_Nro',
      'usr_Doc_Nro',
      'usrDocNro',
      'Usr_Doc',
      'usr_Doc',
      'usrDoc',
      'Usr_Dni',
      'usr_Dni',
      'usrDni',
      'Doc_Nro',
      'doc_Nro',
      'docNro',
      'Dni',
      'dni'
    ]);
    const name = this.getTextValue(item, ['Usr_Nom', 'usr_Nom', 'usrNom']);

    if (!id || !name) {
      return null;
    }

    return {
      id,
      code: code || String(id),
      documentNumber,
      name
    };
  }

  private mapCentroCostoOption(item: DataRecord): AlmacenCentroCostoOption | null {
    const id = this.getNumberValue(item, [
      'Cen_Cos_Id',
      'cen_Cos_Id',
      'cenCosId',
      'Cen_Cos_Cod',
      'cen_Cos_Cod',
      'cenCosCod',
      'codigo',
      'Codigo',
      'id',
      'Id'
    ]);
    const description = this.getTextValue(item, [
      'Cen_Cos_Des',
      'cen_Cos_Des',
      'cenCosDes',
      'descripcion',
      'Descripcion',
      'Cen_Cos_Nom',
      'cen_Cos_Nom',
      'cenCosNom'
    ]);

    if (!id || !description) {
      return null;
    }

    return {
      id,
      code: this.getTextValue(item, ['Cen_Cos_Cod', 'cen_Cos_Cod', 'cenCosCod', 'codigo', 'Codigo']) || String(id),
      description
    };
  }

  private mapItemOption(item: DataRecord): PedidoDetalleItemOption | null {
    const id = this.getNumberValue(item, [
      'Itm_Id',
      'itm_Id',
      'itmId',
      'id',
      'Id'
    ]);
    const description = this.getTextValue(item, [
      'Itm_Des',
      'itm_Des',
      'itmDes',
      'descripcion',
      'Descripcion',
      'Itm_Nom',
      'itm_Nom',
      'itmNom'
    ]);

    if (!id || !description) {
      return null;
    }

    return {
      id,
      code: String(id),
      description,
      groupDescription: this.getTextValue(item, ['Grp_Des', 'grp_Des', 'grpDes']) || 'Material'
    };
  }

  private mapUnidadOption(item: DataRecord): PedidoDetalleUnidadOption | null {
    const id = this.getNumberValue(item, [
      'Uni_Med_Id',
      'uni_Med_Id',
      'uniMedId',
      'Uni_Med_Cod',
      'uni_Med_Cod',
      'uniMedCod',
      'codigo',
      'Codigo',
      'id',
      'Id'
    ]);
    const description = this.getTextValue(item, [
      'Uni_Med_Des',
      'uni_Med_Des',
      'uniMedDes',
      'descripcion',
      'Descripcion',
      'Uni_Med_Nom',
      'uni_Med_Nom',
      'uniMedNom'
    ]);

    if (!id || !description) {
      return null;
    }

    return {
      id,
      code: this.getTextValue(item, ['Uni_Med_Cod', 'uni_Med_Cod', 'uniMedCod', 'codigo', 'Codigo']) || String(id),
      description,
      abbreviation: this.getTextValue(item, ['Uni_Med_Abr', 'uni_Med_Abr', 'uniMedAbr']) || description
    };
  }

  private mapUbicacionOption(item: DataRecord): CatalogoNumeroOption | null {
    const id = this.getNumberValue(item, ['Ubi_Id', 'ubi_Id', 'ubiId', 'id', 'Id']);
    const description = this.getTextValue(item, ['Ubi_Des', 'ubi_Des', 'ubiDes', 'descripcion', 'Descripcion']);

    if (!id || !description) {
      return null;
    }

    return {
      codigo: id,
      descripcion: description
    };
  }

  private mapProveedorOption(item: DataRecord): ProviderRecord | null {
    const code = this.getNumberValue(item, ['Prv_Id', 'prv_Id', 'prvId', 'id', 'Id']);
    const name = this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom', 'Proveedor', 'proveedor']);

    if (!code || !name) {
      return null;
    }

    return {
      code,
      name,
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

  private resolveEstadoAprobacion(item: DataRecord): string {
    const text = this.getTextValue(item, [
      'Flg_Est_Apr_Des',
      'flg_Est_Apr_Des',
      'flgEstAprDes',
      'EstadoAprobacion',
      'estadoAprobacion',
      'Flg_Est_Apr',
      'flg_Est_Apr',
      'flgEstApr'
    ]);

    if (text) {
      return text;
    }

    const code = this.getTextValue(item, ['Flg_Est_Apr', 'flg_Est_Apr', 'flgEstApr']).toUpperCase();

    switch (code) {
      case 'I':
        return 'Ingresado';
      case 'P':
        return 'Pendiente';
      case 'C':
        return 'Cerrado';
      default:
        return '-';
    }
  }

  private resolveTipoIngresoDescripcion(tipoIngresoId: number): string {
    return this.tipoIngresoOptions.find((option) => option.codigo === tipoIngresoId)?.descripcion || '-';
  }

  private resolveCentroCostoDescripcion(centroCostoId: number): string {
    if (!centroCostoId) {
      return '-';
    }

    return this.centroCostoOptions.find((item) => item.id === centroCostoId)?.description || String(centroCostoId);
  }

  private resolveSolicitanteNombre(documento: string): string {
    const normalizedDocumento = documento.trim();

    if (!normalizedDocumento) {
      return '-';
    }

    const normalizedValue = normalizedDocumento.toLowerCase();
    return this.solicitanteOptions.find((item) =>
      item.code.trim().toLowerCase() === normalizedValue
      || item.documentNumber.trim().toLowerCase() === normalizedValue
    )?.name || normalizedDocumento;
  }

  private resolveUbicacionDescripcion(item: DataRecord): string {
    const ubicacionId = this.getTextValue(item, ['Alm_Ubi', 'alm_Ubi', 'almUbi']);

    switch (ubicacionId) {
      case '1':
        return 'BASE';
      case '2':
        return 'OBRA';
      default:
        return '-';
    }
  }

  private refrescarGridAlmacenConCatalogos(): void {
    if (!this.almacenes.length) {
      return;
    }

    this.almacenes = this.almacenes.map((item) => ({
      ...item,
      tipoIngreso: item.tipoIngreso && item.tipoIngreso !== `Tipo ${item.tipoIngresoId}`
        ? item.tipoIngreso
        : this.resolveTipoIngresoDescripcion(item.tipoIngresoId),
      centroCosto: item.centroCosto && item.centroCosto !== '-' ? item.centroCosto : this.resolveCentroCostoDescripcion(item.centroCostoId),
      registradoPor: item.registradoPor && item.registradoPor !== '-' ? item.registradoPor : this.resolveSolicitanteNombre(item.solicitanteDocumento)
    }));
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((value): value is DataRecord => this.isDataRecord(value));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = [
      'almacen',
      'Almacen',
      'movimientos',
      'Movimientos',
      'ordenCompra',
      'OrdenCompra',
      'ordenesCompra',
      'OrdenesCompra',
      'data',
      'Data',
      'result',
      'Result',
      'elements',
      'Elements'
    ];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is DataRecord => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private extractAlmacenMovimientoIdFromResponse(response: unknown): number | null {
    if (typeof response === 'number' && Number.isInteger(response) && response > 0) {
      return response;
    }

    if (!this.isDataRecord(response)) {
      return null;
    }

    const directId = this.getNumberValue(response, ['Alm_Mov_Id', 'alm_Mov_Id', 'almMovId', 'Id', 'id']);

    if (directId) {
      return directId;
    }

    const dataAsId = this.getNumberValue(response, ['data', 'Data']);

    if (dataAsId) {
      return dataAsId;
    }

    const nestedKeys = ['almacen', 'Almacen', 'data', 'Data', 'result', 'Result', 'element', 'Element'];

    for (const key of nestedKeys) {
      const nestedValue = response[key];

      if (Array.isArray(nestedValue)) {
        for (const item of nestedValue) {
          if (!this.isDataRecord(item)) {
            continue;
          }

          const nestedId = this.getNumberValue(item, ['Alm_Mov_Id', 'alm_Mov_Id', 'almMovId', 'Id', 'id']);

          if (nestedId) {
            return nestedId;
          }
        }
      }

      if (!this.isDataRecord(nestedValue)) {
        continue;
      }

      const nestedId = this.getNumberValue(nestedValue, ['Alm_Mov_Id', 'alm_Mov_Id', 'almMovId', 'Id', 'id']);

      if (nestedId) {
        return nestedId;
      }
    }

    return null;
  }

  private assertSuccessfulResponse(response: unknown, fallbackMessage: string): void {
    if (!this.isDataRecord(response)) {
      return;
    }

    if (response['success'] === false || response['Success'] === false) {
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

      if (Number.isInteger(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private getDecimalValue(item: DataRecord, keys: string[]): number | null {
    for (const key of keys) {
      const rawValue = item[key];
      const value = Number(rawValue);

      if (rawValue !== null && rawValue !== undefined && Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private resolveEstadoTexto(value: string): string {
    const code = value.trim().toUpperCase();

    switch (code) {
      case 'A':
        return 'Activo';
      case 'I':
        return 'Inactivo';
      default:
        return code || '-';
    }
  }

  private isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getSelectedSolicitante(): AlmacenSolicitanteOption | null {
    const solicitanteCode = String(this.ingresoDirectoForm.controls['solicitanteId'].value || '').trim().toLowerCase();
    return this.solicitanteOptions.find((item) => item.code.trim().toLowerCase() === solicitanteCode) ?? null;
  }

  private getInvalidIngresoDirectoControls(): string[] {
    return Object.entries(this.ingresoDirectoForm.controls)
      .filter(([, control]) => control.enabled && control.invalid)
      .map(([name]) => name);
  }

  private parseDateValue(value: string): Date {
    if (!value) {
      return this.getTodayDateValue();
    }

    const normalizedValue = formatDateRequestValue(value);

    if (!normalizedValue) {
      return this.getTodayDateValue();
    }

    const [year, month, day] = normalizedValue.split('-').map((part) => Number(part));

    if (!year || !month || !day) {
      return this.getTodayDateValue();
    }

    return new Date(year, month - 1, day);
  }

  private getTodayDateValue(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  private getCurrentOperator(): string {
    const currentUser = this.authService.getCurrentUser().trim();
    return currentUser || 'sistemas';
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
