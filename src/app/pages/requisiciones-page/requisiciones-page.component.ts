import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/Services/api.services';

@Component({
  selector: 'app-requisiciones-page',
  templateUrl: './requisiciones-page.component.html',
  styleUrls: ['./requisiciones-page.component.scss']
})
export class RequisicionesPageComponent implements OnInit {
  weatherData: any[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.getEjemploData();
  }

  get totalRecords(): number {
    return this.weatherData.length;
  }

  get averageTemperature(): string {
    const temperatures = this.weatherData
      .map((item) => Number(item?.temperatureC))
      .filter((value) => Number.isFinite(value));

    if (!temperatures.length) {
      return '--';
    }

    const total = temperatures.reduce((accumulator, value) => accumulator + value, 0);
    return `${Math.round(total / temperatures.length)} C`;
  }

  get latestSummary(): string {
    return this.weatherData[0]?.summary || 'Sin resumen';
  }

  getEjemploData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getWeatherForecast().subscribe({
      next: (response: any) => {
        console.log('Respuesta API:', response);

        if (Array.isArray(response)) {
          console.log('Formato detectado: arreglo directo');
          this.weatherData = response;
        } else if (Array.isArray(response?.elements)) {
          console.log('Formato detectado: response.elements');
          this.weatherData = response.elements;
        } else if (Array.isArray(response?.data)) {
          console.log('Formato detectado: response.data');
          this.weatherData = response.data;
        } else if (response) {
          console.log('Formato detectado: objeto unico u otro formato');
          this.weatherData = [response];
        } else {
          console.log('Formato detectado: respuesta vacia o null');
          this.weatherData = [];
        }

        console.log('Data asignada:', this.weatherData);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error consumiendo API:', error);
        this.weatherData = [];
        this.errorMessage = 'No se pudo cargar la informacion. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }
}
