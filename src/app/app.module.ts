import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PaymentSelectorDialogComponent } from './features/provider-form/dialogs/payment-selector-dialog.component';
import { ProviderSelectorDialogComponent } from './features/provider-form/dialogs/provider-selector-dialog.component';
import { ProviderFormComponent } from './features/provider-form/provider-form.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ProviderPageComponent } from './pages/provider-page/provider-page.component';

@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    ProviderPageComponent,
    ProviderFormComponent,
    ProviderSelectorDialogComponent,
    PaymentSelectorDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
