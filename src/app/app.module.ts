import { NgModule } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_SCROLL_STRATEGY, MatDialogModule } from '@angular/material/dialog';
//Import API
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { PaymentSelectorDialogComponent } from './features/provider-form/dialogs/payment-selector-dialog.component';
import { ProviderSelectorDialogComponent } from './features/provider-form/dialogs/provider-selector-dialog.component';
import { ProviderFormComponent } from './features/provider-form/provider-form.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { FormaPagoEditDialogComponent } from './pages/forma-pago-page/forma-pago-edit-dialog.component';
import { FormaPagoPageComponent } from './pages/forma-pago-page/forma-pago-page.component';
import { FormaPagoRegisterDialogComponent } from './pages/forma-pago-page/forma-pago-register-dialog.component';
import { GrupoItemEditDialogComponent } from './pages/grupo-item-page/grupo-item-edit-dialog.component';
import { GrupoItemPageComponent } from './pages/grupo-item-page/grupo-item-page.component';
import { GrupoItemRegisterDialogComponent } from './pages/grupo-item-page/grupo-item-register-dialog.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ItemEditDialogComponent } from './pages/item-page/item-edit-dialog.component';
import { ItemPageComponent } from './pages/item-page/item-page.component';
import { ItemRegisterDialogComponent } from './pages/item-page/item-register-dialog.component';
import { ProviderPageComponent } from './pages/provider-page/provider-page.component';
import { ProviderEditDialogComponent } from './pages/provider-page/provider-edit-dialog.component';
import { ProviderRegisterDialogComponent } from './pages/provider-page/provider-register-dialog.component';
import { PedidoCancelDialogComponent } from './pages/requisiciones-page/pedido-cancel-dialog.component';
import { ApprovalUserSelectorDialogComponent } from './pages/requisiciones-page/approval-user-selector-dialog.component';
import { CentroCostoSelectorDialogComponent } from './pages/requisiciones-page/centro-costo-selector-dialog.component';
import { PedidoDetalleDeleteDialogComponent } from './pages/requisiciones-page/pedido-detalle-delete-dialog.component';
import { PedidoDetalleDialogComponent } from './pages/requisiciones-page/pedido-detalle-dialog.component';
import { PedidoDetalleItemSelectorDialogComponent } from './pages/requisiciones-page/pedido-detalle-item-selector-dialog.component';
import { PedidoDetalleUnidadSelectorDialogComponent } from './pages/requisiciones-page/pedido-detalle-unidad-selector-dialog.component';
import { RequisicionesPageComponent } from './pages/requisiciones-page/requisiciones-page.component';
import { TipoServicioEditDialogComponent } from './pages/tipo-servicio-page/tipo-servicio-edit-dialog.component';
import { TipoServicioPageComponent } from './pages/tipo-servicio-page/tipo-servicio-page.component';
import { TipoServicioRegisterDialogComponent } from './pages/tipo-servicio-page/tipo-servicio-register-dialog.component';
import { UnidadMedidaEditDialogComponent } from './pages/unidad-medida-page/unidad-medida-edit-dialog.component';
import { UnidadMedidaPageComponent } from './pages/unidad-medida-page/unidad-medida-page.component';
import { UnidadMedidaRegisterDialogComponent } from './pages/unidad-medida-page/unidad-medida-register-dialog.component';
import { UsuarioEditDialogComponent } from './pages/usuarios-page/usuario-edit-dialog.component';
import { UsuarioRegisterDialogComponent } from './pages/usuarios-page/usuario-register-dialog.component';

export function dialogScrollStrategyFactory(overlay: Overlay) {
  return () => overlay.scrollStrategies.reposition();
}
import { UsuariosPageComponent } from './pages/usuarios-page/usuarios-page.component';

@NgModule({
  declarations: [
    AppComponent,
    AppLayoutComponent,
    FormaPagoPageComponent,
    FormaPagoRegisterDialogComponent,
    FormaPagoEditDialogComponent,
    GrupoItemPageComponent,
    GrupoItemRegisterDialogComponent,
    GrupoItemEditDialogComponent,
    ItemPageComponent,
    ItemRegisterDialogComponent,
    ItemEditDialogComponent,
    HomePageComponent,
    ProviderPageComponent,
    ProviderEditDialogComponent,
    ProviderRegisterDialogComponent,
    ProviderFormComponent,
    ProviderSelectorDialogComponent,
    PaymentSelectorDialogComponent,
    PedidoCancelDialogComponent,
    ApprovalUserSelectorDialogComponent,
    CentroCostoSelectorDialogComponent,
    PedidoDetalleDeleteDialogComponent,
    PedidoDetalleDialogComponent,
    PedidoDetalleItemSelectorDialogComponent,
    PedidoDetalleUnidadSelectorDialogComponent,
    RequisicionesPageComponent,
    TipoServicioPageComponent,
    TipoServicioRegisterDialogComponent,
    TipoServicioEditDialogComponent,
    UnidadMedidaPageComponent,
    UnidadMedidaRegisterDialogComponent,
    UnidadMedidaEditDialogComponent,
    LoginPageComponent,
    UsuariosPageComponent,
    UsuarioEditDialogComponent,
    UsuarioRegisterDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: MAT_DIALOG_SCROLL_STRATEGY,
      deps: [Overlay],
      useFactory: dialogScrollStrategyFactory
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
