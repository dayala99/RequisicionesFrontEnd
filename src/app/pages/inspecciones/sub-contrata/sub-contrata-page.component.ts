import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SubContrataItem {
  id: number;
  nombre: string;
  estado: 'A' | 'I';
}

interface SubContrataFilter {
  Id: string;
  Nombre: string;
  Estado: 'A' | 'I';
}

@Component({
  selector: 'app-sub-contrata-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sub-contrata-page.component.html',
  styleUrls: ['./sub-contrata-page.component.scss']
})
export class SubContrataPageComponent implements OnInit {
  filtros: SubContrataFilter = {
    Id: '',
    Nombre: '',
    Estado: 'A'
  };

  private readonly data: SubContrataItem[] = [
    { id: 1, nombre: 'Sub Contrata Principal', estado: 'A' },
    { id: 2, nombre: 'Sub Contrata Alterno 1', estado: 'A' },
    { id: 3, nombre: 'Sub Contrata Alterno 2', estado: 'I' },
    { id: 4, nombre: 'Sub Contrata Alterno 3', estado: 'A' },
    { id: 5, nombre: 'Sub Contrata Alterno 4', estado: 'I' },
    { id: 6, nombre: 'Sub Contrata Alterno 5', estado: 'A' },
    { id: 7, nombre: 'Sub Contrata Alterno 6', estado: 'A' },
    { id: 8, nombre: 'Sub Contrata Alterno 7', estado: 'I' }
  ];

  items: SubContrataItem[] = [];
  readonly pageSize = 20;
  paginaActual = 1;
  mensaje = '';

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.items.length / this.pageSize));
  }

  get itemsPaginados(): SubContrataItem[] {
    const inicio = (this.paginaActual - 1) * this.pageSize;
    return this.items.slice(inicio, inicio + this.pageSize);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  ngOnInit(): void {
    this.buscar();
  }

  abrirNuevo(): void {
    this.mensaje = 'Apartado nuevo listo para conectar con mantenimiento.';
  }

  buscar(): void {
    const id = Number(this.filtros.Id || 0);
    const nombre = this.filtros.Nombre.trim().toLowerCase();
    const estado = this.filtros.Estado;

    this.items = this.data.filter((item) => {
      const coincideId = id === 0 || item.id === id;
      const coincideNombre = nombre === '' || item.nombre.toLowerCase().includes(nombre);
      const coincideEstado = item.estado === estado;
      return coincideId && coincideNombre && coincideEstado;
    });

    this.paginaActual = 1;
    this.mensaje = this.items.length ? '' : 'No hay registros para mostrar.';
  }

  limpiar(): void {
    this.filtros = {
      Id: '',
      Nombre: '',
      Estado: 'A'
    };
    this.buscar();
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
  }

  editarItem(item: SubContrataItem): void {
    console.log('Sub Contrata: editar', item);
  }

  eliminarItem(item: SubContrataItem): void {
    console.log('Sub Contrata: eliminar', item);
  }

  formatEstado(estado: 'A' | 'I'): string {
    return estado === 'A' ? 'Activo' : 'Inactivo';
  }

  trackByItem(_index: number, item: SubContrataItem): number {
    return item.id;
  }
}
