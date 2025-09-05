import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Highcharts from 'highcharts';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type FRWeeklyRow = {
  label: string;            
  firstCount: number;
  returningCount: number;
};
type FRWeeklyResp = {
  window?: { start: string; end: string; tz: string };
  categories: string[];     
  rows: FRWeeklyRow[];
  series?: { name: string; data: number[] }[];
};

@Component({
  selector: 'app-new-vs-returning-visits',
  standalone: true,
  template: `<div #container style="width:100%; height:420px;"></div>`
})
export class NewVsReturningWeeklyVisitComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1) Create chart shell
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'column' },
      title: { text: 'New vs Returning Customers (weekly)' },
      subtitle: { text: 'Source: Member visits' },
      credits: { enabled: false },
      xAxis: { categories: [], labels: { rotation: -35 } },
      yAxis: { min: 0, title: { text: 'Proportion of visits (%)' } },
      legend: { align: 'center', verticalAlign: 'bottom' },
      tooltip: {
        shared: true,
        useHTML: true,
        headerFormat: '<b>{point.key}</b><br/>',
        pointFormat:
          `<span style="color:{series.color}">● {series.name}</span>: `
          + `<b>{point.y:,.0f}</b> ({point.percentage:.0f}%)<br/>`
      },
      plotOptions: {
        column: {
          stacking: 'percent',
          dataLabels: {
            enabled: true,
            filter: { property: 'percentage', operator: '>', value: 0 },
            format: '{point.percentage:.0f}%',
            style: { textOutline: 'none', fontWeight: 'bold' }
          }
        }
      },
      colors: ['#1EB7FF', '#5A38D6'],
      series: [
        { type: 'column', name: 'First-time', data: [] },
        { type: 'column', name: 'Returning',  data: [] }
      ]
    } as Highcharts.Options);

    // 2) Fetch weekly data from backend
    this.http.get<FRWeeklyResp>('/api/new-vs-returning', { params: { step: 'fr-weekly' } })
      .subscribe({
        next: (res) => {
          if (!this.chart) return;
          let cats = Array.isArray(res.categories) ? res.categories : (res.rows ?? []).map(r => r.label);

          const first = (res.series?.find(s => /first/i.test(s.name))?.data)
            ?? (res.rows ?? []).map(r => Number(r.firstCount || 0));
          const ret   = (res.series?.find(s => /return/i.test(s.name))?.data)
            ?? (res.rows ?? []).map(r => Number(r.returningCount || 0));
          
          if (cats.length !== first.length || cats.length !== ret.length) {
            const rows = res.rows ?? [];
            cats.splice(0, cats.length, ...rows.map(r => r.label));
          }

          this.chart.update({
            xAxis: { categories: cats },
            series: [
              { type: 'column', name: 'First-time', data: first },
              { type: 'column', name: 'Returning',  data: ret }
          ]
          }, true, true);
        },
        error: (err) => console.error('[fr-weekly] API error:', err)
      });
    }
  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
