import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';

import { AppLayoutComponent } from './app-layout.component';
import { AuthService } from '../../features/auth/services/auth.service';

describe('AppLayoutComponent', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppLayoutComponent]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    sessionStorage.setItem('app_auth_session', 'true');
    sessionStorage.setItem('app_auth_user', 'admin@demo.com');
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create the layout', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should render shell navigation links', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.sidebar_link')).map((element) => element.textContent?.trim());

    expect(links).toContain('Inicio');
    expect(links).toContain('Proveedor');
    expect(links).toContain('Requisicion');
    expect(links).toContain('Usuario');
  });

  it('should show the current user from the auth session', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('admin@demo.com');
  });

  it('should toggle the mobile sidebar state', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    const component = fixture.componentInstance;

    expect(component.sidebarOpen).toBeFalse();

    component.toggleSidebar();
    expect(component.sidebarOpen).toBeTrue();

    component.closeSidebar();
    expect(component.sidebarOpen).toBeFalse();
  });

  it('should clear the auth session on logout', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    const component = fixture.componentInstance;
    spyOn(router, 'navigate').and.resolveTo(true);

    component.logout();

    expect(authService.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
