import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { noWhitespaceValidator } from 'src/app/shared/validators/form-validators';

export interface PedidoRechazoDialogResult {
  motivo: string;
}

@Component({
  selector: 'app-pedido-rechazo-dialog',
  templateUrl: './pedido-rechazo-dialog.component.html',
  styleUrls: ['./pedido-rechazo-dialog.component.scss']
})
export class PedidoRechazoDialogComponent {
  readonly form: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<PedidoRechazoDialogComponent>
  ) {
    this.form = this.formBuilder.group({
      motivo: ['', [Validators.required, noWhitespaceValidator()]]
    });
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      motivo: String(this.form.controls['motivo'].value ?? '').trim()
    } as PedidoRechazoDialogResult);
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
