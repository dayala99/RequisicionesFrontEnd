import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface RequisitionRow {
  requisicion: number;
  codigo: string;
  archivo: string;
  gerencia: string;
  fecha: string;
  proveedor: string;
  moneda: string;
  total: number;
  estado: string;
  codigoUsr: string;
  usrAprobacion: string;
  fechaUsrGa: string;
  gn: string;
  tipo: string;
}

interface CentroCostoRow {
  id: number;
  codigo: string;
  costo: string;
  porcentaje: number;
}

@Component({
  selector: 'app-requisiciones-page',
  templateUrl: './requisiciones-page.component.html',
  styleUrls: ['./requisiciones-page.component.scss']
})
export class RequisicionesPageComponent implements OnInit {
  readonly filtersForm: FormGroup;
  readonly cabeceraForm: FormGroup;
  readonly centroCostoForm: FormGroup;
  readonly detalleForm: FormGroup;
  readonly estadoOptions = ['Todos', 'Pendiente', 'Aprobado', 'Observado', 'Cerrado'];
  readonly gnOptions = ['Todos', 'GN', 'GA', 'GC'];
  readonly tipoOptions = ['Todos', 'Con O/C', 'Sin O/C'];
  readonly actionButtons = ['Nuevo', 'Modificar', 'Eliminar', 'Duplicar', 'Imprimir', 'Aprobar', 'Cerrar'];
  readonly tipoCompraOptions = ['Sin enlazar', 'Local', 'Importacion'];
  readonly ocOptions = ['Sin enlazar', 'Con O/C', 'Sin O/C'];
  readonly monedaOptions = ['Sin enlazar', 'PEN', 'USD'];

  requisiciones: RequisitionRow[] = [];
  centrosCosto: CentroCostoRow[] = [];
  editandoCentroCostoId: number | null = null;
  archivoAdjunto = 'Sin archivo adjunto';

  private nextCentroCostoId = 4;
  private readonly mockRequisiciones: RequisitionRow[] = [
    {
      requisicion: 1042,
      codigo: 'REQ-1042',
      archivo: 'PDF',
      gerencia: 'Finanzas',
      fecha: '04-26-2026',
      proveedor: 'Mirko Supplies',
      moneda: 'PEN',
      total: 1850.5,
      estado: 'Pendiente',
      codigoUsr: 'USR018',
      usrAprobacion: 'mramirez',
      fechaUsrGa: '04-26-2026',
      gn: 'GN',
      tipo: 'Con O/C'
    },
    {
      requisicion: 1038,
      codigo: 'REQ-1038',
      archivo: 'XLSX',
      gerencia: 'Operaciones',
      fecha: '04-25-2026',
      proveedor: 'Dominic Cargo',
      moneda: 'USD',
      total: 4299.9,
      estado: 'Aprobado',
      codigoUsr: 'USR024',
      usrAprobacion: 'cquispe',
      fechaUsrGa: '04-25-2026',
      gn: 'GA',
      tipo: 'Con O/C'
    },
    {
      requisicion: 1032,
      codigo: 'REQ-1032',
      archivo: 'DOC',
      gerencia: 'Sistemas',
      fecha: '04-24-2026',
      proveedor: 'Tech Lima',
      moneda: 'PEN',
      total: 980,
      estado: 'Observado',
      codigoUsr: 'USR011',
      usrAprobacion: 'jlopez',
      fechaUsrGa: '04-24-2026',
      gn: 'GC',
      tipo: 'Sin O/C'
    },
    {
      requisicion: 1027,
      codigo: 'REQ-1027',
      archivo: 'PDF',
      gerencia: 'Logistica',
      fecha: '04-23-2026',
      proveedor: 'Saturno Parts',
      moneda: 'USD',
      total: 12340.75,
      estado: 'Pendiente',
      codigoUsr: 'USR031',
      usrAprobacion: 'agarcia',
      fechaUsrGa: '04-23-2026',
      gn: 'GN',
      tipo: 'Sin O/C'
    },
    {
      requisicion: 1019,
      codigo: 'REQ-1019',
      archivo: 'ZIP',
      gerencia: 'Compras',
      fecha: '04-21-2026',
      proveedor: 'Planeta Industrial',
      moneda: 'PEN',
      total: 760.2,
      estado: 'Cerrado',
      codigoUsr: 'USR006',
      usrAprobacion: 'mrojas',
      fechaUsrGa: '04-22-2026',
      gn: 'GA',
      tipo: 'Con O/C'
    },
    {
      requisicion: 1015,
      codigo: 'REQ-1015',
      archivo: 'PDF',
      gerencia: 'Mantenimiento',
      fecha: '04-20-2026',
      proveedor: 'Andes Equipos',
      moneda: 'USD',
      total: 2140,
      estado: 'Pendiente',
      codigoUsr: 'USR027',
      usrAprobacion: 'mramirez',
      fechaUsrGa: '04-20-2026',
      gn: 'GN',
      tipo: 'Con O/C'
    }
  ];

