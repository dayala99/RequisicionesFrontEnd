import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from 'src/app/Services/api.services';
import { PaymentSelectorDialogComponent } from './dialogs/payment-selector-dialog.component';
import { PaymentOption, ProviderRecord } from './provider-form.models';
import { ProviderSelectorDialogComponent } from './dialogs/provider-selector-dialog.component';

type DataRecord = Record<string, unknown>;

@Component({
  selector: 'app-provider-form',
  templateUrl: './provider-form.component.html',
  styleUrls: ['./provider-form.component.scss']
})
export class ProviderFormComponent implements OnInit {
  @Input() embedded = false;

  providers: ProviderRecord[] = [];
  paymentOptions: PaymentOption[] = [];
  isLoadingProviders = false;
  isLoadingPayments = false;

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
    private readonly dialog: MatDialog,
    private readonly apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadProviders();
    this.loadPaymentOptions();
  }

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
    if (this.isEventualMode || !this.providers.length) {
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
    if (!this.paymentOptions.length) {
      return;
    }

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

  private loadProviders(): void {
    this.isLoadingProviders = true;

    this.apiService.getListarProveedorActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.providers = this.extractRecords(response)
          .map((item) => this.mapProvider(item))
          .filter((provider) => provider.code > 0 && !!provider.name);
        this.isLoadingProviders = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando proveedores del formulario:', error);
        this.providers = [];
        this.isLoadingProviders = false;
      }
    });
  }

  private loadPaymentOptions(): void {
    this.isLoadingPayments = true;

    this.apiService.getListarFormaPagoActivo({ Flg_Est: 'A' }).subscribe({
      next: (response: unknown) => {
        this.paymentOptions = this.extractRecords(response)
          .map((item) => this.mapPaymentOption(item))
          .filter((paymentOption) => paymentOption.code > 0 && !!paymentOption.description);
        this.isLoadingPayments = false;
      },
      error: (error: unknown) => {
        console.error('Error cargando formas de pago del formulario:', error);
        this.paymentOptions = [];
        this.isLoadingPayments = false;
      }
    });
  }

  private extractRecords(response: unknown): DataRecord[] {
    if (Array.isArray(response)) {
      return response.filter((value): value is DataRecord => this.isDataRecord(value));
    }

    if (!this.isDataRecord(response)) {
      return [];
    }

    const possibleArrayKeys = ['proveedores', 'Proveedores', 'formasPago', 'FormasPago', 'elements', 'Elements', 'data', 'Data', 'result', 'Result'];

    for (const key of possibleArrayKeys) {
      const value = response[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is DataRecord => this.isDataRecord(item));
      }
    }

    return [response];
  }

  private mapProvider(item: DataRecord): ProviderRecord {
    return {
      code: this.getNumberValue(item, ['Prv_Id', 'prv_Id', 'prvId', 'id', 'Id']) ?? 0,
      name: this.getTextValue(item, ['Prv_Nom', 'prv_Nom', 'prvNom']),
      phone: this.getTextValue(item, ['Prv_Tel', 'prv_Tel', 'prvTel']),
      address: this.getTextValue(item, ['Prv_Dir', 'prv_Dir', 'prvDir']),
      contact: this.getTextValue(item, ['Prv_Nom_Con', 'prv_Nom_Con', 'prvNomCon']),
      ruc: this.getTextValue(item, ['Prv_Ruc', 'prv_Ruc', 'prvRuc'])
    };
  }

  private mapPaymentOption(item: DataRecord): PaymentOption {
    return {
      code: this.getNumberValue(item, ['For_Pag_Id', 'for_Pag_Id', 'forPagId', 'id', 'Id']) ?? 0,
      description: this.getTextValue(item, ['For_Pag_Des', 'for_Pag_Des', 'forPagDes', 'description', 'Description'])
    };
  }

  private getTextValue(item: DataRecord, keys: string[]): string {
    for (const key of keys) {
      const value = item[key];

      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }

    return '';
  }

  private getNumberValue(item: DataRecord, keys: string[]): number | null {
    for (const key of keys) {
      const value = Number(item[key]);

      if (Number.isInteger(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  private isDataRecord(value: unknown): value is DataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
