import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService, RegistrarAsignacionRequest } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';

type DataRecord = Record<string, unknown>;

@Component({
  selector: 'app-asignacion-page',
  templateUrl: './asignacion-page.component.html',
  styleUrls: ['./asignacion-page.component.scss']
})
export class AsignacionPageComponent implements OnInit {
  readonly form: FormGroup;
  usuarios: Array<{ codigo: string; nombre: string }> = [];
  centrosCosto: Array<{ id: number; descripcion: string }> = [];
  mostrarEditorAsignacion = false;
  isLoadingOptions = false;
  isLoadingCentroCosto = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  centroCostoMessage = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.form = this.formBuilder.group({
      fecha: [this.getToday(), Validators.required],
      usuario: ['', Validators.required],
      centroCosto: [{ value: '', disabled: true }, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarOpciones();
  }

  nuevaAsignacion(): void {
    this.form.reset({ fecha: this.getToday(), usuario: '', centroCosto: '' });
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

  guardar(): void {
    if (this.form.invalid || this.isSaving || this.isLoadingOptions) {
      this.form.markAllAsTouched();
      return;
    }

    const centroCostoId = Number(this.form.controls['centroCosto'].value);

    if (!Number.isInteger(centroCostoId) || centroCostoId <= 0) {
      this.centroCostoMessage = 'El usuario seleccionado no tiene un centro de costo asociado.';
      return;
    }

    const payload: RegistrarAsignacionRequest = {
      Asg_Fec: `${this.form.controls['fecha'].value}T00:00:00`,
      Asg_Usr: String(this.form.controls['usuario'].value),
      Asg_Usr_Cen_Cos: centroCostoId,
      Usr_Reg: this.authService.getCurrentUser().trim()
    };

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.postRegistrarAsignacion(payload).subscribe({
      next: (response: unknown) => {
        const failed = this.isRecord(response) && (response['Success'] === false || response['success'] === false);
        if (failed) {
          this.errorMessage = this.text(response as DataRecord, ['Message', 'message']) || 'No se pudo registrar la asignacion.';
        } else {
          this.successMessage = 'Asignacion registrada correctamente.';
          this.form.reset({ fecha: this.getToday(), usuario: '', centroCosto: '' });
          this.centroCostoMessage = '';
        }
        this.isSaving = false;
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveError(error);
        this.isSaving = false;
      }
    });
  }

  private cargarOpciones(): void {
    this.isLoadingOptions = true;
    forkJoin({
      usuarios: this.apiService.getListarUsuarioActivo({ Flg_Est: 'A' }),
      centros: this.apiService.getListarCentroCostoActivo({ Flg_Est: 'A' })
    }).subscribe({
      next: ({ usuarios, centros }) => {
        this.usuarios = this.extractRecords(usuarios).map((item) => ({
          codigo: this.text(item, ['Usr_Cod', 'usr_Cod', 'usrCod']),
          nombre: this.text(item, ['Usr_Nom', 'usr_Nom', 'usrNom'])
        })).filter((item) => !!item.codigo);
        this.centrosCosto = this.extractRecords(centros).map((item) => ({
          id: Number(this.text(item, ['Cen_Cos_Id', 'cen_Cos_Id', 'cenCosId'])),
          descripcion: this.text(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'cenCosDes'])
        })).filter((item) => Number.isInteger(item.id) && item.id > 0);
        this.isLoadingOptions = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los usuarios y centros de costo.';
        this.isLoadingOptions = false;
      }
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

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse && this.isRecord(error.error)) {
      return this.text(error.error, ['Message', 'message', 'title']) || 'No se pudo registrar la asignacion.';
    }
    return 'No se pudo registrar la asignacion.';
  }

  private isRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null;
  }
}
