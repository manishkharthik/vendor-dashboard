// fetches the data from the backend using /api/signupsMonthly, and renders Highcharts
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

    // 1) Create an empty chart
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'column' },
      title: { text: "New Signup's 2025" }, // updated dynamically once we know the year
      subtitle: { text: 'Source: Member signups' },
      xAxis: {
        type: 'category',
        labels: {
          autoRotation: [-45, -90],
          style: { fontSize: '13px', fontFamily: 'Verdana, sans-serif' }
        }
      },
      yAxis: { min: 0, title: { text: "Sign Up's" } },
      legend: { enabled: false },
      tooltip: { pointFormat: "Sign Up's: <b>{point.y:.0f}</b>" },
      series: [{
        type: 'column',
        name: 'Signups',
        colors: [
          '#9b20d9', '#9215ac', '#861ec9', '#7a17e6', '#7010f9', '#691af3',
          '#6225ed', '#5b30e7', '#533be1', '#4c46db', '#9215ac', '#9b20d9'
        ],
        colorByPoint: true,
        groupPadding: 0,
        data: [],
        dataLabels: {
          enabled: true,
          color: '#000000',
          inside: false,
          verticalAlign: 'bottom',
          format: '{point.y:.0f}',
          style: { fontSize: '13px', fontFamily: 'Verdana, sans-serif' }
        }
      }]
    });

    // 2) Fetch from backend and apply
    const year = new Date().getFullYear(); // or hardcode / pass in
    this.api.getSignupsMonthly(/* { year: String(year) } if you add params */).subscribe({
      next: (res: ChartResponse) => {
        if (!this.chart) return;

        // Build [label, value] tuples to match your format
        const points = (res.categories ?? []).map((label, i) => [
          label.replace('’', "'"),                   // keep straight apostrophes like "Jan'25"
          res.series?.[0]?.data?.[i] ?? 0
        ]) as [string, number][];

        // Update title with year if labels present
        const guessedYear = /\d{2}$/.test(res.categories?.[0] ?? '')
          ? 2000 + parseInt((res.categories![0]).slice(-2), 10)
          : year;
        this.chart.setTitle({ text: `New Signup's ${guessedYear}` });

        this.chart.series[0].setData(points, true);
      },
      error: (err) => console.error('[signups-monthly] API error:', err)
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
