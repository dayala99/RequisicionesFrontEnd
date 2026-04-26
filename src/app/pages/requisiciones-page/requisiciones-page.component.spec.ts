import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [RequisicionesPageComponent, ProviderFormStubComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RequisicionesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
    component.eliminarCentroCosto(2);

    expect(component.centrosCosto.some((item) => item.id === 2)).toBeFalse();
  });
});
