import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CentroCostoOption, JefeItem } from './jefe.model';
import { ActualizarJefeRequest, JefeService, RegistrarJefeRequest } from './jefe.service';

export interface JefeRegisterDialogData {
  usrReg: string;
  jefe?: JefeItem;
}

@Component({
  selector: 'app-jefe-register-dialog',
  templateUrl: './jefe-register-dialog.component.html',
  styleUrls: ['./jefe-register-dialog.component.scss']
})
export class JefeRegisterDialogComponent implements OnInit {
  centroCostos: CentroCostoOption[] = [];
  cargandoCentrosCosto = false;
  cargandoDatosJefe = false;
  guardando = false;
  saveError = '';

  private cenCosDesPendiente = '';

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    dni: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
    cenCosId: [null as number | null, [Validators.required]],
    estado: ['A', [Validators.required]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly jefeService: JefeService,
    private readonly dialogRef: MatDialogRef<JefeRegisterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: JefeRegisterDialogData
  ) {}

  get esEdicion(): boolean {
    return !!this.data?.jefe?.id;
  }

  ngOnInit(): void {
    this.cargarCentroCostos();

    if (this.esEdicion) {
      this.cargarDatosJefe();
    }
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }

  guardar(): void {
    this.saveError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.esEdicion) {
      this.actualizarJefe();
      return;
    }

    this.registrarJefe();
  }

  private registrarJefe(): void {
    const usrReg = String(this.data?.usrReg ?? '').trim();
    if (!usrReg) {
      this.saveError = 'No se pudo obtener el usuario registrado.';
      return;
    }

    const payload: RegistrarJefeRequest = {
      Nombre: String(this.form.value.nombre ?? '').trim(),
      Dni: String(this.form.value.dni ?? '').trim(),
      Cen_Cos_Id: Number(this.form.value.cenCosId),
      Usr_Reg: usrReg
    };

    this.guardando = true;

    this.jefeService.registrar(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error registrando jefe', error);
        this.guardando = false;
        this.saveError = 'No se pudo registrar el jefe.';
      }
    });
  }

  private actualizarJefe(): void {
    const usrMod = String(this.data?.usrReg ?? '').trim();
    if (!usrMod) {
      this.saveError = 'No se pudo obtener el usuario que modifica.';
      return;
    }

    const id = this.data?.jefe?.id;
    if (!id) {
      this.saveError = 'No se pudo identificar al jefe a actualizar.';
      return;
    }

    const payload: ActualizarJefeRequest = {
      Id: id,
      Nombre: String(this.form.value.nombre ?? '').trim(),
      Dni: String(this.form.value.dni ?? '').trim(),
      Cen_Cos_Id: Number(this.form.value.cenCosId),
      Estado: this.normalizarEstado(this.form.value.estado),
      Usr_Mod: usrMod
    };

    this.guardando = true;

    this.jefeService.actualizar(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error actualizando jefe', error);
        this.guardando = false;
        this.saveError = 'No se pudo actualizar el jefe.';
      }
    });
  }

  private cargarCentroCostos(): void {
    this.cargandoCentrosCosto = true;

    this.jefeService.listarCentroCostosActivos().subscribe({
      next: (response: unknown) => {
        this.centroCostos = this.jefeService.mapCentroCostoOptions(response);
        this.cargandoCentrosCosto = false;
        this.preseleccionarCentroCosto();
      },
      error: (error: unknown) => {
        console.error('Error cargando centros de costo', error);
        this.centroCostos = [];
        this.cargandoCentrosCosto = false;
      }
    });
  }

  private cargarDatosJefe(): void {
    const id = this.data?.jefe?.id;
    if (!id) {
      return;
    }

    this.cargandoDatosJefe = true;

    this.jefeService.consultarDatos(id).subscribe({
      next: (response: unknown) => {
        const detalle = this.jefeService.mapJefeDetalle(response) as any;
        const raw = (response as any)?.data ?? response ?? {};
        const jefeBase = this.data?.jefe ?? {};

        const fuente = {
          ...jefeBase,
          ...raw,
          ...detalle
        };

        this.form.patchValue({
          nombre: this.extraerTexto(fuente, [
            'nombre',
            'Nombre',
            'Jef_Nombre',
            'jef_Nombre',
            'Jefe_Nombre',
            'jefe_Nombre'
          ]),
          dni: this.extraerTexto(fuente, [
            'dni',
            'Dni',
            'DNI',
            'Jef_DNI',
            'jef_DNI',
            'Jefe_DNI',
            'jefe_DNI'
          ]),
          cenCosId: this.extraerNumero(fuente, [
            'cenCosId',
            'Cen_Cos_Id',
            'cen_Cos_Id',
            'cen_cos_id'
          ]),
          estado: this.normalizarEstado(this.extraerTexto(fuente, [
            'estado',
            'Estado'
          ]))
        });

        this.cenCosDesPendiente = this.extraerTexto(fuente, [
          'cenCosDes',
          'Cen_Cos_Des',
          'cen_Cos_Des',
          'descripcionCentroCosto',
          'area'
        ]);

        this.cargandoDatosJefe = false;
        this.preseleccionarCentroCosto();
      },
      error: (error: unknown) => {
        console.error('Error consultando datos del jefe', error);
        this.cargandoDatosJefe = false;
        this.saveError = 'No se pudo cargar la información del jefe.';
      }
    });
  }

  private preseleccionarCentroCosto(): void {
    const cenCosIdActual = this.data?.jefe?.cenCosId;
    if (cenCosIdActual) {
      this.form.patchValue({ cenCosId: cenCosIdActual });
      return;
    }

    const cenCosIdDesdeFormulario = this.form.value.cenCosId;
    if (cenCosIdDesdeFormulario) {
      return;
    }

    if (!this.cenCosDesPendiente || !this.centroCostos.length) {
      return;
    }

    const coincidencia = this.centroCostos.find(
      (centro) =>
        centro.descripcion.trim().toUpperCase() ===
        this.cenCosDesPendiente.trim().toUpperCase()
    );

    if (coincidencia) {
      this.form.patchValue({ cenCosId: coincidencia.id });
    }
  }

  private extraerTexto(obj: any, keys: string[]): string {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return String(value).trim();
      }
    }
    return '';
  }

  private extraerNumero(obj: any, keys: string[]): number | null {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && value !== '') {
        const n = Number(value);
        if (!Number.isNaN(n)) {
          return n;
        }
      }
    }
    return null;
  }

  private normalizarEstado(value: unknown): string {
    const texto = String(value ?? '').trim().toUpperCase();

    if (texto === 'I' || texto === 'INACTIVO') {
      return 'I';
    }

    return 'A';
  }

  get nombreCtrl() {
    return this.form.controls.nombre;
  }

  get dniCtrl() {
    return this.form.controls.dni;
  }

  get cenCosIdCtrl() {
    return this.form.controls.cenCosId;
  }

  get estadoCtrl() {
    return this.form.controls.estado;
  }
}