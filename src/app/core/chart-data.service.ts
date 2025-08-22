// fetch chart-related data from backend API and reuse across different Angular components.
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface ChartResponse {
  categories: string[];
  series: { name: string; data: number[] }[];
}

type Dateish = string | Date;

@Injectable({ providedIn: 'root' })
export class ChartDataService {
  private http = inject(HttpClient);
  private base = '/api'; 

  private toParams(opts: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(opts)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, v instanceof Date ? v.toISOString() : String(v));
    }
    return params;
  }

  // weekly-bookings
  getWeeklyBookings(opts: { vendorId?: string; from?: Dateish; to?: Dateish } = {}): Observable<ChartResponse> {
    const params = this.toParams(opts);
    return this.http.get<ChartResponse>(`${this.base}/weekly-bookings`, { params }).pipe(shareReplay(1));
  }

  // weekly-sales
  getWeeklySales(opts: { vendorId?: string; from?: Dateish; to?: Dateish } = {}): Observable<ChartResponse> {
    const params = this.toParams(opts);
    return this.http.get<ChartResponse>(`${this.base}/weekly-sales`, { params }).pipe(shareReplay(1));
  }

  // monthly-signups
  getSignupsMonthly(): Observable<ChartResponse> {
    return this.http.get<ChartResponse>(`${this.base}/signups-monthly`).pipe(shareReplay(1));
  }

  // weekly-cancellations
  getWeeklyCancellations(opts: { vendorId?: string; from?: Dateish; to?: Dateish } = {}): Observable<ChartResponse> {
    const params = this.toParams(opts);
    return this.http.get<ChartResponse>(`${this.base}/weekly-cancellations`, { params })
      .pipe(shareReplay(1));
  }
}


