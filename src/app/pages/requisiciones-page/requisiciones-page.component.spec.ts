import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RequisicionesPageComponent } from './requisiciones-page.component';
import { ApiService } from 'src/app/Services/api.services';

describe('RequisicionesPageComponent', () => {
  let component: RequisicionesPageComponent;
  let fixture: ComponentFixture<RequisicionesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RequisicionesPageComponent ],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getWeatherForecast: () => of([{ date: '2026-04-22', temperatureC: 18, temperatureF: 64, summary: 'Templado' }])
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequisicionesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
