import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestivaIaTutorial } from './gestiva-ia-tutorial';

describe('GestivaIaTutorial', () => {
  let component: GestivaIaTutorial;
  let fixture: ComponentFixture<GestivaIaTutorial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestivaIaTutorial],
    }).compileComponents();

    fixture = TestBed.createComponent(GestivaIaTutorial);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
