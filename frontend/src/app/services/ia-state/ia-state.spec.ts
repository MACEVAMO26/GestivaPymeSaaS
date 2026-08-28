import { TestBed } from '@angular/core/testing';

import { IaState } from './ia-state';

describe('IaState', () => {
  let service: IaState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IaState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
