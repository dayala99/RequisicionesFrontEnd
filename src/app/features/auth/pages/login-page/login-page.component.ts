import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  loginError = '';

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['admin@demo.com', [Validators.required, Validators.email]],
    password: ['123456', [Validators.required]]
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

    const { email, password } = this.loginForm.getRawValue();
    const isValid = this.authService.login(email, password);

    if (!isValid) {
      this.loginError = 'Correo o contrasena incorrectos.';
      return;
    }

    this.loginError = '';
    void this.router.navigate(['/']);
  }
}
