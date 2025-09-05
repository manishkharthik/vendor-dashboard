import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { take, map, catchError } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

type WeeklySeriesResp = {
  categories: string[];
  series: { name: string; data: number[] }[];
};

type ByFacilityResp = {
  categories: string[];               
  series: { name: string; data: number[] }[]; 
};

@Component({
  selector: 'app-kpi-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="kpi-section">
      <div class="kpi-header">
        <h2 class="kpi-title">Vendor Analytics Dashboard: Akasa</h2>
        <p class="kpi-subtitle">Summary of last 8 weeks</p>
      </div>

      <div class="kpi-wrap">
        <!-- 1. New Member Signups -->
        <div class="kpi-card">
          <div class="kpi-label">New Member Signups</div>
          <div class="kpi-value">{{ signupsText }}</div>
        </div>

        <!-- 2. Total Member Bookings -->
        <div class="kpi-card">
          <div class="kpi-label">Total Member Bookings</div>
          <div class="kpi-value">{{ bookingsText }}</div>
        </div>

        <!-- 3. Total Member Visits -->
        <div class="kpi-card">
          <div class="kpi-label">Total Member Visits</div>
          <div class="kpi-value">{{ visitsText }}</div>
        </div>

        <!-- 4. Total Sales -->
        <div class="kpi-card">
          <div class="kpi-label">Total Sales</div>
          <div class="kpi-value">{{ salesText }}</div>
        </div>

        <!-- 5. Total AOV = Sales / Visits -->
        <div class="kpi-card">
          <div class="kpi-label">Average Order Value</div>
          <div class="kpi-value">{{ aovText }}</div>
        </div>

        <!-- 6. Most Popular Facility -->
        <div class="kpi-card">
          <div class="kpi-label">Most Popular Facility</div>
          <div class="kpi-value">{{ popularFacilityText }}</div>
        </div>

        <!-- 7. Metric #7 -->
        <div class="kpi-card">
          <div class="kpi-label">Metric #7</div>
          <div class="kpi-value">{{ placeholderAText }}</div>
        </div>

        <!-- 8. Metric #8 -->
        <div class="kpi-card">
          <div class="kpi-label">Metric #8</div>
          <div class="kpi-value">{{ placeholderBText }}</div>
        </div>
      </div>
    </section>
  `,
})
export class KpiRowComponent implements OnInit {
  private http = inject(HttpClient);

  signupsText = '';
  bookingsText = '';
  visitsText   = '';
  salesText    = '';
  aovText      = '';
  popularFacilityText = '';
  placeholderAText = '—';
  placeholderBText = '—';

  private sum(arr: number[] = []) { return arr.reduce((s, n) => s + (+n || 0), 0); }
  private fmtInt(n: number) {
    try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n); }
    catch { return String(Math.round(n || 0)); }
  }
  private fmt2(n: number) {
    if (!isFinite(n)) return '—';
    try { return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
    catch { return (Math.round((n || 0) * 100) / 100).toFixed(2); }
  }
  private pct(n: number) {
    if (!isFinite(n)) return '—';
    try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n); }
    catch { return String(Math.round(n)); }
  }

  ngOnInit() {
    const cached = this.readCache();
    if (cached) {
      ({
        signupsText: this.signupsText,
        bookingsText: this.bookingsText,
        visitsText: this.visitsText,
        salesText: this.salesText,
        aovText: this.aovText,
        popularFacilityText: this.popularFacilityText,
        placeholderAText: this.placeholderAText,
        placeholderBText: this.placeholderBText,
      } = cached);
    }

    // Fetch once; render once
    forkJoin({
      signups: this.http.get<WeeklySeriesResp>('/api/signups-monthly').pipe(
        map(res => this.sum(res.series?.[0]?.data)),
        catchError(err => { console.error('[KPI] signups', err); return of(0); }),
        take(1)
      ),
      bookings: this.http.get<WeeklySeriesResp>('/api/weekly-bookings').pipe(
        map(res => this.sum(res.series?.[0]?.data)),
        catchError(err => { console.error('[KPI] bookings', err); return of(0); }),
        take(1)
      ),
      visits: this.http.get<WeeklySeriesResp>('/api/new-vs-returning', { params: { step: 'fr-weekly' } }).pipe(
        map(res => this.sum(res.series?.[0]?.data) + this.sum(res.series?.[1]?.data)),
        catchError(err => { console.error('[KPI] visits', err); return of(0); }),
        take(1)
      ),
      sales: this.http.get<WeeklySeriesResp>('/api/weekly-sales').pipe( // <-- adjust if your route differs
        map(res => this.sum(res.series?.[0]?.data)),
        catchError(err => { console.error('[KPI] sales', err); return of(0); }),
        take(1)
      ),
      byFacility: this.http.get<ByFacilityResp>('/api/bookings-by-facility').pipe( // <-- adjust if differs
        catchError(err => { console.error('[KPI] by-facility', err); return of({ categories: [], series: [{ name:'', data: [] }] } as ByFacilityResp); }),
        take(1)
      ),
    }).subscribe(({ signups, bookings, visits, sales, byFacility }) => {
      // 1) Base numbers
      this.signupsText = this.fmtInt(signups);
      this.bookingsText = this.fmtInt(bookings);
      this.visitsText = this.fmtInt(visits);
      this.salesText = `$${this.fmtInt(sales)}`;

      // 2) AOV = Sales / Visits (2 decimals)
      const aov = visits > 0 ? sales / visits : NaN;
      this.aovText = isFinite(aov) ? `$${this.fmt2(aov)}` : '—';

      // 3) Popular Facility: "Name: XX%"
      const data = byFacility.series?.[0]?.data ?? [];
      const names = byFacility.categories ?? [];
      const totalFac = this.sum(data);
      if (data.length && totalFac > 0) {
        const idx = data.reduce((best, n, i) => (n > data[best] ? i : best), 0);
        const topName = names[idx] ?? '—';
        const percent = (data[idx] / totalFac) * 100;
        this.popularFacilityText = `${topName}`;
      } else {
        this.popularFacilityText = '';
      }

      // Placeholders
      this.placeholderAText = '';
      this.placeholderBText = '';

      // Persist cache for instant next paint
      this.writeCache({
        signupsText: this.signupsText,
        bookingsText: this.bookingsText,
        visitsText: this.visitsText,
        salesText: this.salesText,
        aovText: this.aovText,
        popularFacilityText: this.popularFacilityText,
        placeholderAText: this.placeholderAText,
        placeholderBText: this.placeholderBText,
      });
    });
  }

  private readCache() {
    try { return JSON.parse(localStorage.getItem('kpi-cache-v2') || 'null'); } catch { return null; }
  }
  private writeCache(v: any) {
    try { localStorage.setItem('kpi-cache-v2', JSON.stringify(v)); } catch {}
  }
}
