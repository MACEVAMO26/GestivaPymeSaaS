import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestivaIaAssistant } from './gestiva-ia-assistant';

describe('GestivaIaAssistant', () => {
  let component: GestivaIaAssistant;
  let fixture: ComponentFixture<GestivaIaAssistant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestivaIaAssistant],
    }).compileComponents();

    fixture = TestBed.createComponent(GestivaIaAssistant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
