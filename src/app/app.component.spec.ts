import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent]
    }).compileComponents();
  });

  it('should create the shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render navigation links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.shell__link')).map((element) => element.textContent?.trim());

    expect(links).toEqual(['Inicio', 'Datos de Proveedor']);
  });

  it('should toggle the mobile sidebar state', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.sidebarOpen).toBeFalse();

    app.toggleSidebar();
    expect(app.sidebarOpen).toBeTrue();

    app.closeSidebar();
    expect(app.sidebarOpen).toBeFalse();
  });
});
