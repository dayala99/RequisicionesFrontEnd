import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

import { PedidoDetalleItemSelectorDialogComponent } from './pedido-detalle-item-selector-dialog.component';
import { PedidoDetalleUnidadSelectorDialogComponent } from './pedido-detalle-unidad-selector-dialog.component';
import { PedidoDetalleDialogValue, PedidoDetalleItemOption, PedidoDetalleUnidadOption } from './pedido-detalle-dialog.models';

export interface PedidoDetalleDialogData {
  pedidoCodigo: string;
  itemNumber: string;
  moneda: string;
  cantidadDisponible: number;
  isEditing: boolean;
  items: PedidoDetalleItemOption[];
  units: PedidoDetalleUnidadOption[];
  initialValue?: Partial<PedidoDetalleDialogValue>;
}

@Component({
  selector: 'app-pedido-detalle-dialog',
  templateUrl: './pedido-detalle-dialog.component.html',
  styleUrls: ['./pedido-detalle-dialog.component.scss']
})
export class PedidoDetalleDialogComponent {
  readonly form: FormGroup;
  errorMessage = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: PedidoDetalleDialogData,
    private readonly dialogRef: MatDialogRef<PedidoDetalleDialogComponent>
  ) {
    this.form = this.formBuilder.group({
      itemCode: [String(data.initialValue?.itemCode ?? '').trim()],
      itemDescription: [String(data.initialValue?.itemDescription ?? '').trim()],
      unitCode: [String(data.initialValue?.unitCode ?? '').trim()],
      unitDescription: [String(data.initialValue?.unitDescription ?? '').trim()],
      quantity: [this.normalizeDecimal(Number(data.initialValue?.quantity ?? 0))],
      unitPrice: [this.normalizeDecimal(Number(data.initialValue?.unitPrice ?? 0))]
    });

    this.resolveInitialLabels();
  }

  get subtotal(): number {
    const quantity = this.normalizeDecimal(Number(this.form.controls['quantity'].value));
    const unitPrice = this.normalizeDecimal(Number(this.form.controls['unitPrice'].value));
    return this.normalizeDecimal(quantity * unitPrice);
  }

  get itemButtonLabel(): string {
    return String(this.form.controls['itemCode'].value ?? '').trim() || 'Seleccionar item';
  }

  get unitButtonLabel(): string {
    return String(this.form.controls['unitCode'].value ?? '').trim() || 'Seleccionar unidad';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }).format(value);
  }

  openItemSelectorDialog(): void {
    if (!this.data.items.length) {
      return;
    }

    const dialogRef = this.dialog.open(PedidoDetalleItemSelectorDialogComponent, {
      autoFocus: false,
      width: '38rem',
      data: {
        items: this.data.items
      }
    });

    dialogRef.afterClosed().subscribe((selectedItem?: PedidoDetalleItemOption) => {
      if (!selectedItem) {
        return;
      }

      this.form.patchValue({
        itemCode: selectedItem.code,
        itemDescription: selectedItem.description
      });
      this.errorMessage = '';
    });
  }

  openUnitSelectorDialog(): void {
    if (!this.data.units.length) {
      return;
    }

    const dialogRef = this.dialog.open(PedidoDetalleUnidadSelectorDialogComponent, {
      autoFocus: false,
      width: '36rem',
      data: {
        units: this.data.units
      }
    });

    dialogRef.afterClosed().subscribe((selectedUnit?: PedidoDetalleUnidadOption) => {
      if (!selectedUnit) {
        return;
      }

      this.form.patchValue({
        unitCode: selectedUnit.code,
        unitDescription: selectedUnit.description
      });
      this.errorMessage = '';
    });
  }

  save(): void {
    const itemCode = String(this.form.controls['itemCode'].value ?? '').trim();
    const itemDescription = String(this.form.controls['itemDescription'].value ?? '').trim();
    const unitCode = String(this.form.controls['unitCode'].value ?? '').trim();
    const unitDescription = String(this.form.controls['unitDescription'].value ?? '').trim();
    const quantity = this.normalizeDecimal(Number(this.form.controls['quantity'].value));
    const unitPrice = this.normalizeDecimal(Number(this.form.controls['unitPrice'].value));

    if (!itemCode) {
      this.errorMessage = 'Selecciona un item.';
      return;
    }

    if (!unitCode) {
      this.errorMessage = 'Selecciona una unidad de medida.';
      return;
    }

    if (quantity <= 0) {
      this.errorMessage = 'La cantidad debe ser mayor a cero.';
      return;
    }

    if (quantity > this.data.cantidadDisponible) {
      this.errorMessage = `La cantidad no puede ser mayor a ${this.formatNumber(this.data.cantidadDisponible)}.`;
      return;
    }

    if (unitPrice < 0) {
      this.errorMessage = 'El precio unitario no puede ser negativo.';
      return;
    }

    this.dialogRef.close({
      itemCode,
      itemDescription,
      unitCode,
      unitDescription,
      quantity,
      unitPrice
    } as PedidoDetalleDialogValue);
  }

  close(): void {
    this.dialogRef.close();
  }

  private resolveInitialLabels(): void {
    const itemCode = String(this.form.controls['itemCode'].value ?? '').trim();
    const unitCode = String(this.form.controls['unitCode'].value ?? '').trim();

    if (itemCode && !String(this.form.controls['itemDescription'].value ?? '').trim()) {
      const item = this.data.items.find((option) => option.code === itemCode);

      if (item) {
        this.form.patchValue({
          itemDescription: item.description
        });
      }
    }

    if (unitCode && !String(this.form.controls['unitDescription'].value ?? '').trim()) {
      const unit = this.data.units.find((option) => option.code === unitCode);

      if (unit) {
        this.form.patchValue({
          unitDescription: unit.description
        });
      }
    }
  }

  private normalizeDecimal(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Number(value.toFixed(3));
  }
}
