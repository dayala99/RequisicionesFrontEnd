import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-app-layout',
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  sidebarOpen = false;
  maintenanceOpen: boolean;

  readonly menuItems = [
    { label: 'Inicio', route: '/' },
    { label: 'Pedidos', route: '/pedidos' }
  ];
  readonly maintenanceItems = [
    { label: 'Forma de Pagos', route: '/forma-pago' },
    { label: 'Banco', route: '/banco' },
    { label: 'Moneda', route: '/moneda' },
    { label: 'Grupo de Item', route: '/grupo-item' },
    { label: 'Item', route: '/item' },
    { label: 'Tipo de Servicio', route: '/tipo-servicio' },
    { label: 'Unidad de Medida', route: '/unidad-medida' },
    { label: 'Usuario', route: '/usuario' },
    { label: 'Proveedor', route: '/proveedor' }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.maintenanceOpen = this.isMaintenanceRouteActive();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleMaintenanceMenu(): void {
    this.maintenanceOpen = !this.maintenanceOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.closeSidebar();
    void this.router.navigate(['/login']);
  }

  get currentUser(): string {
    return this.authService.getCurrentUser() || 'usuario';
  }

  isMaintenanceRouteActive(): boolean {
    return this.maintenanceItems.some((item) => this.router.url.startsWith(item.route));
  }
}
