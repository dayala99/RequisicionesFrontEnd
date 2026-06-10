import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { noWhitespaceValidator } from 'src/app/shared/validators/form-validators';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  loginError = '';
  isSubmitting = false;

  readonly loginForm = this.formBuilder.nonNullable.group({
    userCode: ['', [Validators.required, noWhitespaceValidator()]],
    password: ['', [Validators.required, noWhitespaceValidator()]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { userCode, password } = this.loginForm.getRawValue();

    this.isSubmitting = true;
    this.loginError = '';

    this.authService.login(userCode, password).subscribe({
      next: (result) => {
        this.isSubmitting = false;

        if (!result.success) {
          this.loginError = result.message;
          return;
        }

        void this.router.navigate(['/']);
      },
      error: () => {
        this.isSubmitting = false;
        this.loginError = 'No se pudo validar el acceso. Intenta nuevamente.';
      }
    });
  }
}
