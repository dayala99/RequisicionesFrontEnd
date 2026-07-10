import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, catchError, filter, forkJoin, of } from 'rxjs';

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
  notificationsOpen = false;
  notificationBellRinging = false;
  pedidosPendientesAprobacion = 0;
  pedidosPendientesOrdenCompra = 0;
  pedidosPendientesOrdenServicio = 0;
  ordenesCompraPendientesAlmacen = 0;
  isLoadingNotifications = false;
  private routerSubscription?: Subscription;
  private readonly refreshNotificationsHandler = () => this.cargarNotificaciones(true);
  private hasPlayedInitialNotification = false;

  readonly menuItems = [
    { label: 'Inicio', route: '/' }
  ];
  readonly processItems = [
    { label: 'Pedidos', route: '/pedidos' },
    { label: 'Orden de Compra', route: '/orden-compra' },
    { label: 'Orden de Servicio', route: '/orden-servicio' },
    { label: 'Almacen', route: '/almacen' },
    { label: 'Stock', route: '/stock' },
    { label: 'Inspecciones', route: '/inspecciones' }
  ];
  readonly maintenanceItems = [
    { label: 'Perfil', route: '/perfil' },
    { label: 'Forma de Pagos', route: '/forma-pago' },
    { label: 'Banco', route: '/banco' },
    { label: 'Centro de Costos', route: '/centro-costos' },
    { label: 'Direccion de Entrega', route: '/direccion-entrega' },
    { label: 'Moneda', route: '/moneda' },
    { label: 'Grupo de Item', route: '/grupo-item' },
    { label: 'Sub Grupo de Item', route: '/sub-grupo-item' },
    { label: 'Detalle de Material', route: '/item-detalle-material' },
    { label: 'Item', route: '/item' },
    { label: 'Tipo de Servicio', route: '/tipo-servicio' },
    { label: 'Unidad de Medida', route: '/unidad-medida' },
    { label: 'Jefe', route: '/jefe' },
    { label: 'Cliente', route: '/cliente' },
    { label: 'Subestación', route: '/subestacion' },
    { label: 'Detracciones', route: '/detraccion' },
    { label: 'Usuario', route: '/usuario' },
    { label: 'Proveedor', route: '/proveedor' }
  ];

  get visibleMenuItems(): { label: string; route: string }[] {
    return this.menuItems.filter((item) => this.authService.hasAccessToRoute(item.route));
  }

  get visibleProcessItems(): { label: string; route: string }[] {
    return this.processItems.filter((item) => this.authService.hasAccessToRoute(item.route));
  }

  get visibleMaintenanceItems(): { label: string; route: string }[] {
    return this.maintenanceItems.filter((item) => this.authService.hasAccessToRoute(item.route));
  }

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
    window.addEventListener('pedido-notifications-refresh', this.refreshNotificationsHandler);
    window.addEventListener('process-notifications-refresh', this.refreshNotificationsHandler);
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.cargarNotificaciones(true));
  }

  ngOnDestroy(): void {
    window.removeEventListener('pedido-notifications-refresh', this.refreshNotificationsHandler);
    window.removeEventListener('process-notifications-refresh', this.refreshNotificationsHandler);
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

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
  }

  closeNotifications(): void {
    this.notificationsOpen = false;
  }

  goToPendingApprovals(): void {
    this.closeNotifications();
    void this.router.navigate(['/pedidos']);
  }

  goToPendingPurchaseOrders(): void {
    this.closeNotifications();
    void this.router.navigate(['/orden-compra']);
  }

  goToPendingServiceOrders(): void {
    this.closeNotifications();
    void this.router.navigate(['/orden-servicio']);
  }

  goToPendingWarehouseEntries(): void {
    this.closeNotifications();
    void this.router.navigate(['/almacen']);
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
    switch (item.route) {
      case '/pedidos':
        return this.pedidosPendientesAprobacion;
      case '/orden-compra':
        return this.pedidosPendientesOrdenCompra;
      case '/orden-servicio':
        return this.pedidosPendientesOrdenServicio;
      case '/almacen':
        return this.ordenesCompraPendientesAlmacen;
      default:
        return 0;
    }
  }

  get totalNotifications(): number {
    return this.pedidosPendientesAprobacion
      + this.pedidosPendientesOrdenCompra
      + this.pedidosPendientesOrdenServicio
      + this.ordenesCompraPendientesAlmacen;
  }

  isMaintenanceRouteActive(): boolean {
    return this.visibleMaintenanceItems.some((item) => this.router.url.startsWith(item.route));
  }

  isProcessRouteActive(): boolean {
    return this.visibleProcessItems.some((item) => this.router.url.startsWith(item.route));
  }

  private cargarNotificaciones(force = false): void {
    const currentUserCode = this.authService.getCurrentUser().trim();
    const currentUser = currentUserCode.toLowerCase();

    if (!currentUser || (this.isLoadingNotifications && !force)) {
      return;
    }

    this.isLoadingNotifications = true;
    forkJoin({
      pedidosAprobacion: this.apiService.getListarPedido({ Flg_Est: 'P', Usr_Cod: currentUserCode }).pipe(catchError(() => of([]))),
      pedidosOrdenCompra: this.apiService.getListarPedidoAprobadoParaOC({ Flg_Est: 'A', Ped_Tip_Com: 1 }).pipe(catchError(() => of([]))),
      pedidosOrdenServicio: this.apiService.getListarPedidoAprobadoParaOC({ Flg_Est: 'A', Ped_Tip_Com: 2 }).pipe(catchError(() => of([]))),
      ordenesAlmacen: this.apiService.getListarOrdenCompraPendienteAlmacen().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ pedidosAprobacion, pedidosOrdenCompra, pedidosOrdenServicio, ordenesAlmacen }) => {
        this.pedidosPendientesAprobacion = this.countPedidosPendientesAprobacion(pedidosAprobacion, currentUser);
        this.pedidosPendientesOrdenCompra = this.extractRecords(pedidosOrdenCompra).length;
        this.pedidosPendientesOrdenServicio = this.extractRecords(pedidosOrdenServicio).length;
        this.ordenesCompraPendientesAlmacen = this.extractRecords(ordenesAlmacen).length;
        this.triggerInitialNotificationCue();
        this.isLoadingNotifications = false;
      },
      error: () => {
        this.pedidosPendientesAprobacion = 0;
        this.pedidosPendientesOrdenCompra = 0;
        this.pedidosPendientesOrdenServicio = 0;
        this.ordenesCompraPendientesAlmacen = 0;
        this.isLoadingNotifications = false;
      }
    });
  }

  private countPedidosPendientesAprobacion(response: unknown, currentUser: string): number {
    return this.extractRecords(response)
      .filter((item) => this.getTextValue(item, ['Ped_Usr_Apr', 'ped_Usr_Apr', 'pedUsrApr', 'Usr_Apr', 'usrApr']).toLowerCase() === currentUser)
      .length;
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

  private triggerInitialNotificationCue(): void {
    if (this.hasPlayedInitialNotification || this.pedidosPendientesAprobacion <= 0) {
      return;
    }

    this.hasPlayedInitialNotification = true;
    this.notificationBellRinging = true;
    this.playNotificationSound();

    window.setTimeout(() => {
      this.notificationBellRinging = false;
    }, 1400);
  }

  private playNotificationSound(): void {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    try {
      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12);
      gain.gain.setValueAtTime(0.001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.32);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.34);
      oscillator.onended = () => {
        void audioContext.close();
      };
    } catch {
      // Some browsers block audio until the user interacts with the page.
    }
  }
}
