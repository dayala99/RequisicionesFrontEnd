import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
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
  file?: File;
  url: string;
  nombre: string;
  ruta?: string;
  existente?: boolean;
}

type EstadoWeReport = 'A' | 'I';

type ComboKey = 'tipoReporte' | 'areaDetectada' | 'cliente' | 'subestacion' | 'potencial' | 'aplicaStopWork' | 'estado';

@Component({
  selector: 'app-we-report',
  templateUrl: './we-report.component.html',
  styleUrls: ['./we-report.component.scss']
})
export class WeReportComponent implements OnInit, OnChanges, OnDestroy {
  @Output() volver = new EventEmitter<void>();
  @Input() modoEdicion = false;
  @Input() weReportId: number | null = null;

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
    estado: false,
  };

  comboSearch: Record<ComboKey, string> = {
    tipoReporte: '',
    areaDetectada: '',
    cliente: '',
    subestacion: '',
    potencial: '',
    aplicaStopWork: '',
    estado: '',
  };

  cargandoReportante = false;
  cargandoTiposReporte = false;
  cargandoAreas = false;
  cargandoClientes = false;
  cargandoSubestaciones = false;
  guardando = false;
  cargandoEdicion = false;
  anonimoBloqueadoEnEdicion = false;
  private rutaFoto1Existente = '';
  private rutaFoto2Existente = '';

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
      estado: ['A', Validators.required],
    });
  }

  ngOnInit(): void {
    if (!this.modoEdicion) {
      this.cargarReportante();
    }
    this.cargarTiposReporte();
    this.cargarAreas();
    this.cargarClientes();
    if (this.modoEdicion && this.weReportId) {
      setTimeout(() => this.cargarDatosEdicion(this.weReportId as number), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['modoEdicion'] || changes['weReportId']) && this.modoEdicion && this.weReportId) {
      setTimeout(() => this.cargarDatosEdicion(this.weReportId as number), 0);
    }
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

  get reportanteNombreDisplay(): string {
    return this.modoEdicion && this.esAnonimo ? 'ANONIMO' : (this.reportante.nombre || '-');
  }

  get reportanteCargoDisplay(): string {
    return this.modoEdicion && this.esAnonimo ? 'ANONIMO' : (this.reportante.cargo || '-');
  }

  get reportanteAreaDisplay(): string {
    return this.modoEdicion && this.esAnonimo ? 'ANONIMO' : (this.reportante.area || '-');
  }

  get reportanteEmailDisplay(): string {
    return this.modoEdicion && this.esAnonimo ? 'ANONIMO' : (this.reportante.email || '-');
  }

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

  get estadoDisplay(): string {
    const estado = this.normalizarEstadoReporte(this.texto(this.form.get('estado')?.value));
    return estado === 'I' ? 'Inactivo' : 'Activo';
  }

  get estadoOptions(): Array<{ value: EstadoWeReport; label: string }> {
    return [
      { value: 'A', label: 'Activo' },
      { value: 'I', label: 'Inactivo' },
    ];
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
    this.comboOpen = { tipoReporte: false, areaDetectada: false, cliente: false, subestacion: false, potencial: false, aplicaStopWork: false, estado: false };
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

  private cargarDatosEdicion(weReportId: number): void {
    this.cargandoEdicion = true;
    this.apiService.getMostrarActualizarWeReport(weReportId).subscribe({
      next: (response: unknown) => {
        const item = this.extraerUnico<Record<string, unknown>>(response);
        if (!item) {
          this.cargandoEdicion = false;
          alert('No se pudo cargar la información del We Report para editar.');
          return;
        }

        this.rutaFoto1Existente = this.texto(item['Report_Foto1_Ubicacion'] ?? item['report_Foto1_Ubicacion']);
        this.rutaFoto2Existente = this.texto(item['Report_Foto2_Ubicacion'] ?? item['report_Foto2_Ubicacion']);

        const reporteId = this.toNumber(item['Reporte_Id'] ?? item['reporte_Id']);
        const areaId = this.toNumber(item['Cen_Cos_Id'] ?? item['cen_Cos_Id']);
        const clienteId = this.toNumber(item['Cliente_Id'] ?? item['cliente_Id']);
        const subId = this.toNumber(item['Subestacion_Id'] ?? item['subestacion_Id']);
        const estado = this.normalizarEstadoReporte(this.texto(item['Estado'] ?? item['estado']));

        const esAnonimo = this.normalizarMarca(this.texto(item['Report_Anonimo'] ?? item['report_Anonimo'])) === 'S';
        this.anonimoBloqueadoEnEdicion = esAnonimo;

        if (esAnonimo) {
          this.reportante = {
            nombre: 'ANONIMO',
            cargo: 'ANONIMO',
            area: 'ANONIMO',
            email: 'ANONIMO',
          };
        } else {
          this.reportante = {
            nombre: this.texto(item['Usr_Nom'] ?? item['usr_Nom']) || this.reportante.nombre,
            cargo: this.texto(item['Cargo_Nombre'] ?? item['cargo_Nombre']) || this.reportante.cargo,
            area: this.texto(item['Cen_Cos_Des_Usr'] ?? item['cen_Cos_Des_Usr'] ?? item['Cen_Cos_Des'] ?? item['cen_Cos_Des']) || this.reportante.area,
            email: this.texto(item['Usr_Corr'] ?? item['usr_Corr']) || this.reportante.email,
          };
        }

        this.form.patchValue({
          anonimo: esAnonimo,
          tipoReporte: reporteId || '',
          areaDetectada: areaId || '',
          cliente: clienteId || '',
          subestacion: subId || '',
          descripcionEvento: this.texto(item['Report_Descripcion'] ?? item['report_Descripcion']),
          accionesInmediatas: this.texto(item['Report_Acciones_Inmediata'] ?? item['report_Acciones_Inmediata']),
          accionesPropuestas: this.texto(item['Report_Acciones_Propuestas'] ?? item['report_Acciones_Propuestas']),
          potencial: this.texto(item['Report_Potencial'] ?? item['report_Potencial']) || 'MEDIO',
          aplicaStopWork: this.normalizarMarca(this.texto(item['Report_Aplica'] ?? item['report_Aplica'])) === 'S' ? 'SI' : 'NO',
          estado,
        });

        if (esAnonimo) {
          this.form.get('anonimo')?.disable({ emitEvent: false });
        } else {
          this.form.get('anonimo')?.enable({ emitEvent: false });
        }

        this.fotosEvento = this.crearArchivosExistentesDesdeRutas(this.rutaFoto1Existente, 'Foto 1');
        this.fotosAcciones = this.crearArchivosExistentesDesdeRutas(this.rutaFoto2Existente, 'Foto 2');
        this.actualizarRutasExistentesDesdeLista('evento', this.fotosEvento);
        this.actualizarRutasExistentesDesdeLista('acciones', this.fotosAcciones);

        if (clienteId) {
          this.cargarSubestacionesPorCliente(clienteId);
        }

        this.cargandoEdicion = false;
      },
      error: () => {
        this.cargandoEdicion = false;
        alert('No se pudo cargar la información del We Report para editar.');
      }
    });
  }


private dividirRutas(rutas: string): string[] {
  return (rutas ?? '')
    .split(/[\r\n|;,]+/g)
    .map((r: string) => r.trim())
    .filter((r: string) => r.length > 0);
}

private crearArchivosExistentesDesdeRutas(rutas: string, prefijo: string): ArchivoImagenItem[] {
  const lista = this.dividirRutas(rutas);
  if (lista.length === 0) {
    return [];
  }

  return lista.map((ruta: string, index: number) => {
    const nombre = ruta.split(/[\\\/]/).pop() || `${prefijo} ${index + 1}`;
    return this.crearArchivoExistente(ruta, nombre);
  });
}

  private texto(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  return String(valor).trim();
}

private normalizarTexto(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

private normalizarEstadoReporte(valor: string): EstadoWeReport {
  const limpio = this.normalizarTexto(valor);
  if (limpio.startsWith('i') || limpio.includes('inactivo')) {
    return 'I';
  }
  return 'A';
}

private crearArchivoExistente(ruta: string, nombre: string): ArchivoImagenItem {
  return {
    id: `existente-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    url: '',
    nombre,
    ruta,
    existente: true
  };
}

private obtenerMimeType(nombreArchivo: string): string {
  const ext = (nombreArchivo || '').split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'bmp': return 'image/bmp';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

private encontrarIdPorTexto<T>(lista: T[], campo: string, valor: string): number | '' {
  const buscado = this.normalizarTexto((valor ?? '').trim());
  if (!buscado) { return ''; }

  const encontrado = lista.find(item => {
    const record = item as Record<string, unknown>;
    return this.normalizarTexto(this.texto(record[campo])).includes(buscado);
  });

  if (!encontrado) { return ''; }

  const id = encontrado as Record<string, unknown>;
  for (const key of ['Reporte_Id', 'Cen_Cos_Id', 'Cliente_Id', 'Subestacion_Id']) {
    if (typeof id[key] === 'number' || typeof id[key] === 'string') {
      const n = Number(id[key]);
      if (!Number.isNaN(n) && n > 0) { return n; }
    }
  }
  return '';
}

private normalizarMarca(valor: string): string {
  const limpio = (valor ?? '').trim().toUpperCase();
  if (limpio.startsWith('S') || limpio.startsWith('Y') || limpio === 'SI') { return 'S'; }
  return 'N';
}

private extraerUnico<T>(response: unknown): T | null {
  if (Array.isArray(response) && response.length > 0) { return response[0] as T; }
  if (response && typeof response === 'object') {
    const r = response as Record<string, unknown>;
    for (const k of ['Elements','elements','Data','data','Result','result','items','Items','response','Response']) {
      const v = r[k];
      if (Array.isArray(v) && v.length > 0) { return v[0] as T; }
    }
    return response as unknown as T;
  }
  return null;
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
    formData.append('Estado', this.normalizarEstadoReporte(this.texto(this.form.get('estado')?.value)));
    formData.append('Usr_Reg', usrCod);
    formData.append('Usr_Mod', usrCod);

    if (this.modoEdicion && this.weReportId) {
      formData.append('We_Report_Id', String(this.weReportId));
      if (foto1) { formData.append('Report_Foto1', foto1, foto1.name); } else if (this.rutaFoto1Existente) { formData.append('Report_Foto1_Ubicacion', this.rutaFoto1Existente); }
      if (foto2) { formData.append('Report_Foto2', foto2, foto2.name); } else if (this.rutaFoto2Existente) { formData.append('Report_Foto2_Ubicacion', this.rutaFoto2Existente); }
    } else {
      if (foto1) { formData.append('Report_Foto1', foto1, foto1.name); }
      if (foto2) { formData.append('Report_Foto2', foto2, foto2.name); }
    }

    this.guardando = true;
    const peticion = this.modoEdicion ? this.apiService.postActualizarWeReport(formData) : this.apiService.postInsertarWeReport(formData);
    peticion.subscribe({
      next: (response: unknown) => {
        this.guardando = false;
        console.log('[WeReport] guardado correctamente', response);
        this.form.reset({ anonimo: false, aplicaStopWork: 'NO', estado: 'A' });
        this.form.get('anonimo')?.enable({ emitEvent: false });
        this.anonimoBloqueadoEnEdicion = false;
        this.liberarArchivos(this.fotosEvento);
        this.liberarArchivos(this.fotosAcciones);
        this.fotosEvento = [];
        this.fotosAcciones = [];
        this.subestaciones = [];
        this.rutaFoto1Existente = '';
        this.rutaFoto2Existente = '';
        this.volver.emit();
      },
      error: (err: unknown) => {
        this.guardando = false;
        console.error('[WeReport] error al guardar', err);
        alert('No se pudo guardar We Report. Revisa los datos y vuelve a intentar.');
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
    if (archivo.existente && archivo.ruta) {
      this.apiService.getArchivoWeReport(archivo.ruta).subscribe({
        next: (blob: ArrayBuffer) => {
          const mimeType = this.obtenerMimeType(archivo.nombre);
          const fileBlob = new Blob([blob], { type: mimeType });
          const objectUrl = URL.createObjectURL(fileBlob);
          window.open(objectUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
        },
        error: () => alert('No se pudo abrir la imagen existente.')
      });
      return;
    }

    if (archivo.url) {
      window.open(archivo.url, '_blank', 'noopener,noreferrer');
    }
  }

  eliminarArchivo(tipo: 'evento' | 'acciones', id: string): void {
    if (tipo === 'evento') {
      const encontrado = this.fotosEvento.find(item => item.id === id);
      this.fotosEvento = this.removerArchivo(this.fotosEvento, id);
      if (encontrado?.existente) {
        this.actualizarRutasExistentesDesdeLista('evento', this.fotosEvento);
      }
    } else {
      const encontrado = this.fotosAcciones.find(item => item.id === id);
      this.fotosAcciones = this.removerArchivo(this.fotosAcciones, id);
      if (encontrado?.existente) {
        this.actualizarRutasExistentesDesdeLista('acciones', this.fotosAcciones);
      }
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
      url: URL.createObjectURL(file),
      nombre: file.name,
      existente: false
    };

    this.limpiarRutasExistentes(tipo);

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
    if (encontrado && !encontrado.existente && encontrado.url) { URL.revokeObjectURL(encontrado.url); }
    return lista.filter(item => item.id !== id);
  }

  private limpiarRutasExistentes(tipo: 'evento' | 'acciones'): void {
    if (tipo === 'evento') {
      this.rutaFoto1Existente = '';
    } else {
      this.rutaFoto2Existente = '';
    }
  }

  private actualizarRutasExistentesDesdeLista(tipo: 'evento' | 'acciones', lista: ArchivoImagenItem[]): void {
    const rutas = lista
      .filter(item => item.existente && !!item.ruta)
      .map(item => item.ruta!.trim())
      .filter(ruta => ruta.length > 0);

    const rutasUnicas = Array.from(new Set(rutas));
    const valor = rutasUnicas.join('\n');

    if (tipo === 'evento') {
      this.rutaFoto1Existente = valor;
    } else {
      this.rutaFoto2Existente = valor;
    }
  }

  private liberarArchivos(lista: ArchivoImagenItem[]): void {
    for (const archivo of lista) {
      if (!archivo.existente && archivo.url) {
        URL.revokeObjectURL(archivo.url);
      }
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
