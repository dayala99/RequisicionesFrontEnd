import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-orden-compra-parcial-dialog',
  templateUrl: './orden-compra-parcial-dialog.component.html',
  styleUrls: ['./orden-compra-parcial-dialog.component.scss']
})
export class OrdenCompraParcialDialogComponent {
  constructor(private readonly dialogRef: MatDialogRef<OrdenCompraParcialDialogComponent>) {}

  seleccionarModo(esParcial: boolean): void {
    this.dialogRef.close(esParcial);
  }

  close(): void {
    this.dialogRef.close();
  }
}
