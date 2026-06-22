import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { ApiService, EliminarObservacionPlaneadaRequest } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ConfirmacionAccionDialogComponent } from './confirmacion-accion-dialog.component';

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

@Component({
  selector: 'app-inspecciones-page',
  templateUrl: './inspecciones-page.component.html',
  styleUrls: ['./inspecciones-page.component.scss'],
})
export class InspeccionesPageComponent implements OnInit {
  vistaActual: 'inspecciones' | 'observaciones-planeadas' = 'inspecciones';

  filtroDesde: Date | null = new Date();
  filtroHasta: Date | null = new Date();
  estadoFiltro: 'A' | 'I' = 'A';
  busquedaGeneral = '';

  observacionesPlaneadas: ObservacionPlaneadaListado[] = [];
  registrosPorPagina = 10;
  opcionesRegistros = [10, 25, 50, 100, 0];
  cargandoObservacionesPlaneadas = false;
  eliminandoObservacion = false;

  modoFormulario: 'nuevo' | 'editar' = 'nuevo';
  codigoObsSeleccionado: string | null = null;

  constructor(
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.buscarObservaciones();
  }

  abrirObservacionesPlaneadas(): void {
    this.modoFormulario = 'nuevo';
    this.codigoObsSeleccionado = null;
    this.vistaActual = 'observaciones-planeadas';
  }

