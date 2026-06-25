import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ConfirmacionAccionDialogComponent } from '../confirmacion-accion-dialog.component';

// ── Interfaces de combos ──────────────────────────────────────────
interface InsCliente      { Cliente_Id: number;     Cliente_Nombre: string; }
interface InsSubEstacion  { Subestacion_Id: number; Subestacion_Nombre: string; }
interface InsSubContrata  { SubContrata_Id: number; SubContrata_Nombre: string; }
interface InsJefe         { Jefe_Id: number; Jef_Nombre: string; Jef_DNI: string; Cen_Cos_Id: number; Cen_Cos_Des: string; }
interface TipoInspeccion  { Tipo_Id: number; Tipo_Nombre: string; }

type ComboKey = 'cliente' | 'subestacion' | 'subcontrata' | 'jefe' | 'tipoInspeccion';

interface SupervisorDatos { nombre: string; cargo: string; area: string; }

@Component({
  selector: 'app-inspeccion-prevencion',
  templateUrl: './inspeccion-prevencion.component.html',
  styleUrls: ['./inspeccion-prevencion.component.scss'],
})
export class InspeccionPrevencionComponent implements OnInit {
  @Output() volver = new EventEmitter<void>();

  @Input() modoEdicion = false;
  @Input() inspeccionId: number | null = null;

  supervisor: SupervisorDatos = { nombre: '', cargo: '', area: '' };

  readonly form: FormGroup;

  // ── Listas de combos ─────────────────────────────────────────────
  clientes:        InsCliente[]      = [];
  subestaciones:   InsSubEstacion[]  = [];
  subContratas:    InsSubContrata[]  = [];
  jefes:           InsJefe[]         = [];
  tiposInspeccion: TipoInspeccion[]  = [];

  // ── Seleccionados ────────────────────────────────────────────────
  clienteSeleccionado:        InsCliente     | null = null;
  subestacionSeleccionada:    InsSubEstacion | null = null;
  subContrataSeleccionada:    InsSubContrata | null = null;
  jefeSeleccionado:           InsJefe        | null = null;
  tipoInspeccionSeleccionado: TipoInspeccion | null = null;

  // ── Estado de carga ──────────────────────────────────────────────
  cargandoSubestaciones = false;
  cargandoSubContratas  = false;
  cargandoJefes         = false;
  cargandoTipos         = false;
  cargandoEdicion       = false;
  guardando             = false;

  // ── Estado de combos ─────────────────────────────────────────────
  comboOpen: Record<ComboKey, boolean> = {
    cliente: false, subestacion: false, subcontrata: false,
    jefe: false, tipoInspeccion: false,
  };
  comboSearch: Record<ComboKey, string> = {
    cliente: '', subestacion: '', subcontrata: '',
    jefe: '', tipoInspeccion: '',
  };

