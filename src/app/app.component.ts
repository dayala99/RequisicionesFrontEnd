import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  
})



export class AppComponent {
  sidebarOpen = false;

  menuItems = [
    {label: 'Requisiciones', route: '/proveedor'},
    {label: 'Compras', route: '/compras'},
    {label: 'Requisiciones', route: '/requisiciones'},
  ];

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