  constructor(private readonly formBuilder: FormBuilder) {
    this.filtersForm = this.formBuilder.group({
      nroRequisicion: [''],
      proveedor: [''],
      estado: ['Pendiente'],
      gn: ['Todos'],
      tipo: ['Todos']
    });

    this.cabeceraForm = this.formBuilder.group({
      requisicionCompra: ['PED-1042'],
      usuarioAprobacion: ['mramirez']
    });

    this.centroCostoForm = this.formBuilder.group({
      centroCosto: ['CC-80 Obras'],
      fecha: ['04-26-2026']
    });

    this.detalleForm = this.formBuilder.group({
      ctaGastoCodigo: ['80'],
      ctaGastoDescripcion: ['Obras'],
      lugarEntrega: ['Los Rosales 555 Santa Anita'],
      almacen: ['13'],
      referencia: ['Compra de materiales para mantenimiento preventivo'],
      tipoCompra: ['Sin enlazar'],
      ocImportacion: ['0'],
      tipo: ['Sin enlazar'],
      oc: ['Sin enlazar'],
      moneda: ['Sin enlazar'],
      fechaEntrega: ['04-30-2026'],
      total: ['0'],
      sustento: ['Detalle preliminar de distribucion por centros de costo.'],
      archivo: ['Sin archivo adjunto']
    });
  }

  ngOnInit(): void {
    this.aplicarFiltros();
    this.centrosCosto = [
      { id: 1, codigo: 'CC-80 Obras', costo: 'Mantenimiento planta', porcentaje: 45 },
      { id: 2, codigo: 'CC-21 Logistica', costo: 'Despacho y almacen', porcentaje: 35 },
      { id: 3, codigo: 'CC-14 Sistemas', costo: 'Soporte operativo', porcentaje: 20 }
    ];
    this.archivoAdjunto = this.detalleForm.controls['archivo'].value;
  }

  get totalPorcentaje(): number {
    return this.centrosCosto.reduce((accumulator, item) => accumulator + item.porcentaje, 0);
  }

  aplicarFiltros(): void {
    const filters = this.filtersForm.getRawValue() as {
      nroRequisicion: string;
      proveedor: string;
      estado: string;
      gn: string;
      tipo: string;
    };
    const requisicionBuscada = Number(filters.nroRequisicion);
    const proveedorBuscado = filters.proveedor.trim().toLowerCase();

    this.requisiciones = this.mockRequisiciones.filter((item) => {
      const matchesRequisicion = !filters.nroRequisicion || item.requisicion === requisicionBuscada;
      const matchesProveedor = !proveedorBuscado || item.proveedor.toLowerCase().includes(proveedorBuscado);
      const matchesEstado = filters.estado === 'Todos' || item.estado === filters.estado;
      const matchesGn = filters.gn === 'Todos' || item.gn === filters.gn;
      const matchesTipo = filters.tipo === 'Todos' || item.tipo === filters.tipo;

      return matchesRequisicion && matchesProveedor && matchesEstado && matchesGn && matchesTipo;
    });
  }

  limpiarFiltros(): void {
    this.filtersForm.reset({
      nroRequisicion: '',
      proveedor: '',
      estado: 'Pendiente',
      gn: 'Todos',
      tipo: 'Todos'
    });
    this.aplicarFiltros();
  }

  formatTotal(total: number, moneda: string): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(total) + ` ${moneda}`;
  }

  agregarCentroCosto(): void {
    const codigo = this.centroCostoForm.controls['centroCosto'].value?.trim();

    if (!codigo) {
      return;
    }

    if (this.editandoCentroCostoId !== null) {
      this.centrosCosto = this.centrosCosto.map((item) =>
        item.id === this.editandoCentroCostoId
          ? {
              ...item,
              codigo,
              costo: this.detalleForm.controls['ctaGastoDescripcion'].value?.trim() || item.costo
            }
          : item
      );
      this.editandoCentroCostoId = null;
      return;
    }

    const porcentajeDisponible = Math.max(0, 100 - this.totalPorcentaje);
    const porcentaje = porcentajeDisponible >= 10 ? 10 : porcentajeDisponible;

    this.centrosCosto = [
      {
        id: this.nextCentroCostoId++,
        codigo,
        costo: this.detalleForm.controls['ctaGastoDescripcion'].value?.trim() || 'Nuevo centro de costo',
        porcentaje
      },
      ...this.centrosCosto
    ];
  }

  editarCentroCosto(item: CentroCostoRow): void {
    this.editandoCentroCostoId = item.id;
    this.centroCostoForm.patchValue({
      centroCosto: item.codigo
    });
    this.detalleForm.patchValue({
      ctaGastoDescripcion: item.costo
    });
  }

  eliminarCentroCosto(id: number): void {
    this.centrosCosto = this.centrosCosto.filter((item) => item.id !== id);

    if (this.editandoCentroCostoId === id) {
      this.cancelarEdicionCentroCosto();
    }
  }

  cancelarEdicionCentroCosto(): void {
    this.editandoCentroCostoId = null;
    this.centroCostoForm.patchValue({
      centroCosto: 'CC-80 Obras'
    });
    this.detalleForm.patchValue({
      ctaGastoDescripcion: 'Obras'
    });
  }

  adjuntarArchivo(): void {
    this.archivoAdjunto = 'sustento-pedido.pdf';
    this.detalleForm.patchValue({
      archivo: this.archivoAdjunto
    });
  }

  quitarArchivo(): void {
    this.archivoAdjunto = 'Sin archivo adjunto';
    this.detalleForm.patchValue({
      archivo: this.archivoAdjunto
    });
  }

  verArchivo(): void {
    this.archivoAdjunto = this.detalleForm.controls['archivo'].value || 'Sin archivo adjunto';
  }

  trackByRequisicion(_index: number, item: RequisitionRow): number {
    return item.requisicion;
  }

  trackByCentroCosto(_index: number, item: CentroCostoRow): number {
    return item.id;
  }
}
