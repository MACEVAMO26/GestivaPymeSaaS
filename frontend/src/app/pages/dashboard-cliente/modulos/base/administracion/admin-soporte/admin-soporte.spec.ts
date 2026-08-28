import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSoporte } from './admin-soporte';

describe('AdminSoporte', () => {
  let component: AdminSoporte;
  let fixture: ComponentFixture<AdminSoporte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSoporte],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSoporte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
