import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '../../features/auth/services/auth.service';
import { ApiService } from 'src/app/Services/api.services';

@Component({
  selector: 'app-app-layout',
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  sidebarCollapsed = false;
  maintenanceOpen: boolean;
  processOpen: boolean;
  pedidosPendientesAprobacion = 0;
  isLoadingNotifications = false;
  private routerSubscription?: Subscription;

  readonly menuItems = [
    { label: 'Inicio', route: '/' }
  ];
  readonly processItems = [
    { label: 'Pedidos', route: '/pedidos' },
    { label: 'Orden de Compra', route: '/orden-compra' },
    { label: 'Almacen', route: '/almacen' },
    { label: 'Inspecciones', route: '/inspecciones' }
  ];
  readonly maintenanceItems = [
    { label: 'Forma de Pagos', route: '/forma-pago' },
    { label: 'Banco', route: '/banco' },
    { label: 'Centro de Costos', route: '/centro-costos' },
    { label: 'Moneda', route: '/moneda' },
    { label: 'Grupo de Item', route: '/grupo-item' },
    { label: 'Sub Grupo de Item', route: '/sub-grupo-item' },
    { label: 'Detalle de Material', route: '/item-detalle-material' },
    { label: 'Item', route: '/item' },
    { label: 'Tipo de Servicio', route: '/tipo-servicio' },
    { label: 'Unidad de Medida', route: '/unidad-medida' },
    { label: 'Detracciones', route: '/detraccion' },
    { label: 'Usuario', route: '/usuario' },
    { label: 'Proveedor', route: '/proveedor' }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly apiService: ApiService,
    private readonly router: Router
  ) {
    this.maintenanceOpen = this.isMaintenanceRouteActive();
    this.processOpen = this.isProcessRouteActive();
  }

  ngOnInit(): void {
    this.cargarNotificaciones();
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.cargarNotificaciones());
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.sidebarOpen = false;
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

  get currentUserName(): string {
    return this.authService.getCurrentUserName() || this.currentUser;
  }

  getProcessNotificationCount(item: { label: string; route: string }): number {
    return item.route === '/pedidos' ? this.pedidosPendientesAprobacion : 0;
  }

  isMaintenanceRouteActive(): boolean {
    return this.maintenanceItems.some((item) => this.router.url.startsWith(item.route));
  }

  isProcessRouteActive(): boolean {
    return this.processItems.some((item) => this.router.url.startsWith(item.route));
  }

  private cargarNotificaciones(): void {
    const currentUserCode = this.authService.getCurrentUser().trim();
    const currentUser = currentUserCode.toLowerCase();

    if (!currentUser || this.isLoadingNotifications) {
      return;
    }

    this.isLoadingNotifications = true;
    this.apiService.getListarPedido({ Flg_Est: 'P', Usr_Cod: currentUserCode }).subscribe({
      next: (response: unknown) => {
        this.pedidosPendientesAprobacion = this.extractRecords(response)
          .filter((item) => this.getTextValue(item, ['Ped_Usr_Apr', 'ped_Usr_Apr', 'pedUsrApr', 'Usr_Apr', 'usrApr']).toLowerCase() === currentUser)
          .length;
        this.isLoadingNotifications = false;
      },
      error: () => {
        this.pedidosPendientesAprobacion = 0;
        this.isLoadingNotifications = false;
      }
    });
  }

  private extractRecords(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const elements = response['Elements'] ?? response['elements'];
    if (Array.isArray(elements)) {
      return elements.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    const data = response['Data'] ?? response['data'];
    if (Array.isArray(data)) {
      return data.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    return [response];
  }

  private getTextValue(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = item[key];

      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }

    return '';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
