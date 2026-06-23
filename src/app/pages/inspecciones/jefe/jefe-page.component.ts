import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';

import { AuthService } from '../../../features/auth/services/auth.service';
import { ConfirmacionAccionDialogComponent } from '../../inspecciones-page/confirmacion-accion-dialog.component';
import { JefeRegisterDialogComponent } from './jefe-register-dialog.component';
import { CentroCostoOption, JefeFilter, JefeItem } from './jefe.model';
import { JefeService } from './jefe.service';

type DataRecord = Record<string, unknown>;

@Component({
  selector: 'app-jefe-page',
  templateUrl: './jefe-page.component.html',
  styleUrls: ['./jefe-page.component.scss']
})
export class JefePageComponent implements OnInit {
  readonly filtros: JefeFilter = {
    Id: undefined,
    Nombre: '',
    Dni: '',
    Estado: 'A',
    Cen_Cos_Id: 0
  };

  jefes: JefeItem[] = [];
  centroCostos: CentroCostoOption[] = [];
  cargando = false;
  cargandoAreas = false;
  eliminandoJefe = false;
  errorMessage = '';

  // ── Paginación ──────────────────────────────────────────────────
  readonly pageSize = 20;
  paginaActual = 1;

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.jefes.length / this.pageSize));
  }

  get jefesPaginados(): JefeItem[] {
    const inicio = (this.paginaActual - 1) * this.pageSize;
    return this.jefes.slice(inicio, inicio + this.pageSize);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
  }
  // ────────────────────────────────────────────────────────────────

  constructor(
    private readonly jefeService: JefeService,
    private readonly dialog: MatDialog,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarAreas();
    this.cargarJefes();
  }

  abrirNuevo(): void {
    const dialogRef = this.dialog.open(JefeRegisterDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
      data: {
        usrReg: this.authService.getCurrentUser() || ''
      }
    });

    dialogRef.afterClosed().subscribe((reload) => {
      if (reload === true) {
        this.cargarJefes();
      }
    });
  }

  editarJefe(jefe: JefeItem): void {
    if (jefe.id === null) {
      return;
    }

    const dialogRef = this.dialog.open(JefeRegisterDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
      data: {
        usrReg: this.authService.getCurrentUser() || '',
        jefe
      }
    });

    dialogRef.afterClosed().subscribe((reload) => {
      if (reload === true) {
        this.cargarJefes();
      }
    });
  }

  buscar(): void {
    this.cargarJefes();
  }

  private cargarAreas(): void {
    this.cargandoAreas = true;

    this.jefeService.listarCentroCostosActivos().subscribe({
      next: (response: unknown) => {
        this.centroCostos = this.jefeService.mapCentroCostoOptions(response);
        this.cargandoAreas = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando áreas', error);
        this.centroCostos = [];
        this.cargandoAreas = false;
      }
    });
  }

  eliminarJefe(jefe: JefeItem): void {
    if (jefe.id === null) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmacionAccionDialogComponent, {
      width: '460px',
      disableClose: true,
      data: {
        titulo: 'Eliminar jefe',
        mensaje: `Se eliminará al jefe "${jefe.nombre}". Esta acción cambiará su estado a inactivo.`,
        textoConfirmar: 'Confirmar eliminación',
        textoCancelar: 'Volver',
        tipo: 'peligro'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.ejecutarEliminacionJefe(jefe.id as number);
      }
    });
  }

  private ejecutarEliminacionJefe(id: number): void {
    const usrMod = this.authService.getCurrentUser().trim();
    if (!usrMod) {
      this.errorMessage = 'No se pudo identificar el usuario. Vuelve a iniciar sesión.';
      return;
    }

    this.eliminandoJefe = true;

    this.jefeService.eliminar(id, usrMod).subscribe({
      next: () => {
        this.eliminandoJefe = false;
        this.cargarJefes();
      },
      error: (error: unknown) => {
        console.error('Error eliminando jefe', error);
        this.eliminandoJefe = false;
        this.errorMessage = 'No se pudo eliminar el jefe.';
      }
    });
  }

  limpiar(): void {
    this.filtros.Id = undefined;
    this.filtros.Nombre = '';
    this.filtros.Dni = '';
    this.filtros.Estado = 'A';
    this.filtros.Cen_Cos_Id = 0;
    this.cargarJefes();
  }

  cargarJefes(): void {
    this.cargando = true;
    this.errorMessage = '';
    this.paginaActual = 1; // resetear al buscar/limpiar

    this.jefeService.listar(this.filtros).pipe(
      catchError((error: unknown) => {
        console.error('Error cargando jefes', error);
        this.jefes = [];
        this.errorMessage = 'No se pudo cargar la información de Jefes.';
        this.cargando = false;
        return of([]);
      })
    ).subscribe({
      next: (response: unknown) => {
        const registros = this.extractRecords(response);
        this.jefes = registros.map((item) => this.mapJefe(item));
        this.cargando = false;
      },
      error: () => {
        this.jefes = [];
        this.cargando = false;
      }
    });
  }

  trackByJefe(_index: number, jefe: JefeItem): number | null {
    return jefe.id;
  }

  formatEstado(value: string): string {
    const text = String(value ?? '').trim();
    if (!text) {
      return '-';
    }

    const normalized = text.toUpperCase();
    if (normalized === 'A' || normalized === 'ACTIVO' || normalized === '1' || normalized === 'TRUE') {
      return 'Activo';
    }

    if (normalized === 'I' || normalized === 'INACTIVO' || normalized === '0' || normalized === 'FALSE') {
      return 'Inactivo';
    }

    return text;
  }

  private mapJefe(item: DataRecord): JefeItem {
    const rawId = item['Id'] ?? item['id'] ?? item['Jefe_Id'] ?? item['Jef_Id'];
    const rawNombre = item['Nombre'] ?? item['nombre'] ?? item['Jef_Nombre'] ?? item['Jefe_Nombre'];
    const rawDni = item['Dni'] ?? item['dni'] ?? item['Jef_DNI'] ?? item['Jefe_DNI'];
    const rawArea = item['Area'] ?? item['area'] ?? item['Cen_Cos_Des'] ?? item['cen_cos_des'];
    const rawEstado = item['Estado'] ?? item['estado'] ?? item['Flg_Est'] ?? item['Flg_Estado'];

    return {
      id: rawId === null || rawId === undefined || rawId === '' ? null : Number(rawId),
      nombre: String(rawNombre ?? ''),
      dni: String(rawDni ?? ''),
      area: String(rawArea ?? ''),
      estado: String(rawEstado ?? ''),
      cenCosId: Number(item['Cen_Cos_Id'] ?? item['cen_cos_id'] ?? 0) || null
    };
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is DataRecord => this.isRecord(item));
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const elements = response['Elements'] ?? response['elements'];
    if (Array.isArray(elements)) {
      return elements.filter((item): item is DataRecord => this.isRecord(item));
    }

    const data = response['Data'] ?? response['data'];
    if (Array.isArray(data)) {
      return data.filter((item): item is DataRecord => this.isRecord(item));
    }

    return [response];
  }

  private isRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}