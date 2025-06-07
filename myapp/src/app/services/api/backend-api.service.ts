import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BackendAPIService {
  private apiUrl;

  constructor(private http: HttpClient) {
    this.apiUrl = environment.apiUrl;
  }

  private cleanURL(url: string) {
    url = url.replace(RegExp('^/+'), '');
    url = url.replace(RegExp('/+$'), '');
    return url + '/';
  }

  get(url: string): Observable<any> {
    url = this.cleanURL(url);
    return this.http.get<any>(this.apiUrl + url);
  }

  getMultiple(url: string, query: object): Observable<any> {
    url = this.cleanURL(url);
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      params = params.set(key, value);
    }
    return this.http.get<any>(this.apiUrl + url, { params });
  }

  getOne(url: string, id: string): Observable<any> {
    url = this.cleanURL(url);
    id = this.cleanURL(id);
    return this.http.get<any>(this.apiUrl + url + id);
  }

  post(url: string, body: object): Observable<any> {
    url = this.cleanURL(url);
    return this.http.post<any>(this.apiUrl + url, body);
  }

  patch(url: string, body: object): Observable<any> {
    url = this.cleanURL(url);
    return this.http.patch<any>(this.apiUrl + url, body);
  }

  put(url: string, body: object): Observable<any> {
    url = this.cleanURL(url);
    return this.http.put<any>(this.apiUrl + url, body);
  }

  delete(url: string): Observable<any> {
    url = this.cleanURL(url);
    return this.http.delete<any>(this.apiUrl + url);
  }
}
