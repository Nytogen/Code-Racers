import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HTTPSInterceptor } from './httpsInterceptor';

export const HttpInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: HTTPSInterceptor, multi: true },
];
