import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { ApiService, EliminarObservacionPlaneadaRequest } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ConfirmacionAccionDialogComponent } from './confirmacion-accion-dialog.component';
import { WeReportArchivosDialogComponent } from './we-report-archivos-dialog.component';

type TabActivo = 'prevencion' | 'medio-ambiente' | 'observaciones' | 'stop-work' | 'we-report';

interface ObservacionPlaneadaListado {
  Observacion_Id: number;
  Codigo_Obs: string;
  Usr_Nom: string;
  Jef_Nombre: string;
  Cen_Cos_Des: string;
  Cliente_Nombre: string;
  Subestacion_Nombre: string;
  Motivo_Nombre: string;
  Obs_Detalle: string;
}

interface MedioAmbienteListado {
  Medio_Ambiente_Id: number;
  Medio_Ambiente_Cod: string;
  Supervisor_Nom: string;
  Jef_Nombre: string;
  Cen_Cos_Des: string;
  Cliente_Nombre: string;
  Subestacion_Nombre: string;
  Actividad: string;
  Orden_Trabajo: string;
  Tipo_Nombre: string;
}

interface PrevencionListado {
  Prevencion_Id: number;
  Prevencion_Cod: string;
  Usr_Nom: string;
  Jef_Nombre: string;
  Cen_Cos_Des: string;
  Cliente_Nombre: string;
  Subestacion_Nombre: string;
  Actividad: string;
  Orden_Trabajo: string;
  Tipo_Nombre: string;
}

interface WeReportListado {
  We_Report_Id: number;
  Codigo_We_Report: string;
  Usr_Nom: string;
  Reporte_Tipo: string;
  Cen_Cos_Des: string;
  Cliente_Nombre: string;
  Report_Descripcion: string;
  Report_Acciones_Inmediata: string;
  Report_Foto1_Ubicacion?: string;
  Report_Foto2_Ubicacion?: string;
  Report_Potencial: string;
  Report_Aplica: string;
}

const LABEL_NUEVO: Record<TabActivo, string> = {
  'prevencion':      'Nueva inspección de prevención',
  'medio-ambiente':  'Nueva inspección de medio ambiente',
  'observaciones':   'Nueva observación planeada',
  'stop-work':       'Nuevo Stop Work',
  'we-report':       'Nuevo We Report',
};

@Component({
  selector: 'app-inspecciones-page',
  templateUrl: './inspecciones-page.component.html',
  styleUrls: ['./inspecciones-page.component.scss'],
})
export class InspeccionesPageComponent implements OnInit {
  vistaActual: 'inspecciones' | 'observaciones-planeadas' | 'medio-ambiente' | 'prevencion' | 'we-report-form' = 'inspecciones';

  tabActivo: TabActivo = 'observaciones';

  filtroDesde: Date | null = new Date();
  filtroHasta: Date | null = new Date();
  estadoFiltro: 'A' | 'I' = 'A';
  busquedaGeneral = '';

  // ── Observaciones Planeadas ─────────────────────────────────────
  observacionesPlaneadas: ObservacionPlaneadaListado[] = [];
  cargandoObservacionesPlaneadas = false;
  eliminandoObservacion = false;

  // ── Medio Ambiente ──────────────────────────────────────────────
  registrosMedioAmbiente: MedioAmbienteListado[] = [];
  cargandoMedioAmbiente = false;
  eliminandoMedioAmbiente = false;

  // ── Prevención ──────────────────────────────────────────────────
  registrosPrevencion: PrevencionListado[] = [];
  cargandoPrevencion = false;
  eliminandoPrevencion = false;

  // ── We Report ───────────────────────────────────────────────────
  registrosWeReport: WeReportListado[] = [];
  cargandoWeReport = false;
  eliminandoWeReport = false;

  registrosPorPagina = 10;
  paginaActualPorTab: Record<TabActivo, number> = {
    prevencion: 1,
    'medio-ambiente': 1,
    observaciones: 1,
    'stop-work': 1,
    'we-report': 1,
  };
  opcionesRegistros = [10, 25, 50, 100, 0];

