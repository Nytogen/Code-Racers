import { TestBed } from '@angular/core/testing';

import { BackendAPIService } from './backend-api.service';

describe('BackendAPIServiceService', () => {
  let service: BackendAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackendAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
