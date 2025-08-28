// fetches /api/signupsMonthly and renders Highcharts with a datetime x-axis
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import * as Highcharts from 'highcharts';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ChartDataService, ChartResponse } from '../../core/chart-data.service';

@Component({
  selector: 'app-signups-monthly',
  standalone: true,
  template: `<div #container style="width:100%; height:400px;"></div>`
})
export class SignupsMonthlyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private platformId = inject(PLATFORM_ID);

  constructor(private api: ChartDataService) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'column' },
      title: { text: 'New sign-ups' },
      subtitle: { text: 'Source: Member sign-ups' },
      credits: { enabled: false },
      xAxis: {
        type: 'datetime',
        labels: { format: '{value:%b %Y}', style: { fontSize: '13px', fontFamily: 'Verdana, sans-serif' } }
      },
      yAxis: { min: 0, title: { text: 'Sign-ups' } },
      legend: { enabled: false },
      tooltip: { xDateFormat: '%b %Y', pointFormat: 'Sign-ups: <b>{point.y:.0f}</b>' },
      series: [{
        type: 'column',
        name: 'Sign-ups',
        colorByPoint: true,
        groupPadding: 0,
        data: [] as Highcharts.PointOptionsObject[],
        dataLabels: {
          enabled: true, color: '#000', inside: false, verticalAlign: 'bottom',
          format: '{point.y:.0f}', style: { fontSize: '13px', fontFamily: 'Verdana, sans-serif' }
        }
      }]
    });

    this.api.getSignupsMonthly().subscribe({
      next: (res: ChartResponse & { points?: [number, number][] }) => {
        if (!this.chart) return;

        // Prefer backend timestamps if provided
        let points: [number, number][] = res.points ?? [];

        // Fallback: derive timestamps from labels like "Jul 2025"
        if (!points.length && Array.isArray(res.categories)) {
          const vals = res.series?.[0]?.data ?? [];
          points = res.categories.map((label, i) => {
            const m = label.replace(/\u2019/g, "'").match(/^([A-Za-z]{3})\s+(\d{4})$/);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const ts = m ? Date.UTC(parseInt(m[2],10), months.indexOf(m[1]), 1) : NaN;
            return [ts, Number(vals[i] ?? 0)] as [number, number];
          }).filter(([ts]) => Number.isFinite(ts));
        }

        points.sort((a,b) => a[0] - b[0]);
        this.chart.series[0].setData(points, true);

        // Title = single year or range
        if (points.length) {
          const y1 = new Date(points[0][0]).getUTCFullYear();
          const y2 = new Date(points[points.length-1][0]).getUTCFullYear();
          this.chart.setTitle({ text: y1 === y2 ? `New sign-ups ${y1}` : `New sign-ups ${y1}–${y2}` });
        } else {
          this.chart.setTitle({ text: 'New sign-ups' });
        }
      },
      error: (err) => console.error('[signups-monthly] API error:', err)
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