  modoFormulario: 'nuevo' | 'editar' = 'nuevo';
  observacionIdSeleccionado: number | null = null;
  codigoObsSeleccionado: string | null = null;
  inspeccionIdSeleccionado: number | null = null;

  constructor(
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.buscarRegistros();
  }

  get labelNuevo(): string {
    return LABEL_NUEVO[this.tabActivo];
  }

  cambiarTab(tab: TabActivo): void {
    this.tabActivo = tab;
    this.vistaActual = 'inspecciones';
    this.closeCombos();
    this.reiniciarPaginacion(tab);
    this.buscarRegistros();
  }

  abrirObservacionesPlaneadas(): void {
    this.modoFormulario = 'nuevo';
    this.observacionIdSeleccionado = null;
    this.codigoObsSeleccionado = null;
    this.inspeccionIdSeleccionado = null;
    this.closeCombos();

    switch (this.tabActivo) {
      case 'medio-ambiente':
        this.vistaActual = 'medio-ambiente';
        break;
      case 'prevencion':
        this.vistaActual = 'prevencion';
        break;
      case 'we-report':
        this.vistaActual = 'we-report-form';
        break;
      default:
        this.vistaActual = 'observaciones-planeadas';
        break;
    }
  }

  // ── Acciones Observaciones ──────────────────────────────────────
  editarObservacion(observacionId: number, codigoObs: string): void {
    this.modoFormulario = 'editar';
    this.observacionIdSeleccionado = observacionId ?? null;
    this.codigoObsSeleccionado = (codigoObs ?? '').trim() || null;
    this.vistaActual = 'observaciones-planeadas';
  }

  eliminarObservacion(obs: ObservacionPlaneadaListado): void {
    const codigoObs = (obs.Codigo_Obs ?? '').trim();
    if (!codigoObs) {
      alert('No se encontró el código de la observación para eliminar.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmacionAccionDialogComponent, {
      width: '460px',
      disableClose: true,
      data: {
        titulo: 'Eliminar observación',
        mensaje: `Se eliminará la observación ${codigoObs}. Esta acción cambiará su estado a inactivo.`,
        textoConfirmar: 'Confirmar eliminación',
        textoCancelar: 'Volver',
        tipo: 'peligro'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) { this.ejecutarEliminacionObservacion(codigoObs); }
    });
  }

  private ejecutarEliminacionObservacion(codigoObs: string): void {
    const usuario = this.authService.getCurrentUser().trim();
    if (!usuario) { alert('No se pudo identificar el usuario. Vuelve a iniciar sesión.'); return; }

    const payload: EliminarObservacionPlaneadaRequest = { Codigo_Obs: codigoObs, Usr_Mod: usuario };

    this.eliminandoObservacion = true;
    this.apiService.eliminarObservacionPlaneada(payload).subscribe({
      next: (response: unknown) => {
        this.eliminandoObservacion = false;
        if (this.esRespuestaExitosa(response)) {
          this.cargarObservacionesPlaneadas();
        } else {
          alert(this.getRespuestaMensaje(response) || 'No se pudo eliminar la observación planeada.');
        }
      },
      error: (error: unknown) => {
        this.eliminandoObservacion = false;
        alert(this.getErrorMessage(error, 'No se pudo eliminar la observación planeada.'));
      }
    });
  }

  // ── Acciones Medio Ambiente ─────────────────────────────────────
  editarMedioAmbiente(id: number): void {
    this.modoFormulario = 'editar';
    this.inspeccionIdSeleccionado = id;
    this.vistaActual = 'medio-ambiente';
  }

  eliminarMedioAmbiente(reg: MedioAmbienteListado): void {
    const dialogRef = this.dialog.open(ConfirmacionAccionDialogComponent, {
      width: '460px',
      disableClose: true,
      data: {
        titulo: 'Eliminar inspección',
        mensaje: `Se eliminará la inspección ${reg.Medio_Ambiente_Cod}. Esta acción cambiará su estado a inactivo.`,
        textoConfirmar: 'Confirmar eliminación',
        textoCancelar: 'Volver',
        tipo: 'peligro'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) { this.ejecutarEliminacionMedioAmbiente(reg.Medio_Ambiente_Id); }
    });
  }

