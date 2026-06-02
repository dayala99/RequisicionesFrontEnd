import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ApprovalUserOption {
  id: number;
  code: string;
  name: string;
}

interface ApprovalUserDialogData {
  users: ApprovalUserOption[];
}

@Component({
  selector: 'app-approval-user-selector-dialog',
  templateUrl: './approval-user-selector-dialog.component.html',
  styleUrls: ['./approval-user-selector-dialog.component.scss']
})
export class ApprovalUserSelectorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ApprovalUserDialogData,
    private readonly dialogRef: MatDialogRef<ApprovalUserSelectorDialogComponent>
  ) {}

  trackByUser(_: number, user: ApprovalUserOption): number {
    return user.id;
  }

  selectUser(user: ApprovalUserOption): void {
    this.dialogRef.close(user);
  }

  close(): void {
    this.dialogRef.close();
  }
}
