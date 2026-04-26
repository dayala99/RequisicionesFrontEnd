import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './features/auth/guards/auth.guard';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { LoginRedirectGuard } from './features/auth/guards/login-redirect.guard';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ProviderPageComponent } from './pages/provider-page/provider-page.component';
import { RequisicionesPageComponent } from './pages/requisiciones-page/requisiciones-page.component';
import { UsuariosPageComponent } from './pages/usuarios-page/usuarios-page.component';

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
        path: 'pedidos',
        component: RequisicionesPageComponent
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
