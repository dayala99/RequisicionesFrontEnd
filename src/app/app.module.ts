import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
//Import API
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { PaymentSelectorDialogComponent } from './features/provider-form/dialogs/payment-selector-dialog.component';
import { ProviderSelectorDialogComponent } from './features/provider-form/dialogs/provider-selector-dialog.component';
import { ProviderFormComponent } from './features/provider-form/provider-form.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ProviderPageComponent } from './pages/provider-page/provider-page.component';
import { ProviderEditDialogComponent } from './pages/provider-page/provider-edit-dialog.component';
import { ProviderRegisterDialogComponent } from './pages/provider-page/provider-register-dialog.component';
import { RequisicionesPageComponent } from './pages/requisiciones-page/requisiciones-page.component';
import { UsuarioEditDialogComponent } from './pages/usuarios-page/usuario-edit-dialog.component';
import { UsuarioRegisterDialogComponent } from './pages/usuarios-page/usuario-register-dialog.component';
import { UsuariosPageComponent } from './pages/usuarios-page/usuarios-page.component';

@NgModule({
  declarations: [
    AppComponent,
    AppLayoutComponent,
    HomePageComponent,
    ProviderPageComponent,
    ProviderEditDialogComponent,
    ProviderRegisterDialogComponent,
    ProviderFormComponent,
    ProviderSelectorDialogComponent,
    PaymentSelectorDialogComponent,
    RequisicionesPageComponent,
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
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