  /** Datos base cargados al editar (para el método aplicarDatosEdicion) */
  private edicionBase: Record<string, unknown> | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly dialog: MatDialog,
  ) {
    this.form = this.fb.group({
      actividadTarea:       ['', Validators.required],
      ordenTrabajo:         [''],
      procedimientoTrabajo: [''],
      estado:               ['A'],
    });
  }

  ngOnInit(): void {
    this.cargarDatosSupervisor();
    this.cargarClientes();
    this.cargarSubContratas();
    this.cargarJefes();
    this.cargarTiposInspeccion();

    // Si viene en modo edición, cargar los datos del registro
    if (this.modoEdicion && this.inspeccionId) {
      this.cargarDatosEdicion(this.inspeccionId);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target as Node | null) || !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeCombos();
    }
  }

  // ── Navegación ───────────────────────────────────────────────────
  retroceder(): void {
    const dialogRef = this.dialog.open(ConfirmacionAccionDialogComponent, {
      width: '460px',
      disableClose: true,
      data: {
        titulo: this.modoEdicion ? 'Cancelar edición' : 'Cancelar inspección',
        mensaje: this.modoEdicion
          ? 'Se cancelará la edición de la inspección de prevención. Esta acción cerrará el formulario actual.'
          : 'Se cancelará el registro de la nueva inspección. Esta acción cerrará el formulario actual.',
        textoConfirmar: 'Confirmar cancelación',
        textoCancelar: 'Volver',
        tipo: 'normal',
      },
    });
    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) { this.volver.emit(); }
    });
  }

  // ── Guardar / Actualizar ─────────────────────────────────────────
  guardar(): void {
    if (this.modoEdicion) {
      this.actualizar();
      return;
    }
    this.registrar();
  }

  private registrar(): void {
    if (this.guardando) { return; }

    if (!this.validarFormulario()) { return; }

    const usrCod = (this.authService.getCurrentUser?.() ?? '').trim();

    const payload = {
      Usr_Cod:               usrCod,
      Cliente_Id:            this.clienteSeleccionado!.Cliente_Id,
      Subestacion_Id:        this.subestacionSeleccionada!.Subestacion_Id,
      SubContrata_Id:        this.subContrataSeleccionada!.SubContrata_Id,
      Jefe_Id:               this.jefeSeleccionado!.Jefe_Id,
      Actividad:             this.form.get('actividadTarea')?.value ?? '',
      Orden_Trabajo:         this.form.get('ordenTrabajo')?.value ?? '',
      Procedimiento_Trabajo: this.form.get('procedimientoTrabajo')?.value ?? '',
      Tipo_Id:               this.tipoInspeccionSeleccionado!.Tipo_Id,
      Usr_Reg:               usrCod,
    };

    this.guardando = true;
    this.apiService.postInsertarPrevencion(payload).subscribe({
      next: () => {
        this.guardando = false;
        // Sin alert: volver directamente a la tabla
        this.volver.emit();
      },
      error: (err: unknown) => {
        this.guardando = false;
        console.error('Error al guardar inspección de Prevención:', err);
        alert('Ocurrió un error al guardar. Intente nuevamente.');
      },
    });
  }

  private actualizar(): void {
    if (this.guardando) { return; }
    if (!this.inspeccionId) {
      alert('No se encontró el ID de la inspección a actualizar.');
      return;
    }
    if (!this.validarFormulario()) { return; }

    const usrCod = (this.authService.getCurrentUser?.() ?? '').trim();
    const estado = (this.form.get('estado')?.value ?? 'A') as string;

    const payload = {
      Prevencion_Id:     this.inspeccionId,
      Usr_Cod:               usrCod,
      Cliente_Id:            this.clienteSeleccionado!.Cliente_Id,
      Subestacion_Id:        this.subestacionSeleccionada!.Subestacion_Id,
      SubContrata_Id:        this.subContrataSeleccionada!.SubContrata_Id,
      Jefe_Id:               this.jefeSeleccionado!.Jefe_Id,
      Actividad:             this.form.get('actividadTarea')?.value ?? '',
      Orden_Trabajo:         this.form.get('ordenTrabajo')?.value ?? '',
      Procedimiento_Trabajo: this.form.get('procedimientoTrabajo')?.value ?? '',
      Tipo_Id:               this.tipoInspeccionSeleccionado!.Tipo_Id,
      Usr_Mod:               usrCod,
      Estado:                estado,
    };

    this.guardando = true;
    this.apiService.putActualizarPrevencion(payload).subscribe({
      next: () => {
        this.guardando = false;
        // Sin alert: volver directamente a la tabla
        this.volver.emit();
      },
      error: (err: unknown) => {
        this.guardando = false;
        console.error('Error al actualizar inspección de Prevención:', err);
        alert('Ocurrió un error al actualizar. Intente nuevamente.');
      },
    });
  }

  private validarFormulario(): boolean {
    if (!this.form.get('actividadTarea')?.value) {
      alert('Seleccione Actividad o Tarea.'); return false;
    }
    if (!this.clienteSeleccionado) {
      alert('Seleccione un Cliente.'); return false;
    }
    if (!this.subestacionSeleccionada) {
      alert('Seleccione una Subestación.'); return false;
    }
    if (!this.subContrataSeleccionada) {
      alert('Seleccione una Subcontrata.'); return false;
    }
    if (!this.jefeSeleccionado) {
      alert('Seleccione un Jefe de Equipo.'); return false;
    }
    if (!this.tipoInspeccionSeleccionado) {
      alert('Seleccione un Tipo de Inspección.'); return false;
    }
    return true;
  }

  // ── Combos ───────────────────────────────────────────────────────
  toggleCombo(combo: ComboKey): void {
    const willOpen = !this.comboOpen[combo];
    this.closeCombos();
    if (willOpen) { this.comboOpen[combo] = true; this.comboSearch[combo] = ''; }
  }

  closeCombos(): void {
    (Object.keys(this.comboOpen) as ComboKey[]).forEach(k => (this.comboOpen[k] = false));
  }

  onSearchChange(combo: ComboKey, event: Event): void {
    this.comboSearch[combo] = (event.target as HTMLInputElement).value ?? '';
  }

  // ── Selecciones ──────────────────────────────────────────────────
  selectCliente(cliente: InsCliente | null): void {
    this.clienteSeleccionado     = cliente;
    this.subestacionSeleccionada = null;
    this.subestaciones           = [];
    this.closeCombos();
    if (cliente) { this.cargarSubestaciones(cliente.Cliente_Id); }
  }

  selectSubestacion(s: InsSubEstacion | null): void {
    this.subestacionSeleccionada = s;
    this.closeCombos();
  }

  selectSubContrata(s: InsSubContrata | null): void {
    this.subContrataSeleccionada = s;
    this.closeCombos();
  }

  selectJefe(j: InsJefe | null): void {
    this.jefeSeleccionado = j;
    this.closeCombos();
  }

  selectTipoInspeccion(t: TipoInspeccion | null): void {
    this.tipoInspeccionSeleccionado = t;
    this.closeCombos();
  }

  // ── Getters display ──────────────────────────────────────────────
  get clienteDisplay():        string { return this.clienteSeleccionado?.Cliente_Nombre           || 'Seleccione'; }
  get subestacionDisplay():    string {
    if (!this.clienteSeleccionado) { return 'Primero seleccione cliente'; }
    return this.subestacionSeleccionada?.Subestacion_Nombre || 'Seleccione';
  }
  get subContrataDisplay():    string { return this.subContrataSeleccionada?.SubContrata_Nombre   || 'Seleccione'; }
  get jefeDisplay():           string { return this.jefeSeleccionado?.Jef_Nombre                 || 'Seleccione'; }
  get tipoInspeccionDisplay(): string { return this.tipoInspeccionSeleccionado?.Tipo_Nombre      || 'Seleccione'; }

  // ── Getters filtrados ────────────────────────────────────────────
  get clientesFiltrados():        InsCliente[]      { return this.filtrar(this.clientes,        this.comboSearch.cliente,        i => i.Cliente_Nombre); }
  get subestacionesFiltradas():   InsSubEstacion[]  { return this.filtrar(this.subestaciones,   this.comboSearch.subestacion,    i => i.Subestacion_Nombre); }
  get subContratasFiltradas():    InsSubContrata[]  { return this.filtrar(this.subContratas,    this.comboSearch.subcontrata,    i => i.SubContrata_Nombre); }
  get jefesFiltrados():           InsJefe[]         { return this.filtrar(this.jefes,           this.comboSearch.jefe,           i => `${i.Jef_Nombre} ${i.Jef_DNI}`); }
  get tiposInspeccionFiltrados(): TipoInspeccion[]  { return this.filtrar(this.tiposInspeccion, this.comboSearch.tipoInspeccion, i => i.Tipo_Nombre); }

  // ── Carga de datos ───────────────────────────────────────────────
  private cargarDatosEdicion(id: number): void {
    this.cargandoEdicion = true;
    this.apiService.getMostrarPrevencion(id).subscribe({
      next: (response: unknown) => {
        this.edicionBase = this.extractFirstRecord(response);
        this.cargandoEdicion = false;
        this.aplicarDatosEdicion();
      },
      error: () => {
        this.edicionBase = null;
        this.cargandoEdicion = false;
      },
    });
  }

  private aplicarDatosEdicion(): void {
    if (!this.edicionBase) { return; }
    const r = this.edicionBase;

    // Actividad, Orden_Trabajo, Procedimiento, Estado
    this.form.patchValue({
      actividadTarea:       this.getVal(r, ['Actividad', 'actividad']),
      ordenTrabajo:         this.getVal(r, ['Orden_Trabajo', 'orden_Trabajo']),
      procedimientoTrabajo: this.getVal(r, ['Procedimiento_Trabajo', 'procedimiento_Trabajo']),
      estado:               this.getVal(r, ['Estado', 'estado']) || 'A',
    });

    // Cliente (por nombre, ya que SP_Mostrar no devuelve Cliente_Id directamente)
    const clienteNombre = this.getVal(r, ['Cliente_Nombre', 'cliente_Nombre']);
    if (clienteNombre && this.clientes.length) {
      const c = this.clientes.find(x => this.norm(x.Cliente_Nombre) === this.norm(clienteNombre)) ?? null;
      if (c) {
        this.clienteSeleccionado = c;
        if (!this.subestaciones.length && !this.cargandoSubestaciones) {
          this.cargarSubestaciones(c.Cliente_Id);
        }
      }
    }

    // Subestación
    const subNombre = this.getVal(r, ['Subestacion_Nombre', 'subestacion_Nombre']);
    if (subNombre && this.subestaciones.length) {
      const s = this.subestaciones.find(x => this.norm(x.Subestacion_Nombre) === this.norm(subNombre)) ?? null;
      if (s) { this.subestacionSeleccionada = s; }
    }

    // SubContrata
    const scNombre = this.getVal(r, ['SubContrata_Nombre', 'subContrata_Nombre']);
    if (scNombre && this.subContratas.length) {
      const sc = this.subContratas.find(x => this.norm(x.SubContrata_Nombre) === this.norm(scNombre)) ?? null;
      if (sc) { this.subContrataSeleccionada = sc; }
    }

    // Jefe
    const jefeNombre = this.getVal(r, ['Jef_Nombre', 'jef_Nombre']);
    const jefeDni    = this.getVal(r, ['Jef_DNI', 'jef_DNI']);
    if ((jefeNombre || jefeDni) && this.jefes.length) {
      const j = this.jefes.find(x =>
        (jefeDni && x.Jef_DNI === jefeDni) ||
        (jefeNombre && this.norm(x.Jef_Nombre) === this.norm(jefeNombre))
      ) ?? null;
      if (j) { this.jefeSeleccionado = j; }
    }

    // Tipo Inspección
    const tipoNombre = this.getVal(r, ['Tipo_Nombre', 'tipo_Nombre']);
    if (tipoNombre && this.tiposInspeccion.length) {
      const t = this.tiposInspeccion.find(x => this.norm(x.Tipo_Nombre) === this.norm(tipoNombre)) ?? null;
      if (t) { this.tipoInspeccionSeleccionado = t; }
    }
  }

  private cargarDatosSupervisor(): void {
    const usrCod = (this.authService.getCurrentUser?.() ?? '').trim();
    if (!usrCod) { return; }
    this.apiService.getConsultaDatosUsuario({ Usr_Cod: usrCod }).subscribe({
      next: (response: unknown) => {
        const record = this.extractFirstRecord(response);
        this.supervisor = {
          nombre: this.getVal(record, ['usr_Nom', 'Usr_Nom']) || this.authService.getCurrentUserName(),
          cargo:  this.getVal(record, ['cargo_Nombre', 'Cargo_Nombre', 'cargoNombre']),
          area:   this.getVal(record, ['cen_Cos_Des', 'Cen_Cos_Des', 'Area_Des']),
        };
      },
      error: () => { this.supervisor = { nombre: usrCod, cargo: '', area: '' }; },
    });
  }

  private cargarClientes(): void {
    this.apiService.getListarInsClientes().subscribe({
      next: (r: unknown) => {
        this.clientes = this.extraerLista<Record<string, unknown>>(r).map(i => ({
          Cliente_Id:     this.toNum(i['Cliente_Id'] ?? i['cliente_Id']),
          Cliente_Nombre: this.getVal(i, ['Cliente_Nombre', 'cliente_Nombre']),
        })).filter(x => x.Cliente_Id > 0);
        this.aplicarDatosEdicion();
      },
      error: () => { this.clientes = []; },
    });
  }

  private cargarSubestaciones(clienteId: number): void {
    this.cargandoSubestaciones = true;
    this.apiService.getSubEstacionesPorCliente(clienteId).subscribe({
      next: (r: unknown) => {
        this.subestaciones = this.extraerLista<Record<string, unknown>>(r).map(i => ({
          Subestacion_Id:     this.toNum(i['Subestacion_Id'] ?? i['subestacion_Id']),
          Subestacion_Nombre: this.getVal(i, ['Subestacion_Nombre', 'subestacion_Nombre']),
        })).filter(x => x.Subestacion_Id > 0);
        this.cargandoSubestaciones = false;
        this.aplicarDatosEdicion();
      },
      error: () => { this.subestaciones = []; this.cargandoSubestaciones = false; },
    });
  }

  private cargarSubContratas(): void {
    this.cargandoSubContratas = true;
    this.apiService.getListarSubContratas().subscribe({
      next: (r: unknown) => {
        this.subContratas = this.extraerLista<Record<string, unknown>>(r).map(i => ({
          SubContrata_Id:     this.toNum(i['SubContrata_Id'] ?? i['subContrata_Id']),
          SubContrata_Nombre: this.getVal(i, ['SubContrata_Nombre', 'subContrata_Nombre']),
        }));
        this.cargandoSubContratas = false;
        this.aplicarDatosEdicion();
      },
      error: () => { this.subContratas = []; this.cargandoSubContratas = false; },
    });
  }

  private cargarJefes(): void {
    this.cargandoJefes = true;
    this.apiService.getListarJefesArea().subscribe({
      next: (r: unknown) => {
        this.jefes = this.extraerLista<Record<string, unknown>>(r).map(i => ({
          Jefe_Id:     this.toNum(i['Jefe_Id'] ?? i['jefe_Id']),
          Jef_Nombre:  this.getVal(i, ['Jef_Nombre', 'jef_Nombre', 'Jefe_Nombre']),
          Jef_DNI:     this.getVal(i, ['Jef_DNI', 'jef_DNI', 'DNI']),
          Cen_Cos_Id:  this.toNum(i['Cen_Cos_Id'] ?? i['cen_Cos_Id']),
          Cen_Cos_Des: this.getVal(i, ['Cen_Cos_Des', 'cen_Cos_Des', 'Area_Des']),
        }));
        this.cargandoJefes = false;
        this.aplicarDatosEdicion();
      },
      error: () => { this.jefes = []; this.cargandoJefes = false; },
    });
  }

  private cargarTiposInspeccion(): void {
    this.cargandoTipos = true;
    this.apiService.getListarTiposInspeccion().subscribe({
      next: (r: unknown) => {
        this.tiposInspeccion = this.extraerLista<Record<string, unknown>>(r).map(i => ({
          Tipo_Id:     this.toNum(i['Tipo_Id'] ?? i['tipo_Id']),
          Tipo_Nombre: this.getVal(i, ['Tipo_Nombre', 'tipo_Nombre']),
        })).filter(x => x.Tipo_Id > 0);
        this.cargandoTipos = false;
        this.aplicarDatosEdicion();
      },
      error: () => { this.tiposInspeccion = []; this.cargandoTipos = false; },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private filtrar<T>(list: T[], term: string, fn: (i: T) => string): T[] {
    const t = this.norm(term.trim());
    return t ? list.filter(i => this.norm(fn(i)).includes(t)) : list;
  }

  private norm(v: string): string {
    return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private extraerLista<T>(response: unknown): T[] {
    if (Array.isArray(response)) { return response as T[]; }
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      for (const k of ['Elements','elements','Data','data','Result','result','items','Items']) {
        if (Array.isArray(r[k])) { return r[k] as T[]; }
      }
    }
    return [];
  }

  private extractFirstRecord(response: unknown): Record<string, unknown> {
    const list = this.extraerLista<Record<string, unknown>>(response);
    return list.length > 0 ? list[0] : {};
  }

  private getVal(record: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
      const v = record[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') { return String(v).trim(); }
    }
    return '';
  }

  private toNum(v: unknown): number {
    if (v === undefined || v === null || v === '') { return 0; }
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
}
