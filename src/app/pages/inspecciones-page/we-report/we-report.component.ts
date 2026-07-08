import { Component, ElementRef, EventEmitter, HostListener, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiService, TipoReporteItem } from 'src/app/Services/api.services';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { ConfirmacionAccionDialogComponent } from '../confirmacion-accion-dialog.component';
import { FotoSourceChoice, SeleccionCapturaFotoDialogComponent } from '../seleccion-captura-foto-dialog.component';
import { CapturaFotoDialogComponent } from '../captura-foto-dialog.component';

interface ReportanteDatos {
  nombre: string;
  cargo: string;
  area: string;
  email: string;
}

interface CentroCostoItem {
  Cen_Cos_Id: number;
  Cen_Cos_Des: string;
}

interface ClienteItem {
  Cliente_Id: number;
  Cliente_Nombre: string;
}

interface SubestacionItem {
  Subestacion_Id: number;
  Subestacion_Nombre: string;
}

interface ArchivoImagenItem {
  id: string;
  file: File;
  url: string;
}

type ComboKey = 'tipoReporte' | 'areaDetectada' | 'cliente' | 'subestacion' | 'potencial' | 'aplicaStopWork';

@Component({
  selector: 'app-we-report',
  templateUrl: './we-report.component.html',
  styleUrls: ['./we-report.component.scss']
})
export class WeReportComponent implements OnInit, OnDestroy {
  @Output() volver = new EventEmitter<void>();

  @ViewChild('fotoEventoCameraInput') private fotoEventoCameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('fotoEventoGalleryInput') private fotoEventoGalleryInput?: ElementRef<HTMLInputElement>;
  @ViewChild('fotoAccionesCameraInput') private fotoAccionesCameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('fotoAccionesGalleryInput') private fotoAccionesGalleryInput?: ElementRef<HTMLInputElement>;

  readonly form: FormGroup;

  reportante: ReportanteDatos = { nombre: '', cargo: '', area: '', email: '' };

  tiposReporte: TipoReporteItem[] = [];
  areas: CentroCostoItem[] = [];
  clientes: ClienteItem[] = [];
  subestaciones: SubestacionItem[] = [];

  fotosEvento: ArchivoImagenItem[] = [];
  fotosAcciones: ArchivoImagenItem[] = [];

  comboOpen: Record<ComboKey, boolean> = {
    tipoReporte: false,
    areaDetectada: false,
    cliente: false,
    subestacion: false,
    potencial: false,
    aplicaStopWork: false,
  };

  comboSearch: Record<ComboKey, string> = {
    tipoReporte: '',
    areaDetectada: '',
    cliente: '',
    subestacion: '',
    potencial: '',
    aplicaStopWork: '',
  };

  cargandoReportante = false;
  cargandoTiposReporte = false;
  cargandoAreas = false;
  cargandoClientes = false;
  cargandoSubestaciones = false;
  guardando = false;



  constructor(
    private readonly fb: FormBuilder,
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {
    this.form = this.fb.group({
      anonimo: [false],
      tipoReporte: ['', Validators.required],
      areaDetectada: ['', Validators.required],
      cliente: ['', Validators.required],
      subestacion: ['', Validators.required],
      descripcionEvento: ['', Validators.required],
      accionesInmediatas: ['', Validators.required],
      accionesPropuestas: ['', Validators.required],
      potencial: ['', Validators.required],
      aplicaStopWork: ['NO', Validators.required],
    });
  }

  ngOnInit(): void {
    this.cargarReportante();
    this.cargarTiposReporte();
    this.cargarAreas();
    this.cargarClientes();
  }

  ngOnDestroy(): void {
    this.liberarArchivos(this.fotosEvento);
    this.liberarArchivos(this.fotosAcciones);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.closeCombos();
    }
  }

  get esAnonimo(): boolean {
    return !!this.form.get('anonimo')?.value;
  }

  get reportanteNombre(): string { return this.reportante.nombre || '-'; }
  get reportanteCargo(): string { return this.reportante.cargo || '-'; }
  get reportanteArea(): string { return this.reportante.area || '-'; }
  get reportanteEmail(): string { return this.reportante.email || '-'; }

  get tipoReporteDisplay(): string {
    const id = this.toNumber(this.form.get('tipoReporte')?.value);
    return this.tiposReporte.find(item => this.toNumber(item.Reporte_Id) === id)?.Reporte_Tipo?.trim() || 'Seleccione';
  }

