import { Component } from '@angular/core';

interface ReporteAccesoDirecto {
  title: string;
  description: string;
  route: string;
  endpoint: string;
}

@Component({
  selector: 'app-reportes-page',
  templateUrl: './reportes-page.component.html',
  styleUrls: ['./reportes-page.component.scss']
})
export class ReportesPageComponent {
  readonly reportes: ReporteAccesoDirecto[] = [
    {
      title: 'Kardex General',
      description: 'Consulta el kardex general y filtra los movimientos por ítem.',
      route: '/reportes/kardex-general',
      endpoint: 'getGenerarKardexGeneral'
    },
    {
      title: 'Ingresos y Salidas de Almacén',
      description: 'Consulta los movimientos de almacén por solicitante, fechas, centro de costo y proveedor.',
      route: '/reportes/ingresos-salidas-almacen',
      endpoint: 'getReporteIngresoSalidasAlmacen'
    }
  ];
}
