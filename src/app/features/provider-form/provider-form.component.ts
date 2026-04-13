import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { PAYMENT_OPTIONS, PROVIDER_RECORDS } from './provider-form.data';
import { PaymentSelectorDialogComponent } from './dialogs/payment-selector-dialog.component';
import { PaymentOption, ProviderRecord } from './provider-form.models';
import { ProviderSelectorDialogComponent } from './dialogs/provider-selector-dialog.component';

@Component({
  selector: 'app-provider-form',
  templateUrl: './provider-form.component.html',
  styleUrls: ['./provider-form.component.scss']
})
export class ProviderFormComponent {
  readonly providers = PROVIDER_RECORDS;
  readonly paymentOptions = PAYMENT_OPTIONS;

  readonly form = this.formBuilder.nonNullable.group({
    supplierCode: 0,
    supplierName: [{ value: '', disabled: true }],
    phone: [{ value: '', disabled: true }],
    address: [{ value: '', disabled: true }],
    contact: [{ value: '', disabled: true }],
    ruc: [{ value: '', disabled: true }],
    paymentCode: 0,
    paymentDescription: [{ value: '', disabled: true }],
    isEventual: false
  });

  private readonly manualControls = [
    this.form.controls.supplierName,
    this.form.controls.phone,
    this.form.controls.address,
    this.form.controls.contact,
    this.form.controls.ruc
  ];

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog
  ) {}

  get supplierCode(): number {
    return this.form.controls.supplierCode.value;
  }

  get paymentCode(): number {
    return this.form.controls.paymentCode.value;
  }

  get isEventualMode(): boolean {
    return this.form.controls.isEventual.value;
  }

  openProviderDialog(): void {
    if (this.isEventualMode) {
      return;
    }

    const dialogRef = this.dialog.open(ProviderSelectorDialogComponent, {
      autoFocus: false,
      width: '40rem',
      data: {
        providers: this.providers
      }
    });

    dialogRef.afterClosed().subscribe((provider?: ProviderRecord) => {
      if (provider) {
        this.applySelectedProvider(provider);
      }
    });
  }

  openPaymentDialog(): void {
    const dialogRef = this.dialog.open(PaymentSelectorDialogComponent, {
      autoFocus: false,
      width: '34rem',
      data: {
        paymentOptions: this.paymentOptions
      }
    });

    dialogRef.afterClosed().subscribe((paymentOption?: PaymentOption) => {
      if (paymentOption) {
        this.applySelectedPayment(paymentOption);
      }
    });
  }

  toggleEventual(): void {
    if (this.isEventualMode) {
      this.resetToInitialState();
      return;
    }

    this.form.controls.isEventual.setValue(true);
    this.clearProviderFields();
    this.enableManualFields();
  }

  applySelectedProvider(provider: ProviderRecord): void {
    this.disableManualFields();
    this.form.patchValue({
      supplierCode: provider.code,
      supplierName: provider.name,
      phone: provider.phone,
      address: provider.address,
      contact: provider.contact,
      ruc: provider.ruc
    });
  }

  applySelectedPayment(paymentOption: PaymentOption): void {
    this.form.patchValue({
      paymentCode: paymentOption.code,
      paymentDescription: paymentOption.description
    });
  }

  private clearProviderFields(): void {
    this.form.patchValue({
      supplierCode: 0,
      supplierName: '',
      phone: '',
      address: '',
      contact: '',
      ruc: ''
    });
  }

  private enableManualFields(): void {
    this.manualControls.forEach((control) => control.enable());
  }

  private disableManualFields(): void {
    this.manualControls.forEach((control) => control.disable());
  }

  private resetToInitialState(): void {
    this.form.reset({
      supplierCode: 0,
      supplierName: '',
      phone: '',
      address: '',
      contact: '',
      ruc: '',
      paymentCode: 0,
      paymentDescription: '',
      isEventual: false
    });
    this.disableManualFields();
    this.form.controls.paymentDescription.disable();
  }
}