  get areaDisplay(): string {
    const id = this.toNumber(this.form.get('areaDetectada')?.value);
    return this.areas.find(item => this.toNumber(item.Cen_Cos_Id) === id)?.Cen_Cos_Des?.trim() || 'Seleccione';
  }

  get clienteDisplay(): string {
    const id = this.toNumber(this.form.get('cliente')?.value);
    return this.clientes.find(item => this.toNumber(item.Cliente_Id) === id)?.Cliente_Nombre?.trim() || 'Seleccione';
  }

  get subestacionDisplay(): string {
    const id = this.toNumber(this.form.get('subestacion')?.value);
    return this.subestaciones.find(item => this.toNumber(item.Subestacion_Id) === id)?.Subestacion_Nombre?.trim() || 'Seleccione';
  }

  get potencialDisplay(): string {
    return (this.form.get('potencial')?.value || 'Seleccione').toString();
  }

  get stopWorkDisplay(): string {
    return (this.form.get('aplicaStopWork')?.value || 'NO').toString();
  }

  get potencialOptions(): string[] {
    return ['ALTO', 'MEDIO', 'BAJO'];
  }

  get stopWorkOptions(): Array<'NO' | 'SI'> {
    return ['NO', 'SI'];
  }

  get tiposReporteFiltrados(): TipoReporteItem[] {
    return this.filtrarLista(this.tiposReporte, this.comboSearch.tipoReporte, item => `${item.Reporte_Id} ${item.Reporte_Tipo}`);
  }

  get areasFiltradas(): CentroCostoItem[] {
    return this.filtrarLista(this.areas, this.comboSearch.areaDetectada, item => `${item.Cen_Cos_Id} ${item.Cen_Cos_Des}`);
  }

  get clientesFiltrados(): ClienteItem[] {
    return this.filtrarLista(this.clientes, this.comboSearch.cliente, item => `${item.Cliente_Id} ${item.Cliente_Nombre}`);
  }

  get subestacionesFiltradas(): SubestacionItem[] {
    return this.filtrarLista(this.subestaciones, this.comboSearch.subestacion, item => `${item.Subestacion_Id} ${item.Subestacion_Nombre}`);
  }

  retroceder(): void {
    const dialogRef = this.dialog.open(ConfirmacionAccionDialogComponent, {
      width: '460px',
      disableClose: true,
      panelClass: 'animated-dialog-pane',
      data: {
        titulo: 'Cancelar We Report',
        mensaje: 'Se cerrará el formulario de We Report y se perderán los cambios no guardados.',
        textoConfirmar: 'Confirmar cancelación',
        textoCancelar: 'Volver',
        tipo: 'normal'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) { this.volver.emit(); }
    });
  }

  toggleCombo(combo: ComboKey): void {
    const abrir = !this.comboOpen[combo];
    this.closeCombos();
    if (abrir) {
      this.comboOpen[combo] = true;
      this.comboSearch[combo] = '';
    }
  }

  closeCombos(): void {
    this.comboOpen = { tipoReporte: false, areaDetectada: false, cliente: false, subestacion: false, potencial: false, aplicaStopWork: false };
  }

  onSearchChange(combo: ComboKey, event: Event): void {
    this.comboSearch[combo] = (event.target as HTMLInputElement).value ?? '';
  }

  selectTipoReporte(item: TipoReporteItem | null): void {
    this.form.patchValue({ tipoReporte: item?.Reporte_Id ?? '' });
    this.comboSearch.tipoReporte = '';
    this.closeCombos();
  }

  selectArea(item: CentroCostoItem | null): void {
    this.form.patchValue({ areaDetectada: item?.Cen_Cos_Id ?? '' });
    this.comboSearch.areaDetectada = '';
    this.closeCombos();
  }

  selectCliente(item: ClienteItem | null): void {
    const clienteId = item?.Cliente_Id ?? 0;
    this.form.patchValue({ cliente: clienteId || '', subestacion: '' });
    this.comboSearch.cliente = '';
    this.comboSearch.subestacion = '';
    this.closeCombos();
    this.cargarSubestacionesPorCliente(clienteId);
  }

  selectSubestacion(item: SubestacionItem | null): void {
    this.form.patchValue({ subestacion: item?.Subestacion_Id ?? '' });
    this.comboSearch.subestacion = '';
    this.closeCombos();
  }

  selectPotencial(value: string): void {
    this.form.patchValue({ potencial: value });
    this.closeCombos();
  }

  selectStopWork(value: 'NO' | 'SI'): void {
    this.form.patchValue({ aplicaStopWork: value });
    this.closeCombos();
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      alert('Completa los datos obligatorios antes de continuar.');
      return;
    }

