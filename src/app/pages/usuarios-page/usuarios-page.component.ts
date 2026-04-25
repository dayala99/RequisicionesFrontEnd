import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiService, UsuariosFiltro } from 'src/app/Services/api.services';
import { UsuarioEditDialogComponent } from './usuario-edit-dialog.component';
import { UsuarioRegisterDialogComponent } from './usuario-register-dialog.component';

interface UsuarioRow {
  usrId: number | null;
  usrCod: string;
  usrNom: string;
  fecha: string;
  flgEst: string;
  estado: string;
  activo: boolean;
}

type DataRecord = Record<string, unknown>;

@Component({
  selector: 'app-usuarios-page',
  templateUrl: './usuarios-page.component.html',
  styleUrls: ['./usuarios-page.component.scss']
})
export class UsuariosPageComponent implements OnInit {
  readonly filtersForm: FormGroup;
  usuarios: UsuarioRow[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog
  ) {
    this.filtersForm = this.formBuilder.group({
      codigo: [''],
      codigoUsuario: [''],
      nombres: [''],
      estado: ['A']
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const filtros = this.getFiltros();
    const codigoBuscado = this.getCodigoBuscado();

    this.apiService.getListarUsuarioActivo(filtros).subscribe({
      next: (response: unknown) => {
        const usuarios = this.extractRecords(response).map((item) => this.mapUsuario(item));

        if (usuarios.length || !codigoBuscado || codigoBuscado.length === 1) {
          this.usuarios = usuarios;
          this.isLoading = false;
          return;
        }

        this.buscarUsuariosPorPrefijo(codigoBuscado);
      },
      error: (error: unknown) => {
        console.error('Error cargando usuarios:', error);
        this.usuarios = [];
        this.errorMessage = 'No se pudo cargar la informacion de usuarios. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      codigo: '',
      codigoUsuario: '',
      nombres: '',
      estado: 'A'
    });
    this.cargarUsuarios();
  }

  trackByUsuario(_index: number, usuario: UsuarioRow): string {
    return usuario.usrId !== null ? String(usuario.usrId) : usuario.usrCod;
  }

  editarUsuario(usuario: UsuarioRow): void {
    if (usuario.usrId === null) {
      return;
    }

    const dialogRef = this.dialog.open(UsuarioEditDialogComponent, {
      width: 'min(34rem, 92vw)',
      data: { usuario },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((updated: boolean | undefined) => {
      if (updated) {
        this.cargarUsuarios();
      }
    });
  }

  registrarUsuario(): void {
    const dialogRef = this.dialog.open(UsuarioRegisterDialogComponent, {
      width: 'min(34rem, 92vw)',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((created: boolean | undefined) => {
      if (created) {
        this.cargarUsuarios();
      }
    });
  }

  sanitizeCodigoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = Number(input.value);

    if (!input.value) {
      this.filtersForm.controls['codigo'].setValue('', { emitEvent: false });
      return;
    }

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      input.value = '';
      this.filtersForm.controls['codigo'].setValue('', { emitEvent: false });
    }
  }

  private buscarUsuariosPorPrefijo(codigoBuscado: string): void {
    this.apiService.getListarUsuarioActivo(this.buildFiltros(true)).subscribe({
      next: (response: unknown) => {
        const usuarios = this.extractRecords(response).map((item) => this.mapUsuario(item));
        this.usuarios = this.findUsuariosByCodigoPrefix(usuarios, codigoBuscado);
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando usuarios por prefijo:', error);
        this.usuarios = [];
        this.errorMessage = 'No se pudo cargar la informacion de usuarios. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  private getFiltros(): UsuariosFiltro {
    return this.buildFiltros(false);
  }

  private buildFiltros(omitCodigo: boolean): UsuariosFiltro {
    const filters = this.filtersForm.value as {
      codigo: string;
      codigoUsuario: string;
      nombres: string;
      estado: string;
    };
    const usrId = Number(filters.codigo);
    const filtros: UsuariosFiltro = {};

    if (!omitCodigo && filters.codigo && Number.isInteger(usrId) && usrId > 0) {
      filtros.Usr_Id = usrId;
    }

    if (filters.codigoUsuario?.trim()) {
      filtros.Usr_Cod = filters.codigoUsuario.trim();
    }

    if (filters.nombres?.trim()) {
      filtros.Usr_Nom = filters.nombres.trim();
    }

    filtros.Flg_Est = filters.estado;

    return filtros;
  }

  private getCodigoBuscado(): string {
    const codigo = String(this.filtersForm.controls['codigo'].value ?? '').trim();
    return /^[1-9]\d*$/.test(codigo) ? codigo : '';
  }

  private findUsuariosByCodigoPrefix(usuarios: UsuarioRow[], codigoBuscado: string): UsuarioRow[] {
    for (let length = codigoBuscado.length; length > 0; length -= 1) {
      const prefix = codigoBuscado.slice(0, length);
      const matches = usuarios.filter((usuario) => String(usuario.usrId ?? '').startsWith(prefix));

      if (matches.length) {
        return matches;
      }
    }

    return [];
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter(this.isDataRecord);
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = ['usuarios', 'Usuarios', 'users', 'Users', 'elements', 'data', 'Data', 'result', 'Result'];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter(this.isDataRecord);
      }
    }

    return [response];
  }

  private mapUsuario(item: DataRecord): UsuarioRow {
    const usrId = this.getNumberValue(item, ['Usr_Id', 'usr_Id', 'usrId', 'id', 'Id']);
    const usrCod = this.getTextValue(item, ['Usr_Cod', 'usr_Cod', 'usrCod']);
    const usrNom = this.getTextValue(item, ['Usr_Nom', 'usr_Nom', 'usrNom']);
    const fecha = this.formatDateValue(this.getTextValue(item, [
      'Fecha',
      'fecha',
      'Fec_Reg',
      'fec_Reg',
      'Fec_Cre',
      'fec_Cre',
      'CreatedAt',
      'createdAt',
      'Date',
      'date'
    ]));
    const flgEst = this.getTextValue(item, ['Flg_Est', 'flg_Est', 'flgEst']);
    const activo = flgEst.toUpperCase() === 'A';

    return {
      usrId,
      usrCod,
      usrNom,
      fecha,
      flgEst,
      estado: activo ? 'Activo' : 'Inactivo',
      activo
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

  private getNumberValue(item: DataRecord, keys: string[]): number | null {
    for (const key of keys) {
      const value = Number(item[key]);

      if (Number.isInteger(value)) {
        return value;
      }
    }

    return null;
  }

  private isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
