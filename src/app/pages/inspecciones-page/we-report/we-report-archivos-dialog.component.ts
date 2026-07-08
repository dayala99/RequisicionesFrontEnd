import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from 'src/app/Services/api.services';

export interface WeReportArchivosDialogData {
  codigo?: string;
  tipoReporte?: string;
  area?: string;
  cliente?: string;
  descripcionEvento?: string;
  accionesInmediatas?: string;
  foto1Ruta?: string;
  foto2Ruta?: string;
  Report_Descripcion?: string;
  Report_Acciones_Inmediata?: string;
  Report_Foto1_Ubicacion?: string;
  Report_Foto2_Ubicacion?: string;
}

interface VistaArchivo {
  etiqueta: string;
  seccion: string;
  ruta: string;
  nombre: string;
}

interface SeccionArchivos {
  titulo: string;
  descripcion: string;
  archivos: VistaArchivo[];
}

@Component({
  selector: 'app-we-report-archivos-dialog',
  templateUrl: './we-report-archivos-dialog.component.html',
  styleUrls: ['./we-report-archivos-dialog.component.scss']
})
export class WeReportArchivosDialogComponent {
  readonly secciones: SeccionArchivos[];

  constructor(
    private readonly apiService: ApiService,
    private readonly dialogRef: MatDialogRef<WeReportArchivosDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: WeReportArchivosDialogData
  ) {
    this.secciones = [
      {
        titulo: 'Descripción del Evento',
        descripcion: this.obtenerTexto(data.descripcionEvento, data.Report_Descripcion),
        archivos: this.crearArchivos('Foto 1', this.obtenerTexto(data.foto1Ruta, data.Report_Foto1_Ubicacion)),
      },
      {
        titulo: 'Acciones Inmediatas',
        descripcion: this.obtenerTexto(data.accionesInmediatas, data.Report_Acciones_Inmediata),
        archivos: this.crearArchivos('Foto 2', this.obtenerTexto(data.foto2Ruta, data.Report_Foto2_Ubicacion)),
      }
    ];
  }

  private obtenerTexto(...valores: Array<string | null | undefined>): string {
    for (const valor of valores) {
      const texto = (valor ?? '').toString().trim();
      if (texto.length > 0) {
        return texto;
      }
    }
    return '';
  }

  private crearArchivos(etiqueta: string, rutas: string | null | undefined): VistaArchivo[] {
    if (!rutas) {
      return [];
    }

    return rutas
      .split(/[\r\n|;,]+/g)
      .map((ruta, index) => {
        const rutaLimpia = ruta.trim();
        return {
          etiqueta,
          seccion: etiqueta,
          ruta: rutaLimpia,
          nombre: this.obtenerNombreArchivo(rutaLimpia) || `${etiqueta} ${index + 1}`
        };
      })
      .filter(archivo => !!archivo.ruta);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  verArchivo(archivo: VistaArchivo): void {
    if (!archivo.ruta) {
      return;
    }

    const ruta = archivo.ruta.trim();
    if (/^(https?:|blob:|data:)/i.test(ruta)) {
      window.open(ruta, '_blank');
      return;
    }

    const popup = window.open('', '_blank');
    if (!popup) {
      return;
    }

    popup.document.title = archivo.nombre || 'Vista previa';
    popup.document.body.innerHTML = '<p style="font-family:Arial,sans-serif;padding:16px">Cargando archivo...</p>';

    this.apiService.getArchivoWeReport(ruta).subscribe({
      next: (buffer: ArrayBuffer) => {
        const mimeType = this.obtenerMimeType(archivo.nombre);
        const blob = new Blob([buffer], { type: mimeType });
        const previewUrl = URL.createObjectURL(blob);

        popup.location.href = previewUrl;
        setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
      },
      error: () => {
        popup.close();
        alert('No se pudo abrir el archivo.');
      }
    });
  }

  trackByArchivo(_index: number, archivo: VistaArchivo): string {
    return `${archivo.etiqueta}-${archivo.ruta}`;
  }

  private obtenerNombreArchivo(ruta: string | null | undefined): string {
    if (!ruta) {
      return 'Sin archivo';
    }

    const partes = ruta.replace(/\\/g, '/').split('/');
    return partes[partes.length - 1] || ruta;
  }

  private obtenerMimeType(nombreArchivo: string): string {
    const nombre = (nombreArchivo || '').toLowerCase();
    if (nombre.endsWith('.png')) return 'image/png';
    if (nombre.endsWith('.webp')) return 'image/webp';
    if (nombre.endsWith('.gif')) return 'image/gif';
    if (nombre.endsWith('.pdf')) return 'application/pdf';
    if (nombre.endsWith('.bmp')) return 'image/bmp';
    return 'image/jpeg';
  }
}
