import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService, RegistrarAsignacionDetalleRequest, RegistrarAsignacionRequest } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';

type DataRecord = Record<string, unknown>;

interface AsignacionDetalleFormValue {
  detailId: number;
  materialId: number;
  cantidad: number;
  serie: string;
  observaciones: string;
  markedForDelete: boolean;
}

@Component({
  selector: 'app-asignacion-page',
  templateUrl: './asignacion-page.component.html',
  styleUrls: ['./asignacion-page.component.scss']
})
export class AsignacionPageComponent implements OnInit {
  readonly form: FormGroup;
  usuarios: Array<{ codigo: string; nombre: string }> = [];
  centrosCosto: Array<{ id: number; descripcion: string }> = [];
  materiales: Array<{ id: number; descripcion: string; unidadId: number; unidadDescripcion: string; stock: number }> = [];
  asignaciones: DataRecord[] = [];
  mostrarEditorAsignacion = false;
  editandoAsignacionId: number | null = null;
  isLoadingOptions = false;
  isLoadingCentroCosto = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  centroCostoMessage = '';
  private pendingStockRequests = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.form = this.formBuilder.group({
      fecha: [this.getToday(), Validators.required],
      usuario: ['', Validators.required],
      centroCosto: [{ value: '', disabled: true }, Validators.required],
      materiales: this.formBuilder.array([this.crearMaterialGroup()])
    });
  }

  ngOnInit(): void {
    this.cargarOpciones();
    this.cargarAsignaciones();
  }

  nuevaAsignacion(): void {
    this.editandoAsignacionId = null;
    this.form.reset({ fecha: this.getToday(), usuario: '', centroCosto: '' });
    this.resetMateriales();
    this.errorMessage = '';
    this.successMessage = '';
    this.centroCostoMessage = '';
    this.mostrarEditorAsignacion = true;
  }

  onUsuarioChange(): void {
    const usrCod = String(this.form.controls['usuario'].value || '').trim();
    this.form.controls['centroCosto'].setValue('');
    this.centroCostoMessage = '';

    if (!usrCod) {
      return;
    }

    this.isLoadingCentroCosto = true;
    this.apiService.getConsultaDatosUsuario({ Usr_Cod: usrCod }).subscribe({
      next: (response: unknown) => {
        if (String(this.form.controls['usuario'].value || '').trim() !== usrCod) {
          return;
        }

        const record = this.extractRecords(response)[0] ?? null;
        const centroCostoId = record
          ? Number(this.text(record, ['Usr_Cen_Cos_Id', 'usr_Cen_Cos_Id', 'usrCenCosId', 'Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId']))
          : 0;
        const centroCostoDescripcion = record
          ? this.text(record, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes'])
          : '';

        if (Number.isInteger(centroCostoId) && centroCostoId > 0) {
          if (!this.centrosCosto.some((centro) => centro.id === centroCostoId)) {
            this.centrosCosto = [
              ...this.centrosCosto,
              { id: centroCostoId, descripcion: centroCostoDescripcion || `Centro de costo ${centroCostoId}` }
            ];
          }
          this.form.controls['centroCosto'].setValue(centroCostoId);
          this.centroCostoMessage = '';
          this.actualizarStockMateriales();
        } else {
          this.centroCostoMessage = 'El usuario seleccionado no tiene un centro de costo asociado.';
        }

        this.isLoadingCentroCosto = false;
      },
      error: (error: unknown) => {
        console.error('No se pudo consultar el centro de costo del usuario:', error);
        if (String(this.form.controls['usuario'].value || '').trim() === usrCod) {
          this.centroCostoMessage = 'No se pudo cargar el centro de costo del usuario.';
          this.isLoadingCentroCosto = false;
        }
      }
    });
  }

  cerrarEditor(): void {
    if (!this.isSaving) {
      this.mostrarEditorAsignacion = false;
      this.errorMessage = '';
      this.successMessage = '';
      this.centroCostoMessage = '';
    }
  }

  editarAsignacion(asignacion: DataRecord): void {
    this.editandoAsignacionId = Number(asignacion['Asg_Id'] || asignacion['asg_Id']);
    this.mostrarEditorAsignacion = true;
    const id = Number(asignacion['Asg_Id'] || asignacion['asg_Id']);
    if (id <= 0) return;
    forkJoin({ cabecera: this.apiService.getListarAsignacionModificar(id), detalles: this.apiService.getListarDetallesXAsignacion(id) }).subscribe({
      next: ({ cabecera, detalles }) => {
        const cab = this.extractRecords(cabecera)[0] || asignacion;
        this.form.patchValue({ fecha: String(cab['Asg_Fec'] || cab['asg_Fec'] || '').slice(0, 10), usuario: cab['Asg_Usr'] || cab['asg_Usr'] || '' });
        this.onUsuarioChange();
        const rows = this.extractRecords(detalles)
          .filter((detail) => this.text(detail, ['Flg_Est', 'flg_Est', 'flgEst']).toUpperCase() !== 'I');
        console.log('[Asignacion] Detalles recibidos para edición:', detalles, rows);
        while (this.materialesForm.length) this.materialesForm.removeAt(0);
        rows.forEach((detail, index) => {
          this.materialesForm.push(this.crearMaterialGroup());
          const row = this.materialRows[index];
          row.patchValue({ detailId: Number(detail['Asg_Det_Id'] || detail['asg_Det_Id']), materialId: Number(detail['Asg_Det_Itm_Id'] || detail['asg_Det_Itm_Id']), cantidad: Number(detail['Asg_Det_Can'] || detail['asg_Det_Can'] || 0), serie: detail['Asg_Det_Ser'] || detail['asg_Det_Ser'] || '', observaciones: detail['Asg_Det_Obs'] || detail['asg_Det_Obs'] || '', markedForDelete: false });
          this.onMaterialChange(index);
        });
        if (!rows.length) this.materialesForm.push(this.crearMaterialGroup());
      },
      error: (error: unknown) => { this.errorMessage = this.resolveError(error); }
    });
  }

  get materialRows(): FormGroup[] {
    return this.materialesForm.controls as FormGroup[];
  }

  agregarMaterial(): void {
    this.materialesForm.push(this.crearMaterialGroup());
  }

  quitarMaterial(index: number): void {
    const row = this.materialRows[index];

    if (!row) {
      return;
    }

    const detailId = Number(row.controls['detailId'].value || 0);

    if (detailId > 0) {
      row.controls['markedForDelete'].setValue(!row.controls['markedForDelete'].value);
      return;
    }

    if (this.materialesForm.length > 1) {
      this.materialesForm.removeAt(index);
    }
  }

  puedeQuitarMaterial(row: FormGroup): boolean {
    return Number(row.controls['detailId'].value || 0) > 0 || this.materialRows.length > 1;
  }

  onMaterialChange(index: number): void {
    const row = this.materialRows[index];
    const materialId = Number(row?.controls['materialId'].value);
    const material = this.materiales.find((item) => item.id === materialId);
    console.log('[Asignacion] Material seleccionado:', {
      materialId,
      material,
      canStk: material?.stock,
      controlesAntes: row?.getRawValue()
    });
    row?.patchValue({
      unidadId: material?.unidadId ?? 0,
      unidadDescripcion: material?.unidadDescripcion ?? '',
      disponible: material?.stock ?? 0
    });
    row?.controls['disponible'].setValue(material?.stock ?? 0, { emitEvent: false });
    console.log('[Asignacion] Disponible asignado:', row?.getRawValue());
    this.cargarStockMaterial(index);
  }

  getMaterialesFiltrados(row: FormGroup): Array<{ id: number; descripcion: string; unidadId: number; unidadDescripcion: string; stock: number }> {
    const search = String(row.controls['materialSearch'].value || '').trim().toLowerCase();

    if (!search) {
      return this.materiales;
    }

    return this.materiales.filter((material) =>
      String(material.id).includes(search) || material.descripcion.toLowerCase().includes(search)
    );
  }

  onMaterialSelectOpened(row: FormGroup, opened: boolean): void {
    if (opened) {
      row.controls['materialSearch'].setValue('');
    }
  }

  guardar(): void {
    if (this.isSaving || this.isLoadingOptions || this.errorMessage || this.centroCostoMessage || this.pendingStockRequests > 0) { console.log('[Asignacion] Guardado bloqueado por validación/estado:', { errorMessage: this.errorMessage, centroCostoMessage: this.centroCostoMessage, pendingStockRequests: this.pendingStockRequests }); this.form.markAllAsTouched(); return; }
    if (this.form.controls['fecha'].invalid || this.form.controls['usuario'].invalid) { this.errorMessage = 'Completa correctamente los datos de la asignación.'; this.form.markAllAsTouched(); return; }
    const centroCostoId = Number(this.form.controls['centroCosto'].value);
    if (!Number.isInteger(centroCostoId) || centroCostoId <= 0) { this.centroCostoMessage = 'El usuario seleccionado no tiene un centro de costo asociado.'; return; }
    const detalles: AsignacionDetalleFormValue[] = this.materialRows.map((row) => ({
      detailId: Number(row.controls['detailId'].value || 0),
      materialId: Number(row.controls['materialId'].value),
      cantidad: Number(row.controls['cantidad'].value),
      serie: String(row.controls['serie'].value || '').trim(),
      observaciones: String(row.controls['observaciones'].value || '').trim(),
      markedForDelete: Boolean(row.controls['markedForDelete'].value)
    }));
    const detallesActivos = detalles.filter((detalle) => !detalle.markedForDelete);
    if (!this.editandoAsignacionId && detallesActivos.length === 0) { this.errorMessage = 'Debe ingresar al menos un material válido.'; this.form.markAllAsTouched(); return; }
    if (detallesActivos.some((d) => !Number.isInteger(d.materialId) || d.materialId <= 0 || !Number.isFinite(d.cantidad) || d.cantidad <= 0)) { this.errorMessage = 'Completa correctamente el material y la cantidad solicitada.'; this.form.markAllAsTouched(); return; }
    const payload: RegistrarAsignacionRequest = { Asg_Fec: `${this.form.controls['fecha'].value}T00:00:00`, Asg_Usr: String(this.form.controls['usuario'].value), Asg_Usr_Cen_Cos: centroCostoId, Usr_Reg: this.authService.getCurrentUser().trim() };
    console.log('[Asignacion] Payload cabecera:', payload);
    console.log('[Asignacion] Detalles preparados:', detalles);
    this.isSaving = true; this.errorMessage = ''; this.successMessage = '';
    if (this.editandoAsignacionId) { this.actualizarAsignacion(payload, detalles); return; }
    this.apiService.postRegistrarAsignacion(payload).subscribe({
      next: (response: unknown) => {
        if (!this.isSuccessfulResponse(response)) { this.errorMessage = this.text((response || {}) as DataRecord, ['Message', 'message']) || 'No se pudo registrar la asignacion.'; this.isSaving = false; return; }
        const asignacionId = this.number((response || {}) as DataRecord, ['Data', 'data', 'AsignacionId', 'asignacionId']);
        if (!Number.isInteger(asignacionId) || asignacionId <= 0) { this.errorMessage = 'La cabecera no devolvió el identificador de asignación.'; this.isSaving = false; return; }
        this.registrarDetalles(asignacionId, detalles, 0);
      },
      error: (error: unknown) => { this.errorMessage = this.resolveError(error); this.isSaving = false; }
    });
  }

  private actualizarAsignacion(payload: RegistrarAsignacionRequest, detalles: AsignacionDetalleFormValue[]): void {
    const cabecera = { ...payload, Asg_Id: this.editandoAsignacionId, Usr_Mod: this.authService.getCurrentUser().trim() };
    this.apiService.patchActualizarAsignacion(cabecera).subscribe({ next: (r) => { if (!this.isSuccessfulResponse(r)) { this.errorMessage = this.text((r || {}) as DataRecord, ['Message','message']) || 'No se pudo actualizar.'; this.isSaving = false; return; } this.actualizarDetalles(detalles, 0); }, error: (e) => { this.errorMessage = this.resolveError(e); this.isSaving = false; } });
  }

  private actualizarDetalles(detalles: AsignacionDetalleFormValue[], index: number): void {
    if (index >= detalles.length) { this.successMessage = 'Asignación actualizada correctamente.'; this.isSaving = false; this.mostrarEditorAsignacion = false; this.cargarAsignaciones(); return; }
    const d = detalles[index];
    const id = d.detailId;

    if (d.markedForDelete) {
      if (id <= 0) {
        this.actualizarDetalles(detalles, index + 1);
        return;
      }

      this.apiService.patchEliminarAsignacionDetalle({ Asg_Det_Id: id }).subscribe({
        next: (response: unknown) => {
          if (!this.isSuccessfulResponse(response)) {
            this.errorMessage = this.text((response || {}) as DataRecord, ['Message', 'message']) || 'No se pudo eliminar el detalle de la asignación.';
            this.isSaving = false;
            return;
          }
          this.actualizarDetalles(detalles, index + 1);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveError(error);
          this.isSaving = false;
        }
      });
      return;
    }

    const body: any = { Asg_Det_Id: id || undefined, Asg_Det_Itm_Id: d.materialId, Asg_Det_Can: d.cantidad, Asg_Det_Ser: d.serie || null, Asg_Det_Obs: d.observaciones || null };
    const call = id ? this.apiService.patchActualizarAsignacionDetalle(body) : this.apiService.postRegistrarAsignacionDetalle({ ...body, Asg_Id: this.editandoAsignacionId });
    call.subscribe({ next: (r) => { if (!this.isSuccessfulResponse(r)) { this.errorMessage = 'No se pudo actualizar el detalle.'; this.isSaving = false; return; } this.actualizarDetalles(detalles, index + 1); }, error: (e) => { this.errorMessage = this.resolveError(e); this.isSaving = false; } });
  }

  private registrarDetalles(asignacionId: number, detalles: Array<{ materialId: number; cantidad: number; serie: string; observaciones: string }>, index: number): void {
    if (index >= detalles.length) { this.successMessage = 'Asignacion registrada correctamente.'; this.form.reset({ fecha: this.getToday(), usuario: '', centroCosto: '' }); this.resetMateriales(); this.centroCostoMessage = ''; this.isSaving = false; this.mostrarEditorAsignacion = false; this.cargarAsignaciones(); return; }
    const d = detalles[index];
    const payload: RegistrarAsignacionDetalleRequest = { Asg_Id: asignacionId, Asg_Det_Itm_Id: d.materialId, Asg_Det_Can: d.cantidad, Asg_Det_Ser: d.serie || null, Asg_Det_Obs: d.observaciones || null };
    console.log(`[Asignacion] Payload detalle ${index + 1}:`, payload);
    this.apiService.postRegistrarAsignacionDetalle(payload).subscribe({ next: (response: unknown) => { if (!this.isSuccessfulResponse(response)) { this.errorMessage = this.text((response || {}) as DataRecord, ['Message', 'message']) || 'No se pudo registrar el detalle de asignación.'; this.isSaving = false; return; } this.registrarDetalles(asignacionId, detalles, index + 1); }, error: (error: unknown) => { this.errorMessage = this.resolveError(error); this.isSaving = false; } });
  }

  private cargarOpciones(): void {
    this.isLoadingOptions = true;
    forkJoin({
      usuarios: this.apiService.getListarUsuarioActivo({ Flg_Est: 'A' }),
      centros: this.apiService.getListarCentroCostoActivo({ Flg_Est: 'A' }),
      materiales: this.apiService.getListarItem({ Flg_Est: 'A' })
    }).subscribe({
      next: ({ usuarios, centros, materiales }) => {
        this.usuarios = this.extractRecords(usuarios).map((item) => ({
          codigo: this.text(item, ['Usr_Cod', 'usr_Cod', 'usrCod']),
          nombre: this.text(item, ['Usr_Nom', 'usr_Nom', 'usrNom'])
        })).filter((item) => !!item.codigo);
        this.centrosCosto = this.extractRecords(centros).map((item) => ({
          id: Number(this.text(item, ['Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId'])),
          descripcion: this.text(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes'])
        })).filter((item) => Number.isInteger(item.id) && item.id > 0);
        this.materiales = this.extractRecords(materiales).map((item) => ({
          id: Number(this.text(item, ['Itm_Id', 'itm_Id', 'itmId', 'id', 'Id'])),
          descripcion: this.text(item, ['Itm_Des', 'itm_Des', 'itmDes', 'descripcion', 'Descripcion']),
          unidadId: Number(this.text(item, ['Uni_Med_Id', 'uni_Med_Id', 'uniMedId'])),
          unidadDescripcion: this.text(item, ['Uni_Med_Des', 'uni_Med_Des', 'uniMedDes']),
          stock: this.number(item, ['Can_Stk', 'can_Stk', 'CanStk', 'canStk', 'Stock', 'stock'])
        })).filter((item) => Number.isInteger(item.id) && item.id > 0);
        this.isLoadingOptions = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los usuarios y centros de costo.';
        this.isLoadingOptions = false;
      }
    });
  }

  private cargarAsignaciones(): void {
    this.apiService.getListarAsignacion().subscribe({
      next: (response: unknown) => { this.asignaciones = this.extractRecords(response); },
      error: () => { this.asignaciones = []; }
    });
  }

  private get materialesForm(): FormArray {
    return this.form.controls['materiales'] as FormArray;
  }

  private crearMaterialGroup(): FormGroup {
    return this.formBuilder.group({
      materialId: [0, [Validators.required, Validators.min(1)]],
      materialSearch: [''],
      unidadId: [{ value: 0, disabled: true }],
      unidadDescripcion: [{ value: '', disabled: true }],
      disponible: [{ value: 0, disabled: true }],
      reservado: [{ value: 0, disabled: true }],
      cantidad: [1, [Validators.required, Validators.min(0.001)]],
      serie: [''],
      observaciones: [''],
      detailId: [0],
      markedForDelete: [false]
    });
  }

  private resetMateriales(): void {
    while (this.materialesForm.length) {
      this.materialesForm.removeAt(0);
    }
    this.materialesForm.push(this.crearMaterialGroup());
  }

  private actualizarStockMateriales(): void {
    this.materialRows.forEach((_, index) => this.cargarStockMaterial(index));
  }

  private cargarStockMaterial(index: number): void {
    const row = this.materialRows[index];
    const centroCostoId = Number(this.form.controls['centroCosto'].value);
    const materialId = Number(row?.controls['materialId'].value);

    if (!row || centroCostoId <= 0 || materialId <= 0) {
      row?.patchValue({ reservado: 0 });
      return;
    }

    this.pendingStockRequests++;
    forkJoin({
      stockResponse: this.apiService.getListarStocksItems(centroCostoId, materialId).pipe(
        catchError((error: unknown) => {
          console.error('No se pudo cargar el stock disponible del material:', error);
          return of(null);
        })
      ),
      reservadoResponse: this.apiService.getObtenerStockReservadoAsignacion(centroCostoId, materialId).pipe(
        catchError((error: unknown) => {
          console.error('No se pudo cargar el stock reservado de la asignación:', error);
          return of(null);
        })
      )
    }).subscribe({
      next: ({ stockResponse, reservadoResponse }) => {
        if (
          Number(this.form.controls['centroCosto'].value) !== centroCostoId ||
          Number(row.controls['materialId'].value) !== materialId
        ) {
          return;
        }

        const stockRecord = this.extractRecords(stockResponse)[0];
        const reservadoRecord = this.extractRecords(reservadoResponse)[0] ?? {};
        row.patchValue({
          disponible: stockRecord
            ? this.number(stockRecord, ['Disponible', 'disponible'])
            : this.materiales.find((item) => item.id === materialId)?.stock ?? 0,
          reservado: this.number(reservadoRecord, ['Asg_Det_Can', 'asg_Det_Can', 'asgDetCan'])
        });
      },
      complete: () => this.pendingStockRequests = Math.max(0, this.pendingStockRequests - 1)
    });
  }

  private getToday(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is DataRecord => this.isRecord(item));
    }
    if (!this.isRecord(response)) {
      return [];
    }
    for (const key of ['Elements', 'elements', 'Data', 'data', 'Result', 'result']) {
      if (Array.isArray(response[key])) {
        return (response[key] as unknown[]).filter((item): item is DataRecord => this.isRecord(item));
      }
    }
    return [];
  }

  private text(item: DataRecord, keys: string[]): string {
    for (const key of keys) {
      if (item[key] !== null && item[key] !== undefined && String(item[key]).trim()) {
        return String(item[key]).trim();
      }
    }
    return '';
  }

  formatFecha(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  }

  private number(item: DataRecord, keys: string[]): number {
    for (const key of keys) {
      const raw = item[key];
      if (raw !== null && raw !== undefined && raw !== '') {
        const value = Number(raw);
        if (Number.isFinite(value)) return value;
      }
    }
    return 0;
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse && this.isRecord(error.error)) {
      return this.text(error.error, ['Message', 'message', 'title']) || 'No se pudo registrar la asignacion.';
    }
    return 'No se pudo registrar la asignacion.';
  }

  private isRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null;
  }

  private isSuccessfulResponse(response: unknown): boolean {
    return this.isRecord(response) && (response['Success'] === true || response['success'] === true);
  }
}
