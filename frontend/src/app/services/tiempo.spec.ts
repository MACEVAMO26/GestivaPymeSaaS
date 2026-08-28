import { TestBed } from '@angular/core/testing';

import { Tiempo } from './tiempo';

describe('Tiempo', () => {
  let service: Tiempo;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tiempo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
