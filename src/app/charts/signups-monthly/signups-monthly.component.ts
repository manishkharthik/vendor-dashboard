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

    // 1) Create chart shell
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'column' },
      title: { text: 'New sign-ups' },
      subtitle: { text: 'Source: Member sign-ups' },
      xAxis: {
        categories: [], 
        labels: { style: { fontSize: '12px' } }
      },
      yAxis: { min: 0, title: { text: 'Sign-ups' } },
      tooltip: {
        headerFormat: '<span style="font-size:12px">{point.key}</span><br/>',
        pointFormat: 'Sign-ups: <b>{point.y:.0f}</b>'
      },
      plotOptions: {
        series: {
          dataLabels: { enabled: true, formatter() { return (this.y ?? 0).toString(); } },
          colors: [
          '#235ba6ff', '#3984d3ff', '#3cb5f6ff', '#7a17e6', '#7010f9', '#691af3',
        ],
        }
      },
      series: [{ type: 'column', name: 'Sign-ups', colorByPoint: true, data: [] }]
    } as Highcharts.Options);

    // 2) Load data from backend
    this.api.getSignupsMonthly()
      .subscribe({
        next: (res) => {
          if (!this.chart) return;
          const cats: string[] = Array.isArray(res.categories) ? res.categories : [];
          const data: number[] = (res.series?.[0]?.data ?? []).map((v: any) => Number(v) || 0);

          this.chart.xAxis[0].setCategories(cats, false);
          this.chart.series[0].setData(data, true);
        },
        error: (err) => console.error('[signups-weekly] API error:', err)
      });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}