import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import * as Highcharts from 'highcharts';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ChartDataService } from '../../core/chart-data.service';
import { forkJoin } from 'rxjs';

type WeeklyResponse = {
  categories: string[];
  series: { name: string, data: number[] }[];
}

@Component({
  selector: 'app-weekly-bookings',
  standalone: true,
  templateUrl: './weekly-bookings.component.html',
  styleUrls: ['./weekly-bookings.component.scss']
})

export class WeeklyBookingsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private platformId = inject(PLATFORM_ID);

  constructor(private api: ChartDataService) {}

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1) Create chart shell
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'line' },
      title: { text: 'Weekly Booking data' },
      subtitle: { text: 'Source: User bookings' },
      xAxis: { categories: [], labels: { rotation: -35 } },
      yAxis: { title: { text: '# Bookings' } },
      tooltip: {
        shared: true,
        headerFormat: '<span style="font-size:12px">{point.key}</span><br/>',
        pointFormat:
          '<span style="color:{series.color}">●</span> {series.name}: <b>{point.y:,.0f}</b><br/>'
      },
      plotOptions: {
        series: {
          dataLabels: { enabled: true, formatter() { return (this.y ?? 0).toString(); } },
          marker: { enabled: true, radius: 4 },
          lineWidth: 3
        }
      },
      series: [
        { type: 'line', name: 'Total Bookings', data: [] },
        { type: 'line', name: 'Cancellations', data: [] }
      ]
    });

    // 2) Fetch data and update chart
    const bookings$ = this.api.getWeeklyBookings({ vendorId: '67f773acc9504931fcc411ec' });
    const cancels$  = this.api.getWeeklyCancellations({ vendorId: '67f773acc9504931fcc411ec' });  
    forkJoin({
      bookings: bookings$,
      cancels: cancels$
    }).subscribe({
      next: ({ bookings, cancels }) => {
        if (!this.chart) return;

        const cats = bookings?.categories ?? [];
        const bookingsData = (bookings?.series?.[0]?.data ?? []).map(v => Math.round(Number(v) || 0));

        const cMap = new Map<string, number>();
        (cancels?.categories ?? []).forEach((label, i) => {
          const n = Number(cancels?.series?.[0]?.data?.[i] ?? 0);
          cMap.set(label, Number.isFinite(n) ? Math.round(n) : 0);
        });
        const cancelsData = cats.map(label => cMap.get(label) ?? 0);

        this.chart.xAxis[0].setCategories(cats, false);
        this.chart.series[0].setData(bookingsData, false);
        this.chart.series[1].setData(cancelsData, true);
      },
      error: (err) => console.error('[weekly-bookings] fetch error:', err)
    });
  }
  ngOnDestroy() {
    this.chart?.destroy();
  }
}

