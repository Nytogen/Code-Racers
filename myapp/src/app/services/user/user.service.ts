import { Injectable } from '@angular/core';
import { user } from 'src/app/mappings/users';
import { Observable } from 'rxjs';
import { BackendAPIService } from '../api/backend-api.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private BackendAPIService: BackendAPIService) {}

  getUser(): Observable<user> {
    return this.BackendAPIService.get('session');
  }
}