    const aplicaStopWork = (this.form.get('aplicaStopWork')?.value ?? 'NO') as string;
    if (aplicaStopWork === 'SI') {
      alert('Al seleccionar "Sí" en Aplica Stop Work, debes completar el formato Stop Work.');
      return;
    }

    const usrCod = (this.authService.getCurrentUser?.() ?? '').trim();
    if (!usrCod) {
      alert('No se encontró el usuario autenticado.');
      return;
    }

    const foto1 = this.fotosEvento[0]?.file ?? null;
    const foto2 = this.fotosAcciones[0]?.file ?? null;

    const formData = new FormData();
    formData.append('Usr_Cod', usrCod);
    formData.append('Report_Anonimo', this.esAnonimo ? 'S' : 'N');
    formData.append('Reporte_Id', String(this.toNumber(this.form.get('tipoReporte')?.value)));
    formData.append('Cen_Cos_Id', String(this.toNumber(this.form.get('areaDetectada')?.value)));
    formData.append('Cliente_Id', String(this.toNumber(this.form.get('cliente')?.value)));
    formData.append('Subestacion_Id', String(this.toNumber(this.form.get('subestacion')?.value)));
    formData.append('Report_Descripcion', String(this.form.get('descripcionEvento')?.value ?? ''));
    formData.append('Report_Acciones_Inmediata', String(this.form.get('accionesInmediatas')?.value ?? ''));
    formData.append('Report_Acciones_Propuestas', String(this.form.get('accionesPropuestas')?.value ?? ''));
    formData.append('Report_Potencial', String(this.form.get('potencial')?.value ?? ''));
    formData.append('Report_Aplica', aplicaStopWork === 'SI' ? 'S' : 'N');
    formData.append('Usr_Reg', usrCod);

    if (foto1) {
      formData.append('Report_Foto1', foto1, foto1.name);
    }
    if (foto2) {
      formData.append('Report_Foto2', foto2, foto2.name);
    }
    const fd = formData as any;

