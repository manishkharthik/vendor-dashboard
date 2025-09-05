import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import * as Highcharts from 'highcharts';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ChartDataService, ChartResponse } from '../../core/chart-data.service';

@Component({
  selector: 'app-weekly-sales',
  standalone: true,
  template: `<div #container style="width:100%; height:400px;"></div>`
})
export class WeeklySalesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private platformId = inject(PLATFORM_ID);

  constructor(private api: ChartDataService) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1) Create an empty chart 
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'line' },
      title: { text: 'Weekly Sales' },
      subtitle: { text: 'Source: Member visits' },
      xAxis: { categories: [] },
      yAxis: { title: { text: 'SGD $' } },
      plotOptions: {
        line: { dataLabels: { enabled: true }, enableMouseTracking: true }
      },
      series: [{ type: 'line', name: 'Sales', data: [] }]
    });

    // 2) Fetch from backend and apply to chart
    this.api.getWeeklySales().subscribe({
      next: (res: ChartResponse) => {
        if (!this.chart) return;  
        const categories = res.categories;
        const roundedData = (res.series[0]?.data ?? []).map(v => Math.round(v));
        this.chart.update(
          {
            xAxis: { categories },
            series: [
              {
                type: 'line',
                name: res.series[0]?.name ?? 'Sales',
                data: roundedData
              } as Highcharts.SeriesLineOptions
            ]
          },
          true,  
          true   
        );
      },
      error: (err) => {
        console.error('Failed to load weekly sales:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
