import { TestBed } from '@angular/core/testing';

import { DesktopApi } from './desktop-api';

describe('DesktopApi', () => {
  let service: DesktopApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesktopApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
