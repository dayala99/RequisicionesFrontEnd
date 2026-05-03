import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PaymentOption } from '../provider-form.models';

interface PaymentDialogData {
  paymentOptions: PaymentOption[];
}

@Component({
  selector: 'app-payment-selector-dialog',
  templateUrl: './payment-selector-dialog.component.html',
  styleUrls: ['./payment-selector-dialog.component.scss']
})
export class PaymentSelectorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData,
    private readonly dialogRef: MatDialogRef<PaymentSelectorDialogComponent>
  ) {}

  trackByCode(_: number, paymentOption: PaymentOption): number {
    return paymentOption.code;
  }

  selectPayment(paymentOption: PaymentOption): void {
    this.dialogRef.close(paymentOption);
  }

  close(): void {
    this.dialogRef.close();
  }
}
