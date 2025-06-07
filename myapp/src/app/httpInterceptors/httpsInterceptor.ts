import {
  HttpRequest,
  HttpInterceptor,
  HttpHandler,
} from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable()
export class HTTPSInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler) {
    const httpsRequest = request.clone({
      headers: request.headers.set('Content-Type', 'application/json'),
      withCredentials: true,
    });
    return next.handle(httpsRequest);
  }
}