  editarObservacion(codigoObs: string): void {
    this.modoFormulario = 'editar';
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
      if (confirmado) {
        this.ejecutarEliminacion(codigoObs);
      }
    });
  }

  private ejecutarEliminacion(codigoObs: string): void {
    const usuario = this.authService.getCurrentUser().trim();
    if (!usuario) {
      alert('No se pudo identificar el usuario. Vuelve a iniciar sesión.');
      return;
    }

    const payload: EliminarObservacionPlaneadaRequest = {
      Codigo_Obs: codigoObs,
      Usr_Mod: usuario
    };

    this.eliminandoObservacion = true;
    this.apiService.eliminarObservacionPlaneada(payload).subscribe({
      next: (response: unknown) => {
        this.eliminandoObservacion = false;
        const success = this.esRespuestaExitosa(response);

        if (success) {
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

  volverAInspecciones(): void {
    this.vistaActual = 'inspecciones';
    this.modoFormulario = 'nuevo';
    this.codigoObsSeleccionado = null;
    this.cargarObservacionesPlaneadas();
  }

  cambiarFiltroDesde(valor: Date | null): void {
    this.filtroDesde = valor;
  }

  cambiarFiltroHasta(valor: Date | null): void {
    this.filtroHasta = valor;
  }

  cambiarBusqueda(valor: string): void {
    this.busquedaGeneral = valor ?? '';
  }

  cambiarEstado(valor: string): void {
    this.estadoFiltro = valor === 'A' ? 'A' : 'I';
  }

  buscarObservaciones(): void {
    this.cargarObservacionesPlaneadas();
  }

  private formatearFechaConsulta(fecha: Date | null): string {
    if (!fecha) {
      return '';
    }

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  cambiarRegistrosPorPagina(valor: string): void {
    const numero = this.toNumber(valor);
    this.registrosPorPagina = numero >= 0 ? numero : 10;
  }

  get observacionesFiltradas(): ObservacionPlaneadaListado[] {
    let items = [...this.observacionesPlaneadas];

    const termino = this.normalizarTexto(this.busquedaGeneral.trim());
    if (termino) {
      items = items.filter(item =>
        this.normalizarTexto(this.crearTextoBusqueda(item)).includes(termino)
      );
    }

    return items;
  }

  get observacionesPaginadas(): ObservacionPlaneadaListado[] {
    if (this.registrosPorPagina <= 0) {
      return this.observacionesFiltradas;
    }
    return this.observacionesFiltradas.slice(0, this.registrosPorPagina);
  }

  get totalFiltrados(): number {
    return this.observacionesFiltradas.length;
  }

  get totalMostrado(): number {
    return this.observacionesPaginadas.length;
  }

  get desdeMostrado(): number {
    return this.totalFiltrados > 0 ? 1 : 0;
  }

  get hastaMostrado(): number {
    return this.totalMostrado;
  }

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
          Observacion_Id: this.toNumber(
            item?.['Observacion_Id'] ?? item?.['observacion_Id'] ??
            item?.['observacionId'] ?? item?.['OBSERVACION_ID'] ?? 0
          ),
          Codigo_Obs: this.texto(
            item?.['Codigo_Obs'] ?? item?.['codigo_Obs'] ??
            item?.['codigoObs'] ?? item?.['CODIGO_OBS']
          ),
          Usr_Nom: this.texto(
            item?.['Usr_Nom'] ?? item?.['usr_Nom'] ??
            item?.['usrNom'] ?? item?.['USR_NOM']
          ),
          Jef_Nombre: this.texto(
            item?.['Jef_Nombre'] ?? item?.['jef_Nombre'] ??
            item?.['jefNombre'] ?? item?.['JEF_NOMBRE']
          ),
          Cen_Cos_Des: this.texto(
            item?.['Cen_Cos_Des'] ?? item?.['cen_Cos_Des'] ??
            item?.['cenCosDes'] ?? item?.['CEN_COS_DES']
          ),
          Cliente_Nombre: this.texto(
            item?.['Cliente_Nombre'] ?? item?.['cliente_Nombre'] ??
            item?.['clienteNombre'] ?? item?.['CLIENTE_NOMBRE']
          ),
          Subestacion_Nombre: this.texto(
            item?.['Subestacion_Nombre'] ?? item?.['subestacion_Nombre'] ??
            item?.['subestacionNombre'] ?? item?.['SUBESTACION_NOMBRE']
          ),
          Motivo_Nombre: this.texto(
            item?.['Motivo_Nombre'] ?? item?.['motivo_Nombre'] ??
            item?.['motivoNombre'] ?? item?.['MOTIVO_NOMBRE']
          ),
          Obs_Detalle: this.texto(
            item?.['Obs_Detalle'] ?? item?.['obs_Detalle'] ??
            item?.['obsDetalle'] ?? item?.['OBS_DETALLE']
          )
        }));

        this.cargandoObservacionesPlaneadas = false;
      },
      error: () => {
        this.observacionesPlaneadas = [];
        this.cargandoObservacionesPlaneadas = false;
      }
    });
  }

  private crearTextoBusqueda(item: ObservacionPlaneadaListado): string {
    return [
      item.Observacion_Id,
      item.Codigo_Obs,
      item.Usr_Nom,
      item.Jef_Nombre,
      item.Cen_Cos_Des,
      item.Cliente_Nombre,
      item.Subestacion_Nombre,
      item.Motivo_Nombre,
      item.Obs_Detalle
    ].join(' ');
  }

  private normalizarTexto(value: string): string {
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private extraerLista<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }

    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;

      const candidatos = [
        r['Elements'], r['elements'],
        r['Data'],     r['data'],
        r['Result'],   r['result'],
        r['items'],    r['Items'],
        r['response'], r['Response']
      ];

      for (const candidato of candidatos) {
        if (Array.isArray(candidato)) {
          return candidato as T[];
        }
        if (candidato && typeof candidato === 'object') {
          const c = candidato as Record<string, unknown>;
          for (const nested of [c['Elements'], c['elements'], c['Data'], c['data'], c['Result'], c['result']]) {
            if (Array.isArray(nested)) {
              return nested as T[];
            }
          }
        }
      }
    }

    return [];
  }

  private texto(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private toNumber(value: unknown): number {
    if (value === undefined || value === null || value === '') return 0;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  }

  private esRespuestaExitosa(response: unknown): boolean {
    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      if (record['success'] !== undefined) {
        return record['success'] === true;
      }
      if (record['Success'] !== undefined) {
        return record['Success'] === true;
      }
    }

    return true;
  }

  private getRespuestaMensaje(response: unknown): string {
    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      for (const key of ['message', 'Message']) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value);
        }
      }
    }

    return '';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const record = error as Record<string, unknown>;
      const errorBody = record['error'];
      if (errorBody && typeof errorBody === 'object') {
        const bodyRecord = errorBody as Record<string, unknown>;
        for (const key of ['message', 'Message']) {
          const value = bodyRecord[key];
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value);
          }
        }
      }

      for (const key of ['message', 'Message']) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value);
        }
      }
    }

    return fallback;
  }
}