    this.guardando = true;
    this.apiService.postInsertarWeReport(formData).subscribe({
      next: (response: unknown) => {
        this.guardando = false;
        console.log('[WeReport] guardado correctamente', response);
        this.form.reset({ anonimo: false, aplicaStopWork: 'NO' });
        this.liberarArchivos(this.fotosEvento);
        this.liberarArchivos(this.fotosAcciones);
        this.fotosEvento = [];
        this.fotosAcciones = [];
        this.subestaciones = [];
        this.volver.emit();
      },
      error: (err: unknown) => {
        this.guardando = false;
        console.error('[WeReport] error al guardar', err);
        alert('No se pudo registrar We Report. Revisa los datos y vuelve a intentar.');
      }
    });
  }

  abrirSelectorArchivo(tipo: 'evento' | 'acciones'): void {
    const dialogRef = this.dialog.open(SeleccionCapturaFotoDialogComponent, {
      width: '420px',
      disableClose: true,
      panelClass: 'animated-dialog-pane',
      data: {
        titulo: 'Agregar foto',
        mensaje: 'Elige si deseas tomar una foto con la cámara o seleccionar una imagen desde tu dispositivo.'
      }
    });

    dialogRef.afterClosed().subscribe((opcion: FotoSourceChoice | null) => {
      if (opcion === 'camera') {
        if (this.esDispositivoMovil()) {
          // En celulares se usa la app de cámara nativa del sistema operativo
          this.clickInput(tipo, 'camera');
        } else {
          this.abrirCapturaCamara(tipo);
        }
      }
      if (opcion === 'gallery') {
        this.clickInput(tipo, 'gallery');
      }
    });
  }

  private esDispositivoMovil(): boolean {
    const ua = navigator.userAgent || (navigator as any).vendor || '';
    return /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua);
  }

  private abrirCapturaCamara(tipo: 'evento' | 'acciones'): void {
    const dialogRef = this.dialog.open(CapturaFotoDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      disableClose: true,
      panelClass: 'animated-dialog-pane',
      data: { titulo: 'Tomar foto' }
    });

    dialogRef.afterClosed().subscribe((file: File | null) => {
      if (file) {
        this.agregarArchivoDirecto(tipo, file);
      }
    });
  }

  onFotoEventoChange(event: Event): void { this.agregarArchivos(event, 'evento'); }
  onFotoAccionesChange(event: Event): void { this.agregarArchivos(event, 'acciones'); }

  abrirArchivo(archivo: ArchivoImagenItem): void {
    window.open(archivo.url, '_blank', 'noopener,noreferrer');
  }

  eliminarArchivo(tipo: 'evento' | 'acciones', id: string): void {
    if (tipo === 'evento') {
      this.fotosEvento = this.removerArchivo(this.fotosEvento, id);
    } else {
      this.fotosAcciones = this.removerArchivo(this.fotosAcciones, id);
    }
  }

  trackByArchivoId(_: number, archivo: ArchivoImagenItem): string { return archivo.id; }

  trackByTipoReporte = (_: number, item: TipoReporteItem): number => this.toNumber(item.Reporte_Id);
  trackByArea = (_: number, item: CentroCostoItem): number => this.toNumber(item.Cen_Cos_Id);
  trackByCliente = (_: number, item: ClienteItem): number => this.toNumber(item.Cliente_Id);
  trackBySubestacion = (_: number, item: SubestacionItem): number => this.toNumber(item.Subestacion_Id);

  private clickInput(tipo: 'evento' | 'acciones', source: FotoSourceChoice): void {
    const input = tipo === 'evento'
      ? (source === 'camera' ? this.fotoEventoCameraInput : this.fotoEventoGalleryInput)
      : (source === 'camera' ? this.fotoAccionesCameraInput : this.fotoAccionesGalleryInput);

    input?.nativeElement.click();
  }

  private agregarArchivos(event: Event, tipo: 'evento' | 'acciones'): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) { return; }

    for (const file of files) {
      this.agregarArchivoDirecto(tipo, file);
    }

    input.value = '';
  }

  private agregarArchivoDirecto(tipo: 'evento' | 'acciones', file: File): void {
    const nuevo: ArchivoImagenItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      file,
      url: URL.createObjectURL(file)
    };

    if (tipo === 'evento') {
      this.liberarArchivos(this.fotosEvento);
      this.fotosEvento = [nuevo];
    } else {
      this.liberarArchivos(this.fotosAcciones);
      this.fotosAcciones = [nuevo];
    }
  }

  private removerArchivo(lista: ArchivoImagenItem[], id: string): ArchivoImagenItem[] {
    const encontrado = lista.find(item => item.id === id);
    if (encontrado) { URL.revokeObjectURL(encontrado.url); }
    return lista.filter(item => item.id !== id);
  }

  private liberarArchivos(lista: ArchivoImagenItem[]): void {
    for (const archivo of lista) {
      URL.revokeObjectURL(archivo.url);
    }
  }

  private cargarReportante(): void {
    const usrCod = (this.authService.getCurrentUser?.() ?? '').trim();
    if (!usrCod) { return; }

    this.cargandoReportante = true;
    this.apiService.getConsultaDatosUsuario({ Usr_Cod: usrCod }).subscribe({
      next: (response: unknown) => {
        const record = this.extractFirstRecord(response);
        this.reportante = {
          nombre: this.getRecordValue(record, ['Usr_Nom', 'usr_Nom']) || this.authService.getCurrentUserName(),
          cargo: this.getRecordValue(record, ['Cargo_Nombre', 'cargo_Nombre', 'cargoNombre']),
          area: this.getRecordValue(record, ['Cen_Cos_Des', 'cen_Cos_Des', 'areaDescripcion']),
          email: this.getRecordValue(record, ['Usr_Corr', 'usr_Corr', 'correo', 'Correo']),
        };
        this.cargandoReportante = false;
      },
      error: () => {
        this.reportante = {
          nombre: this.authService.getCurrentUserName() || usrCod,
          cargo: '',
          area: '',
          email: '',
        };
        this.cargandoReportante = false;
      }
    });
  }

  private cargarTiposReporte(): void {
    this.cargandoTiposReporte = true;
    this.apiService.getListarTiposReporte().subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.tiposReporte = raw
          .map(item => ({
            Reporte_Id: this.toNumber(item['Reporte_Id'] ?? item['reporte_Id']),
            Reporte_Tipo: this.getRecordValue(item, ['Reporte_Tipo', 'reporte_Tipo', 'Reporte', 'reporte'])
          }))
          .filter(item => item.Reporte_Id > 0 || !!item.Reporte_Tipo)
          .sort((a, b) => a.Reporte_Tipo.localeCompare(b.Reporte_Tipo, 'es', { sensitivity: 'base' }));
        this.cargandoTiposReporte = false;
      },
      error: () => {
        this.tiposReporte = [];
        this.cargandoTiposReporte = false;
      }
    });
  }

  private cargarAreas(): void {
    this.cargandoAreas = true;
    this.apiService.getListarCentroCostoParaJefe().subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.areas = raw
          .map(item => ({
            Cen_Cos_Id: this.toNumber(item['Cen_Cos_Id'] ?? item['cen_Cos_Id']),
            Cen_Cos_Des: this.getRecordValue(item, ['Cen_Cos_Des', 'cen_Cos_Des', 'CentroCosto', 'centroCosto'])
          }))
          .filter(item => item.Cen_Cos_Id > 0 || !!item.Cen_Cos_Des)
          .sort((a, b) => a.Cen_Cos_Des.localeCompare(b.Cen_Cos_Des, 'es', { sensitivity: 'base' }));
        this.cargandoAreas = false;
      },
      error: () => {
        this.areas = [];
        this.cargandoAreas = false;
      }
    });
  }

  private readonly CLIENTES_PERMITIDOS = [2, 3, 4];

  private cargarClientes(): void {
    this.cargandoClientes = true;
    this.apiService.getListarInsClientes().subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.clientes = raw
          .map(item => ({
            Cliente_Id: this.toNumber(item['Cliente_Id'] ?? item['cliente_Id']),
            Cliente_Nombre: this.getRecordValue(item, ['Cliente_Nombre', 'cliente_Nombre', 'Nombre', 'nombre'])
          }))
          .filter(item => this.CLIENTES_PERMITIDOS.includes(item.Cliente_Id))
          .sort((a, b) => a.Cliente_Nombre.localeCompare(b.Cliente_Nombre, 'es', { sensitivity: 'base' }));
        this.cargandoClientes = false;
      },
      error: () => {
        this.clientes = [];
        this.cargandoClientes = false;
      }
    });
  }

  private cargarSubestacionesPorCliente(clienteId: number): void {
    if (!clienteId) {
      this.subestaciones = [];
      return;
    }

    this.cargandoSubestaciones = true;
    this.apiService.getSubEstacionesPorCliente(clienteId).subscribe({
      next: (response: unknown) => {
        const raw = this.extraerLista<Record<string, unknown>>(response);
        this.subestaciones = raw
          .map(item => ({
            Subestacion_Id: this.toNumber(item['Subestacion_Id'] ?? item['subestacion_Id']),
            Subestacion_Nombre: this.getRecordValue(item, ['Subestacion_Nombre', 'subestacion_Nombre', 'Nombre', 'nombre'])
          }))
          .filter(item => item.Subestacion_Id > 0 || !!item.Subestacion_Nombre)
          .sort((a, b) => a.Subestacion_Nombre.localeCompare(b.Subestacion_Nombre, 'es', { sensitivity: 'base' }));
        this.cargandoSubestaciones = false;
      },
      error: () => {
        this.subestaciones = [];
        this.cargandoSubestaciones = false;
      }
    });
  }

  private extraerLista<T>(response: unknown): T[] {
    const visited = new Set<object>();

    const buscar = (value: unknown, depth: number): T[] => {
      if (depth < 0 || value === null || value === undefined) {
        return [];
      }

      if (Array.isArray(value)) {
        return value as T[];
      }

      if (typeof value !== 'object') {
        return [];
      }

      const obj = value as Record<string, unknown>;
      if (visited.has(obj)) {
        return [];
      }
      visited.add(obj);

      const directCandidates = [
        obj['Elements'],
        obj['elements'],
        obj['Data'],
        obj['data'],
        obj['Result'],
        obj['result'],
        obj['Rows'],
        obj['rows'],
        obj['Table'],
        obj['table'],
        obj['Value'],
        obj['value'],
      ];

      for (const candidate of directCandidates) {
        const found = buscar(candidate, depth - 1);
        if (found.length > 0) {
          return found;
        }
      }

      for (const key of Object.keys(obj)) {
        const found = buscar(obj[key], depth - 1);
        if (found.length > 0) {
          return found;
        }
      }

      return [];
    };

    return buscar(response, 5);
  }

  private extractFirstRecord(response: unknown): Record<string, unknown> {
    const list = this.extraerLista<Record<string, unknown>>(response);
    return list.length > 0 ? list[0] : {};
  }

  private getRecordValue<T extends object>(record: T, keys: string[]): string {
    const source = record as Record<string, unknown>;
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value);
      }
    }
    return '';
  }

  private filtrarLista<T>(lista: T[], search: string, toText: (item: T) => string): T[] {
    const termino = (search || '').trim().toLowerCase();
    if (!termino) { return lista; }
    return lista.filter(item => toText(item).toLowerCase().includes(termino));
  }

  private toNumber(value: unknown): number {
    if (value === undefined || value === null || value === '') { return 0; }
    const numeric = Number(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  }
}
