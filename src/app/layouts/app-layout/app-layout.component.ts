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
  processOpen: boolean;

  readonly menuItems = [
    { label: 'Inicio', route: '/' }
  ];
  readonly processItems = [
    { label: 'Pedidos', route: '/pedidos' },
    { label: 'Orden de Compra', route: '/orden-compra' }
  ];
  readonly maintenanceItems = [
    { label: 'Forma de Pagos', route: '/forma-pago' },
    { label: 'Banco', route: '/banco' },
    { label: 'Centro de Costos', route: '/centro-costos' },
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
    this.processOpen = this.isProcessRouteActive();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleProcessMenu(): void {
    this.processOpen = !this.processOpen;
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

  isProcessRouteActive(): boolean {
    return this.processItems.some((item) => this.router.url.startsWith(item.route));
  }
}
