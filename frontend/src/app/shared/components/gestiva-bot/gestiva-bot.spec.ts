import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestivaBot } from './gestiva-bot';

describe('GestivaBot', () => {
  let component: GestivaBot;
  let fixture: ComponentFixture<GestivaBot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestivaBot],
    }).compileComponents();

    fixture = TestBed.createComponent(GestivaBot);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
