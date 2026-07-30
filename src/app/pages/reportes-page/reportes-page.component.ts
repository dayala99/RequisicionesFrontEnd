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
      description: 'Abre el panel base para consultar el kardex general y luego conectarlo con su endpoint.',
      route: '/reportes/kardex-general',
      endpoint: 'getGenerarKardexGeneral'
    }
  ];
}
