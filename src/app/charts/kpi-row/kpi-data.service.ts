import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

type WeeklySeriesResp = {
  categories: string[];
  series: { name: string; data: number[] }[];
  window?: { start: string; end: string; tz: string };
};

@Injectable({ providedIn: 'root' })
export class KpiDataService {
  private http = inject(HttpClient);

  private sum = (arr: number[] = []) => arr.reduce((s, n) => s + (+n || 0), 0);
  private sumFirstSeries = (res: WeeklySeriesResp) => this.sum(res.series?.[0]?.data);

  // Total Signups
  readonly signupsTotal$: Observable<number | null> = this.http
    .get<WeeklySeriesResp>('/api/signups-monthly')
    .pipe(
      map(res => this.sumFirstSeries(res)),
      catchError(err => { console.error('[KPI] signups error', err); return of(null); }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

  // Total Bookings
  readonly bookingsTotal$: Observable<number | null> = this.http
    .get<WeeklySeriesResp>('/api/weekly-bookings')
    .pipe(
      map(res => this.sumFirstSeries(res)),
      catchError(err => { console.error('[KPI] bookings error', err); return of(null); }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

  // Total Visits
  readonly visitsTotal$: Observable<number | null> = this.http
    .get<WeeklySeriesResp>('/api/new-vs-returning', { params: { step: 'fr-weekly' } })
    .pipe(
      map(res => this.sum(res.series?.[0]?.data) + this.sum(res.series?.[1]?.data)),
      catchError(err => { console.error('[KPI] visits error', err); return of(null); }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

  // Total Sales
  readonly salesTotal$: Observable<number | null> = this.http
    .get<WeeklySeriesResp>('/api/weekly-sales') 
    .pipe(
      map(res => this.sumFirstSeries(res)),
      catchError(err => { console.error('[KPI] sales error', err); return of(null); }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
}