  private ejecutarEliminacionMedioAmbiente(id: number): void {
    const usuario = this.authService.getCurrentUser().trim();
    if (!usuario) { alert('No se pudo identificar el usuario. Vuelve a iniciar sesión.'); return; }

    this.eliminandoMedioAmbiente = true;
    this.apiService.deleteEliminarMedioAmbiente(id, usuario).subscribe({
      next: (response: unknown) => {
        this.eliminandoMedioAmbiente = false;
        if (this.esRespuestaExitosa(response)) {
          this.cargarMedioAmbiente();
        } else {
          alert(this.getRespuestaMensaje(response) || 'No se pudo eliminar la inspección.');
        }
      },
      error: (error: unknown) => {
        this.eliminandoMedioAmbiente = false;
        alert(this.getErrorMessage(error, 'No se pudo eliminar la inspección.'));
      }
    });
  }

  // ── Acciones Prevención ─────────────────────────────────────────
  editarPrevencion(id: number): void {
    this.modoFormulario = 'editar';
    this.inspeccionIdSeleccionado = id;
    this.vistaActual = 'prevencion';
  }

  eliminarPrevencion(reg: PrevencionListado): void {
    const dialogRef = this.dialog.open(ConfirmacionAccionDialogComponent, {
      width: '460px',
      disableClose: true,
      data: {
        titulo: 'Eliminar inspección',
        mensaje: `Se eliminará la inspección ${reg.Prevencion_Cod}. Esta acción cambiará su estado a inactivo.`,
        textoConfirmar: 'Confirmar eliminación',
        textoCancelar: 'Volver',
        tipo: 'peligro'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) { this.ejecutarEliminacionPrevencion(reg.Prevencion_Id); }
    });
  }

  private ejecutarEliminacionPrevencion(id: number): void {
    const usuario = this.authService.getCurrentUser().trim();
    if (!usuario) { alert('No se pudo identificar el usuario. Vuelve a iniciar sesión.'); return; }

    this.eliminandoPrevencion = true;
    this.apiService.deleteEliminarPrevencion(id, usuario).subscribe({
      next: (response: unknown) => {
        this.eliminandoPrevencion = false;
        if (this.esRespuestaExitosa(response)) {
          this.cargarPrevencion();
        } else {
          alert(this.getRespuestaMensaje(response) || 'No se pudo eliminar la inspección de prevención.');
        }
      },
      error: (error: unknown) => {
        this.eliminandoPrevencion = false;
        alert(this.getErrorMessage(error, 'No se pudo eliminar la inspección de prevención.'));
      }
    });
  }

