import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PedidoDetalleItemOption } from './pedido-detalle-dialog.models';

interface PedidoDetalleItemSelectorDialogData {
  items: PedidoDetalleItemOption[];
}

@Component({
  selector: 'app-pedido-detalle-item-selector-dialog',
  templateUrl: './pedido-detalle-item-selector-dialog.component.html',
  styleUrls: ['./pedido-detalle-item-selector-dialog.component.scss']
})
export class PedidoDetalleItemSelectorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PedidoDetalleItemSelectorDialogData,
    private readonly dialogRef: MatDialogRef<PedidoDetalleItemSelectorDialogComponent>
  ) {}

  trackByItem(_: number, item: PedidoDetalleItemOption): number {
    return item.id;
  }

  selectItem(item: PedidoDetalleItemOption): void {
    this.dialogRef.close(item);
  }

  close(): void {
    this.dialogRef.close();
  }
}
