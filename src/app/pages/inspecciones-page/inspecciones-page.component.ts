import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/Services/api.services';

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
  busquedaGeneral = '';

  observacionesPlaneadas: ObservacionPlaneadaListado[] = [];
  registrosPorPagina = 10;
  opcionesRegistros = [10, 25, 50, 100, 0];
  cargandoObservacionesPlaneadas = false;

  constructor(
    private readonly apiService: ApiService,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarObservacionesPlaneadas();
  }

  abrirObservacionesPlaneadas(): void {
    this.vistaActual = 'observaciones-planeadas';
  }

  volverAInspecciones(): void {
    this.vistaActual = 'inspecciones';
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

    this.apiService.getListarObservacionesPlaneadas().subscribe({
      next: (response: unknown) => {
        console.log('Respuesta observaciones planeadas RAW:', JSON.stringify(response));

        const raw = this.extraerLista<any>(response);
        console.log('Lista extraída:', raw.length, 'registros');

        this.observacionesPlaneadas = raw.map((item: any) => {
          const mapped: ObservacionPlaneadaListado = {
            Observacion_Id: this.toNumber(
              item?.Observacion_Id ?? item?.observacion_Id ??
              item?.observacionId ?? item?.OBSERVACION_ID ?? 0
            ),
            Codigo_Obs: this.texto(
              item?.Codigo_Obs ?? item?.codigo_Obs ??
              item?.codigoObs ?? item?.CODIGO_OBS
            ),
            Usr_Nom: this.texto(
              item?.Usr_Nom ?? item?.usr_Nom ??
              item?.usrNom ?? item?.USR_NOM
            ),
            Jef_Nombre: this.texto(
              item?.Jef_Nombre ?? item?.jef_Nombre ??
              item?.jefNombre ?? item?.JEF_NOMBRE
            ),
            Cen_Cos_Des: this.texto(
              item?.Cen_Cos_Des ?? item?.cen_Cos_Des ??
              item?.cenCosDes ?? item?.CEN_COS_DES
            ),
            Cliente_Nombre: this.texto(
              item?.Cliente_Nombre ?? item?.cliente_Nombre ??
              item?.clienteNombre ?? item?.CLIENTE_NOMBRE
            ),
            Subestacion_Nombre: this.texto(
              item?.Subestacion_Nombre ?? item?.subestacion_Nombre ??
              item?.subestacionNombre ?? item?.SUBESTACION_NOMBRE
            ),
            Motivo_Nombre: this.texto(
              item?.Motivo_Nombre ?? item?.motivo_Nombre ??
              item?.motivoNombre ?? item?.MOTIVO_NOMBRE
            ),
            Obs_Detalle: this.texto(
              item?.Obs_Detalle ?? item?.obs_Detalle ??
              item?.obsDetalle ?? item?.OBS_DETALLE
            )
          };
          console.log('Item mapeado:', mapped);
          return mapped;
        });

        this.cargandoObservacionesPlaneadas = false;
      },
      error: (err: any) => {
        console.error('Error cargando observaciones planeadas:', err);
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

      // Busca en todas las claves posibles que use el backend
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
}