  abrirArchivosWeReport(registro: WeReportListado): void {
    this.dialog.open(WeReportArchivosDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      autoFocus: false,
      disableClose: false,
      panelClass: 'we-report-archivos-dialog-panel',
      data: registro
    });
  }

  eliminarWeReport(registro: WeReportListado): void {
    const codigo = (registro.Codigo_We_Report ?? '').trim() || `#${registro.We_Report_Id}`;

    const dialogRef = this.dialog.open(ConfirmacionAccionDialogComponent, {
      width: '460px',
      disableClose: true,
      data: {
        titulo: 'Eliminar We Report',
        mensaje: `Se eliminará el registro ${codigo}. Esta acción lo dejará inactivo.`,
        textoConfirmar: 'Confirmar eliminación',
        textoCancelar: 'Volver',
        tipo: 'peligro'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) { this.ejecutarEliminacionWeReport(registro.We_Report_Id); }
    });
  }

  private ejecutarEliminacionWeReport(weReportId: number): void {
    if (!weReportId) {
      alert('No se encontró el identificador del We Report para eliminar.');
      return;
    }

    this.eliminandoWeReport = true;
    this.apiService.deleteEliminarWeReport(weReportId).subscribe({
      next: (response: unknown) => {
        this.eliminandoWeReport = false;
        if (this.esRespuestaExitosa(response)) {
          this.cargarWeReport();
        } else {
          alert(this.getRespuestaMensaje(response) || 'No se pudo eliminar el We Report.');
        }
      },
      error: (error: unknown) => {
        this.eliminandoWeReport = false;
        alert(this.getErrorMessage(error, 'No se pudo eliminar el We Report.'));
      }
    });
  }

  closeCombos(): void {
    // En esta vista no hay combos desplegables propios todavía,
    // pero el método se mantiene para compatibilidad con las llamadas existentes.
  }

  // ── Volver ──────────────────────────────────────────────────────
  volverAInspecciones(): void {
    this.vistaActual = 'inspecciones';
    this.modoFormulario = 'nuevo';
    this.observacionIdSeleccionado = null;
    this.codigoObsSeleccionado = null;
    this.inspeccionIdSeleccionado = null;
    this.closeCombos();
    this.reiniciarPaginacion(this.tabActivo);
    this.buscarRegistros();
  }

  buscarRegistros(): void {
    if (this.tabActivo === 'medio-ambiente') {
      this.cargarMedioAmbiente();
    } else if (this.tabActivo === 'prevencion') {
      this.cargarPrevencion();
    } else if (this.tabActivo === 'observaciones') {
      this.cargarObservacionesPlaneadas();
    } else if (this.tabActivo === 'we-report') {
      this.cargarWeReport();
    }
  }

  // alias para compatibilidad con el HTML existente
  buscarObservaciones(): void { this.buscarRegistros(); }

  // ── Filtros ─────────────────────────────────────────────────────
  cambiarFiltroDesde(valor: Date | null): void { this.filtroDesde = valor; }
  cambiarFiltroHasta(valor: Date | null): void { this.filtroHasta = valor; }
  cambiarBusqueda(valor: string): void {
    this.busquedaGeneral = valor ?? '';
    this.reiniciarPaginacion(this.tabActivo);
  }
  cambiarEstado(valor: string): void {
    this.estadoFiltro = valor === 'A' ? 'A' : 'I';
    this.reiniciarPaginacion(this.tabActivo);
  }

  cambiarRegistrosPorPagina(valor: string): void {
    const numero = this.toNumber(valor);
    this.registrosPorPagina = numero >= 0 ? numero : 10;
    this.reiniciarPaginacion(this.tabActivo);
  }

  irPaginaAnterior(): void {
    const actual = this.obtenerPaginaActualActiva();
    if (actual > 1) {
      this.establecerPaginaActiva(actual - 1);
    }
  }

  irPaginaSiguiente(): void {
    const actual = this.obtenerPaginaActualActiva();
    const total = this.obtenerTotalPaginasActivas();
    if (actual < total) {
      this.establecerPaginaActiva(actual + 1);
    }
  }

  private reiniciarPaginacion(tab: TabActivo): void {
    this.paginaActualPorTab[tab] = 1;
  }

  private asegurarPaginaValida(tab: TabActivo): void {
    this.establecerPaginaActiva(this.obtenerPaginaActual(tab), tab);
  }

  private establecerPaginaActiva(pagina: number, tab: TabActivo = this.tabActivo): void {
    this.paginaActualPorTab[tab] = Math.max(1, Math.min(pagina || 1, this.obtenerTotalPaginas(tab)));
  }

  private obtenerPaginaActualActiva(): number {
    return this.obtenerPaginaActual(this.tabActivo);
  }

  private obtenerPaginaActual(tab: TabActivo): number {
    return this.paginaActualPorTab[tab] ?? 1;
  }

  private obtenerTotalPaginasActivas(): number {
    return this.obtenerTotalPaginas(this.tabActivo);
  }

  private obtenerTotalPaginas(tab: TabActivo): number {
    if (this.registrosPorPagina <= 0) { return 1; }
    const total = this.obtenerListaFiltrada(tab).length;
    return Math.max(1, Math.ceil(total / this.registrosPorPagina));
  }

  private obtenerListaFiltrada(tab: TabActivo): Array<unknown> {
    switch (tab) {
      case 'medio-ambiente': return this.medioAmbienteFiltrado;
      case 'prevencion': return this.prevencionFiltrado;
      case 'we-report': return this.weReportFiltrados;
      default: return this.observacionesFiltradas;
    }
  }

  private obtenerListaFiltradaActiva(): Array<unknown> {
    return this.obtenerListaFiltrada(this.tabActivo);
  }

  private obtenerListaPaginadaActiva(): Array<unknown> {
    switch (this.tabActivo) {
      case 'medio-ambiente': return this.medioAmbientePaginado;
      case 'prevencion': return this.prevencionPaginado;
      case 'we-report': return this.weReportPaginados;
      default: return this.observacionesPaginadas;
    }
  }

  private paginarLista<T>(items: T[], tab: TabActivo): T[] {
    if (this.registrosPorPagina <= 0) { return items; }
    const pagina = this.obtenerPaginaActual(tab);
    const inicio = (pagina - 1) * this.registrosPorPagina;
    return items.slice(inicio, inicio + this.registrosPorPagina);
  }

  // ── Getters paginación Observaciones ───────────────────────────
  get observacionesFiltradas(): ObservacionPlaneadaListado[] {
    let items = [...this.observacionesPlaneadas];
    const termino = this.normalizarTexto(this.busquedaGeneral.trim());
    if (termino) {
      items = items.filter(item =>
        this.normalizarTexto(this.crearTextoBusquedaObs(item)).includes(termino)
      );
    }
    return items;
  }

  get observacionesPaginadas(): ObservacionPlaneadaListado[] {
    return this.paginarLista(this.observacionesFiltradas, 'observaciones');
  }

  // ── Getters paginación Medio Ambiente ──────────────────────────
  get medioAmbienteFiltrado(): MedioAmbienteListado[] {
    let items = [...this.registrosMedioAmbiente];
    const termino = this.normalizarTexto(this.busquedaGeneral.trim());
    if (termino) {
      items = items.filter(item =>
        this.normalizarTexto(this.crearTextoBusquedaMA(item)).includes(termino)
      );
    }
    return items;
  }

  get medioAmbientePaginado(): MedioAmbienteListado[] {
    return this.paginarLista(this.medioAmbienteFiltrado, 'medio-ambiente');
  }

  // ── Getters paginación Prevención ─────────────────────────────
  get prevencionFiltrado(): PrevencionListado[] {
    let items = [...this.registrosPrevencion];
    const termino = this.normalizarTexto(this.busquedaGeneral.trim());
    if (termino) {
      items = items.filter(item =>
        this.normalizarTexto(this.crearTextoBusquedaPrevencion(item)).includes(termino)
      );
    }
    return items;
  }

  get prevencionPaginado(): PrevencionListado[] {
    return this.paginarLista(this.prevencionFiltrado, 'prevencion');
  }

  // ── Getters paginación We Report ───────────────────────────────
  get weReportFiltrados(): WeReportListado[] {
    let items = [...this.registrosWeReport];
    const termino = this.normalizarTexto(this.busquedaGeneral.trim());
    if (termino) {
      items = items.filter(item =>
        this.normalizarTexto(this.crearTextoBusquedaWeReport(item)).includes(termino)
      );
    }
    return items;
  }

  get weReportPaginados(): WeReportListado[] {
    return this.paginarLista(this.weReportFiltrados, 'we-report');
  }

  get totalFiltrados(): number {
    return this.obtenerListaFiltradaActiva().length;
  }

  get totalMostrado(): number {
    return this.obtenerListaPaginadaActiva().length;
  }

  get desdeMostrado(): number {
    const total = this.totalFiltrados;
    if (total === 0) { return 0; }
    if (this.registrosPorPagina <= 0) { return 1; }
    return ((this.obtenerPaginaActualActiva() - 1) * this.registrosPorPagina) + 1;
  }

  get hastaMostrado(): number {
    const total = this.totalFiltrados;
    if (total === 0) { return 0; }
    if (this.registrosPorPagina <= 0) { return total; }
    return Math.min(this.obtenerPaginaActualActiva() * this.registrosPorPagina, total);
  }

  get paginaActualActiva(): number {
    return this.obtenerPaginaActualActiva();
  }

  get totalPaginasActivas(): number {
    return this.obtenerTotalPaginasActivas();
  }

  // ── Carga de datos ──────────────────────────────────────────────
  private cargarObservacionesPlaneadas(): void {
    this.cargandoObservacionesPlaneadas = true;
    const fechaDesde = this.formatearFechaConsulta(this.filtroDesde);
    const fechaHasta = this.formatearFechaConsulta(this.filtroHasta);

    if (!fechaDesde || !fechaHasta) {
      this.observacionesPlaneadas = [];
      this.cargandoObservacionesPlaneadas = false;
      return;
    }

    this.apiService.getFiltrarObservaciones(fechaDesde, fechaHasta, this.estadoFiltro).subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.observacionesPlaneadas = raw.map(item => ({
          Observacion_Id: this.toNumber(item?.['Observacion_Id'] ?? item?.['observacion_Id'] ?? 0),
          Codigo_Obs:        this.texto(item?.['Codigo_Obs']        ?? item?.['codigo_Obs']),
          Usr_Nom:           this.texto(item?.['Usr_Nom']           ?? item?.['usr_Nom']),
          Jef_Nombre:        this.texto(item?.['Jef_Nombre']        ?? item?.['jef_Nombre']),
          Cen_Cos_Des:       this.texto(item?.['Cen_Cos_Des']       ?? item?.['cen_Cos_Des']),
          Cliente_Nombre:    this.texto(item?.['Cliente_Nombre']    ?? item?.['cliente_Nombre']),
          Subestacion_Nombre:this.texto(item?.['Subestacion_Nombre']?? item?.['subestacion_Nombre']),
          Motivo_Nombre:     this.texto(item?.['Motivo_Nombre']     ?? item?.['motivo_Nombre']),
          Obs_Detalle:       this.texto(item?.['Obs_Detalle']       ?? item?.['obs_Detalle']),
        }));
        this.cargandoObservacionesPlaneadas = false;
        this.asegurarPaginaValida('observaciones');
      },
      error: () => {
        this.observacionesPlaneadas = [];
        this.cargandoObservacionesPlaneadas = false;
        this.asegurarPaginaValida('observaciones');
      }
    });
  }

  private cargarPrevencion(): void {
    this.cargandoPrevencion = true;
    const fechaDesde = this.formatearFechaConsulta(this.filtroDesde);
    const fechaHasta = this.formatearFechaConsulta(this.filtroHasta);

    if (!fechaDesde || !fechaHasta) {
      this.registrosPrevencion = [];
      this.cargandoPrevencion = false;
      return;
    }

    this.apiService.getFiltrarPrevencion(fechaDesde, fechaHasta, this.estadoFiltro).subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.registrosPrevencion = raw.map(item => ({
          Prevencion_Id:  this.toNumber(item?.['Prevencion_Id']  ?? item?.['prevencion_Id']  ?? 0),
          Prevencion_Cod: this.texto(item?.['Prevencion_Cod'] ?? item?.['prevencion_Cod']),
          Usr_Nom:        this.texto(item?.['Usr_Nom']         ?? item?.['usr_Nom']),
          Jef_Nombre:     this.texto(item?.['Jef_Nombre']     ?? item?.['jef_Nombre']),
          Cen_Cos_Des:    this.texto(item?.['Cen_Cos_Des']    ?? item?.['cen_Cos_Des']),
          Cliente_Nombre: this.texto(item?.['Cliente_Nombre'] ?? item?.['cliente_Nombre']),
          Subestacion_Nombre: this.texto(item?.['Subestacion_Nombre'] ?? item?.['subestacion_Nombre']),
          Actividad:      this.texto(item?.['Actividad']      ?? item?.['actividad']),
          Orden_Trabajo:  this.texto(item?.['Orden_Trabajo']  ?? item?.['orden_Trabajo']),
          Tipo_Nombre:    this.texto(item?.['Tipo_Nombre']    ?? item?.['tipo_Nombre']),
        }));
        this.cargandoPrevencion = false;
        this.asegurarPaginaValida('prevencion');
      },
      error: () => {
        this.registrosPrevencion = [];
        this.cargandoPrevencion = false;
        this.asegurarPaginaValida('prevencion');
      }
    });
  }

  private cargarMedioAmbiente(): void {
    this.cargandoMedioAmbiente = true;
    const fechaDesde = this.formatearFechaConsulta(this.filtroDesde);
    const fechaHasta = this.formatearFechaConsulta(this.filtroHasta);

    if (!fechaDesde || !fechaHasta) {
      this.registrosMedioAmbiente = [];
      this.cargandoMedioAmbiente = false;
      return;
    }

    this.apiService.getFiltrarMedioAmbiente(fechaDesde, fechaHasta, this.estadoFiltro).subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.registrosMedioAmbiente = raw.map(item => ({
          Medio_Ambiente_Id:  this.toNumber(item?.['Medio_Ambiente_Id']  ?? item?.['medio_Ambiente_Id']  ?? 0),
          Medio_Ambiente_Cod: this.texto(item?.['Medio_Ambiente_Cod'] ?? item?.['medio_Ambiente_Cod']),
          Supervisor_Nom:     this.texto(item?.['Supervisor_Nom']     ?? item?.['supervisor_Nom']),
          Jef_Nombre:         this.texto(item?.['Jef_Nombre']         ?? item?.['jef_Nombre']),
          Cen_Cos_Des:        this.texto(item?.['Cen_Cos_Des']        ?? item?.['cen_Cos_Des']),
          Cliente_Nombre:     this.texto(item?.['Cliente_Nombre']     ?? item?.['cliente_Nombre']),
          Subestacion_Nombre: this.texto(item?.['Subestacion_Nombre'] ?? item?.['subestacion_Nombre']),
          Actividad:          this.texto(item?.['Actividad']          ?? item?.['actividad']),
          Orden_Trabajo:      this.texto(item?.['Orden_Trabajo']      ?? item?.['orden_Trabajo']),
          Tipo_Nombre:        this.texto(item?.['Tipo_Nombre']        ?? item?.['tipo_Nombre']),
        }));
        this.cargandoMedioAmbiente = false;
        this.asegurarPaginaValida('medio-ambiente');
      },
      error: () => {
        this.registrosMedioAmbiente = [];
        this.cargandoMedioAmbiente = false;
        this.asegurarPaginaValida('medio-ambiente');
      }
    });
  }

  private cargarWeReport(): void {
    this.cargandoWeReport = true;
    const fechaDesde = this.formatearFechaConsulta(this.filtroDesde);
    const fechaHasta = this.formatearFechaConsulta(this.filtroHasta);

    if (!fechaDesde || !fechaHasta) {
      this.registrosWeReport = [];
      this.cargandoWeReport = false;
      return;
    }

    this.apiService.getFiltrarWeReport(fechaDesde, fechaHasta, this.estadoFiltro).subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.registrosWeReport = raw.map(item => ({
          We_Report_Id: this.toNumber(item?.['We_Report_Id'] ?? item?.['we_Report_Id'] ?? 0),
          Codigo_We_Report: this.texto(item?.['Codigo_We_Report'] ?? item?.['codigo_We_Report']),
          Usr_Nom: this.texto(item?.['Usr_Nom'] ?? item?.['usr_Nom']),
          Reporte_Tipo: this.texto(item?.['Reporte_Tipo'] ?? item?.['reporte_Tipo']),
          Cen_Cos_Des: this.texto(item?.['Cen_Cos_Des'] ?? item?.['cen_Cos_Des']),
          Cliente_Nombre: this.texto(item?.['Cliente_Nombre'] ?? item?.['cliente_Nombre']),
          Report_Descripcion: this.texto(item?.['Report_Descripcion'] ?? item?.['report_Descripcion']),
          Report_Acciones_Inmediata: this.texto(item?.['Report_Acciones_Inmediata'] ?? item?.['report_Acciones_Inmediata']),
          Report_Foto1_Ubicacion: this.texto(item?.['Report_Foto1_Ubicacion'] ?? item?.['report_Foto1_Ubicacion']),
          Report_Foto2_Ubicacion: this.texto(item?.['Report_Foto2_Ubicacion'] ?? item?.['report_Foto2_Ubicacion']),
          Report_Potencial: this.texto(item?.['Report_Potencial'] ?? item?.['report_Potencial']),
          Report_Aplica: this.texto(item?.['Report_Aplica'] ?? item?.['report_Aplica']),
        }));
        this.cargandoWeReport = false;
        this.asegurarPaginaValida('we-report');
      },
      error: () => {
        this.registrosWeReport = [];
        this.cargandoWeReport = false;
        this.asegurarPaginaValida('we-report');
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────
  private formatearFechaConsulta(fecha: Date | null): string {
    if (!fecha) { return ''; }
    const year  = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day   = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private crearTextoBusquedaObs(item: ObservacionPlaneadaListado): string {
    return [item.Codigo_Obs, item.Usr_Nom, item.Jef_Nombre, item.Cen_Cos_Des,
            item.Cliente_Nombre, item.Subestacion_Nombre, item.Motivo_Nombre, item.Obs_Detalle].join(' ');
  }

  private crearTextoBusquedaMA(item: MedioAmbienteListado): string {
    return [item.Medio_Ambiente_Cod, item.Supervisor_Nom, item.Jef_Nombre, item.Cen_Cos_Des,
            item.Cliente_Nombre, item.Subestacion_Nombre, item.Actividad,
            item.Orden_Trabajo, item.Tipo_Nombre].join(' ');
  }

  private crearTextoBusquedaPrevencion(item: PrevencionListado): string {
    return [item.Prevencion_Cod, item.Usr_Nom, item.Jef_Nombre, item.Cen_Cos_Des,
            item.Cliente_Nombre, item.Subestacion_Nombre, item.Actividad,
            item.Orden_Trabajo, item.Tipo_Nombre].join(' ');
  }

  private crearTextoBusquedaWeReport(item: WeReportListado): string {
    return [item.Codigo_We_Report, item.Usr_Nom, item.Reporte_Tipo, item.Cen_Cos_Des,
            item.Cliente_Nombre, item.Report_Descripcion, item.Report_Acciones_Inmediata,
            item.Report_Potencial, item.Report_Aplica].join(' ');
  }

  private normalizarTexto(value: string): string {
    return value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private extraerLista<T>(response: unknown): T[] {
    if (Array.isArray(response)) { return response as T[]; }
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      for (const k of ['Elements','elements','Data','data','Result','result','items','Items','response','Response']) {
        if (Array.isArray(r[k])) { return r[k] as T[]; }
        if (r[k] && typeof r[k] === 'object') {
          const c = r[k] as Record<string, unknown>;
          for (const n of ['Elements','elements','Data','data','Result','result']) {
            if (Array.isArray(c[n])) { return c[n] as T[]; }
          }
        }
      }
    }
    return [];
  }

  private texto(value: unknown): string {
    if (value === undefined || value === null) { return ''; }
    return String(value).trim();
  }

  private toNumber(value: unknown): number {
    if (value === undefined || value === null || value === '') { return 0; }
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }

  private esRespuestaExitosa(response: unknown): boolean {
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      if (r['success'] !== undefined) { return r['success'] === true; }
      if (r['Success'] !== undefined) { return r['Success'] === true; }
    }
    return true;
  }

  private getRespuestaMensaje(response: unknown): string {
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      for (const k of ['message', 'Message']) {
        const v = r[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') { return String(v); }
      }
    }
    return '';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const r = error as Record<string, unknown>;
      const body = r['error'];
      if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        for (const k of ['message', 'Message']) {
          const v = b[k];
          if (v !== undefined && v !== null && String(v).trim() !== '') { return String(v); }
        }
      }
      for (const k of ['message', 'Message']) {
        const v = r[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') { return String(v); }
      }
    }
    return fallback;
  }
}
