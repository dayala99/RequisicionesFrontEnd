import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ProviderRecord } from '../provider-form.models';

interface ProviderDialogData {
  providers: ProviderRecord[];
}

@Component({
  selector: 'app-provider-selector-dialog',
  templateUrl: './provider-selector-dialog.component.html',
  styleUrls: ['./provider-selector-dialog.component.scss']
})
export class ProviderSelectorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProviderDialogData,
    private readonly dialogRef: MatDialogRef<ProviderSelectorDialogComponent>
  ) {}

  trackByCode(_: number, provider: ProviderRecord): number {
    return provider.code;
  }

  selectProvider(provider: ProviderRecord): void {
    this.dialogRef.close(provider);
  }

  close(): void {
    this.dialogRef.close();
  }
}
