import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PedidoDetalleUnidadOption } from './pedido-detalle-dialog.models';

interface PedidoDetalleUnidadSelectorDialogData {
  units: PedidoDetalleUnidadOption[];
}

@Component({
  selector: 'app-pedido-detalle-unidad-selector-dialog',
  templateUrl: './pedido-detalle-unidad-selector-dialog.component.html',
  styleUrls: ['./pedido-detalle-unidad-selector-dialog.component.scss']
})
export class PedidoDetalleUnidadSelectorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PedidoDetalleUnidadSelectorDialogData,
    private readonly dialogRef: MatDialogRef<PedidoDetalleUnidadSelectorDialogComponent>
  ) {}

  trackByUnit(_: number, unit: PedidoDetalleUnidadOption): number {
    return unit.id;
  }

  selectUnit(unit: PedidoDetalleUnidadOption): void {
    this.dialogRef.close(unit);
  }

  close(): void {
    this.dialogRef.close();
  }
}
