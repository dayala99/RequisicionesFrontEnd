import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { RequisicionesPageComponent } from './requisiciones-page.component';

@Component({
  selector: 'app-provider-form',
  template: ''
})
class ProviderFormStubComponent {
  @Input() embedded = false;
}

describe('RequisicionesPageComponent', () => {
  let component: RequisicionesPageComponent;
  let fixture: ComponentFixture<RequisicionesPageComponent>;
  let matDialogMock: { open: jasmine.Spy };

  beforeEach(async () => {
    matDialogMock = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of(false)
      })
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [RequisicionesPageComponent, ProviderFormStubComponent],
      providers: [
        {
          provide: MatDialog,
          useValue: matDialogMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequisicionesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep the editor hidden until Nuevo is clicked', () => {
    expect(component.mostrarEditorPedido).toBeFalse();

    component.ejecutarAccion('Nuevo');

    expect(component.mostrarEditorPedido).toBeTrue();
  });

  it('should hide the editor when Cerrar is clicked', () => {
    component.iniciarNuevoPedido();

    component.ejecutarAccion('Cerrar');

    expect(component.mostrarEditorPedido).toBeFalse();
  });

  it('should keep the editor open when cancel confirmation is rejected', () => {
    component.iniciarNuevoPedido();
    matDialogMock.open.and.returnValue({
      afterClosed: () => of(false)
    });

    component.confirmarCancelacionPedido();

    expect(component.mostrarEditorPedido).toBeTrue();
  });

  it('should close the editor when cancel confirmation is accepted', () => {
    component.iniciarNuevoPedido();
    matDialogMock.open.and.returnValue({
      afterClosed: () => of(true)
    });

    component.confirmarCancelacionPedido();

    expect(component.mostrarEditorPedido).toBeFalse();
  });

  it('should open the cancel dialog when cancel is requested', () => {
    component.iniciarNuevoPedido();

    component.confirmarCancelacionPedido();

    expect(matDialogMock.open).toHaveBeenCalled();
  });

  it('should initialize with pending requisitions', () => {
    expect(component.requisiciones.length).toBe(3);
    expect(component.requisiciones.every((item) => item.estado === 'Pendiente')).toBeTrue();
  });

  it('should filter requisitions by provider name', () => {
    component.filtersForm.patchValue({
      proveedor: 'andes',
      estado: 'Todos'
    });

    component.aplicarFiltros();

    expect(component.requisiciones.length).toBe(1);
    expect(component.requisiciones[0].proveedor).toBe('Andes Equipos');
  });

  it('should reset requisition filters to the default values', () => {
    component.filtersForm.patchValue({
      nroRequisicion: '1032',
      proveedor: 'tech',
      estado: 'Observado',
      gn: 'GC',
      tipo: 'Sin O/C'
    });

    component.limpiarFiltros();

    expect(component.filtersForm.value).toEqual({
      nroRequisicion: '',
      proveedor: '',
      estado: 'Pendiente',
      gn: 'Todos',
      tipo: 'Todos'
    });
    expect(component.requisiciones.length).toBe(3);
  });

  it('should initialize with mock cost centers', () => {
    expect(component.centrosCosto.length).toBe(3);
    expect(component.totalPorcentaje).toBe(100);
  });

  it('should add a new cost center row', () => {
    component.iniciarNuevoPedido();
    component.centrosCosto = component.centrosCosto.slice(0, 2);
    component.centroCostoForm.patchValue({
      centroCosto: 'CC-55 Proyectos'
    });
    component.detalleForm.patchValue({
      ctaGastoDescripcion: 'Control de proyectos'
    });

    component.agregarCentroCosto();

    expect(component.centrosCosto[0].codigo).toBe('CC-55 Proyectos');
    expect(component.centrosCosto[0].costo).toBe('Control de proyectos');
  });

  it('should remove a cost center row', () => {
    component.iniciarNuevoPedido();
    component.eliminarCentroCosto(2);

    expect(component.centrosCosto.some((item) => item.id === 2)).toBeFalse();
  });
});
