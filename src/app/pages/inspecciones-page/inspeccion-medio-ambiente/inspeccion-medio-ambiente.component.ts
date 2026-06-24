import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ConfirmacionAccionDialogComponent } from '../confirmacion-accion-dialog.component';

// ── Interfaces de combos reutilizados ─────────────────────────────
interface InsCliente      { Cliente_Id: number;     Cliente_Nombre: string; }
interface InsSubEstacion  { Subestacion_Id: number; Subestacion_Nombre: string; }
interface InsSubContrata  { SubContrata_Id: number; SubContrata_Nombre: string; }
interface InsJefe         { Jefe_Id: number; Jef_Nombre: string; Jef_DNI: string; Cen_Cos_Id: number; Cen_Cos_Des: string; }

/** Tipo de inspección proveniente de BD: SELECT Tipo_Id, Tipo_Nombre FROM Ins_Tipo_Inspeccion */
interface TipoInspeccion  { Tipo_Id: number; Tipo_Nombre: string; }

type ComboKey = 'cliente' | 'subestacion' | 'subcontrata' | 'jefe' | 'tipoInspeccion';

interface SupervisorDatos { nombre: string; cargo: string; area: string; }

@Component({
  selector: 'app-inspeccion-medio-ambiente',
  templateUrl: './inspeccion-medio-ambiente.component.html',
  styleUrls: ['./inspeccion-medio-ambiente.component.scss'],
})
export class InspeccionMedioAmbienteComponent implements OnInit {
  @Output() volver = new EventEmitter<void>();

  @Input() modoEdicion = false;
  @Input() inspeccionId: number | null = null;

  // ── Datos del supervisor ──────────────────────────────────────────
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
          ? 'Se cancelará la edición de la inspección de medio ambiente. Esta acción cerrará el formulario actual.'
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

  // ── Guardar ──────────────────────────────────────────────────────
  guardar(): void {
    if (this.guardando) { return; }

    const actividadTarea = this.form.get('actividadTarea')?.value ?? '';

    if (!actividadTarea) {
      alert('Seleccione Actividad o Tarea.');
      return;
    }
    if (!this.clienteSeleccionado) {
      alert('Seleccione un Cliente.');
      return;
    }
    if (!this.subestacionSeleccionada) {
      alert('Seleccione una Subestación.');
      return;
    }
    if (!this.subContrataSeleccionada) {
      alert('Seleccione una Subcontrata.');
      return;
    }
    if (!this.jefeSeleccionado) {
      alert('Seleccione un Jefe de Equipo.');
      return;
    }
    if (!this.tipoInspeccionSeleccionado) {
      alert('Seleccione un Tipo de Inspección.');
      return;
    }

    const usrCod = (this.authService.getCurrentUser?.() ?? '').trim();

    const payload = {
      Usr_Cod:               usrCod,
      Cliente_Id:            this.clienteSeleccionado.Cliente_Id,
      Subestacion_Id:        this.subestacionSeleccionada.Subestacion_Id,
      SubContrata_Id:        this.subContrataSeleccionada.SubContrata_Id,
      Jefe_Id:               this.jefeSeleccionado.Jefe_Id,
      Actividad:             actividadTarea,
      Orden_Trabajo:         this.form.get('ordenTrabajo')?.value ?? '',
      Procedimiento_Trabajo: this.form.get('procedimientoTrabajo')?.value ?? '',
      Tipo_Id:               this.tipoInspeccionSeleccionado.Tipo_Id,
      Usr_Reg:               usrCod,
    };

    this.guardando = true;
    this.apiService.postInsertarMedioAmbiente(payload).subscribe({
      next: () => {
        this.guardando = false;
        alert('Inspección de Medio Ambiente registrada correctamente.');
        this.volver.emit();
      },
      error: (err: unknown) => {
        this.guardando = false;
        console.error('Error al guardar inspección de Medio Ambiente:', err);
        alert('Ocurrió un error al guardar. Intente nuevamente.');
      },
    });
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
      error: () => {
        this.supervisor = { nombre: usrCod, cargo: '', area: '' };
      },
    });
  }

  private cargarClientes(): void {
    this.apiService.getListarInsClientes().subscribe({
      next: (r: unknown) => {
        this.clientes = this.extraerLista<Record<string, unknown>>(r).map(i => ({
          Cliente_Id:     this.toNum(i['Cliente_Id'] ?? i['cliente_Id']),
          Cliente_Nombre: this.getVal(i, ['Cliente_Nombre', 'cliente_Nombre']),
        })).filter(x => x.Cliente_Id > 0);
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
