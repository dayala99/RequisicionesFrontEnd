import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './features/auth/guards/auth.guard';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { LoginRedirectGuard } from './features/auth/guards/login-redirect.guard';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { BancoPageComponent } from './pages/banco-page/banco-page.component';
import { AlmacenPageComponent } from './pages/almacen-page/almacen-page.component';
import { CentroCostosPageComponent } from './pages/centro-costos-page/centro-costos-page.component';
import { DetraccionPageComponent } from './pages/detraccion-page/detraccion-page.component';
import { DireccionEntregaPageComponent } from './pages/direccion-entrega-page/direccion-entrega-page.component';
import { FormaPagoPageComponent } from './pages/forma-pago-page/forma-pago-page.component';
import { GrupoItemPageComponent } from './pages/grupo-item-page/grupo-item-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ItemPageComponent } from './pages/item-page/item-page.component';
import { ItemDetalleMaterialPageComponent } from './pages/item-detalle-material-page/item-detalle-material-page.component';
import { MonedaPageComponent } from './pages/moneda-page/moneda-page.component';
import { OrdenCompraPageComponent } from './pages/orden-compra-page/orden-compra-page.component';
import { PedidosBPageComponent } from './pages/requisiciones-page/pedidos-b-page.component';
import { PerfilPageComponent } from './pages/perfil-page/perfil-page.component';
import { ProviderPageComponent } from './pages/provider-page/provider-page.component';
import { SubGrupoItemPageComponent } from './pages/sub-grupo-item-page/sub-grupo-item-page.component';
import { TipoServicioPageComponent } from './pages/tipo-servicio-page/tipo-servicio-page.component';
import { UnidadMedidaPageComponent } from './pages/unidad-medida-page/unidad-medida-page.component';
import { UsuariosPageComponent } from './pages/usuarios-page/usuarios-page.component';
import { InspeccionesPageComponent } from './pages/inspecciones-page/inspecciones-page.component';
import { JefePageComponent } from './pages/inspecciones/jefe/jefe-page.component';
import { ClientePageComponent } from './pages/inspecciones/cliente/cliente-page.component';
import { SubestacionPageComponent } from './pages/inspecciones/subestacion/subestacion-page.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [LoginRedirectGuard]
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: '',
        component: HomePageComponent
      },
      {
        path: 'proveedor',
        component: ProviderPageComponent
      },
      {
        path: 'forma-pago',
        component: FormaPagoPageComponent
      },
      {
        path: 'perfil',
        component: PerfilPageComponent
      },
      {
        path: 'detraccion',
        component: DetraccionPageComponent
      },
      {
        path: 'banco',
        component: BancoPageComponent
      },
      {
        path: 'centro-costos',
        component: CentroCostosPageComponent
      },
      {
        path: 'direccion-entrega',
        component: DireccionEntregaPageComponent
      },
      {
        path: 'moneda',
        component: MonedaPageComponent
      },
      {
        path: 'grupo-item',
        component: GrupoItemPageComponent
      },
      {
        path: 'sub-grupo-item',
        component: SubGrupoItemPageComponent
      },
      {
        path: 'item',
        component: ItemPageComponent
      },
      {
        path: 'item-detalle-material',
        component: ItemDetalleMaterialPageComponent
      },
      {
        path: 'tipo-servicio',
        component: TipoServicioPageComponent
      },
      {
        path: 'unidad-medida',
        component: UnidadMedidaPageComponent
      },
      {
        path: 'pedidos',
        component: PedidosBPageComponent
      },
      {
        path: 'pedidos-b',
        redirectTo: 'pedidos',
        pathMatch: 'full'
      },
      {
        path: 'orden-compra',
        component: OrdenCompraPageComponent
      },
      {
        path: 'almacen',
        component: AlmacenPageComponent
      },
      {
        path: 'inspecciones',
        component: InspeccionesPageComponent
      },
      {
        path: 'jefe',
        component: JefePageComponent
      },
      {
        path: 'cliente',
        component: ClientePageComponent
      },
      {
        path: 'subestacion',
        component: SubestacionPageComponent
      },
      {
        path: 'requisicion',
        redirectTo: 'pedidos',
        pathMatch: 'full'
      },
      {
        path: 'usuario',
        component: UsuariosPageComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
