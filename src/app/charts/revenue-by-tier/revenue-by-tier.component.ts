import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, Input } from '@angular/core';
import * as Highcharts from 'highcharts';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

type TierRevenueResponse = {
  categories: string[];
  series: { name: string; data: number[] }[];
};

@Component({
  selector: 'app-revenue-by-tier',
  standalone: true,
  template: `<div #container style="width:100%; height:400px;"></div>`
})
export class RevenueByTierComponent implements AfterViewInit, OnDestroy {
  @Input() vendorId: string = '67f773acc9504931fcc411ec'; 
  @Input() from?: string; 
  @Input() to?: string;

  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1) Chart shell (column by tier)
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'column' },
      title: { text: 'Sales by Loyalty Tier' },
      subtitle: { text: 'Source: Member Visits' },
      xAxis: {
        categories: [],
        labels: {
          autoRotation: [-45, -90],
          style: { fontSize: '13px', fontFamily: 'Verdana, sans-serif' }
        }
      },
      yAxis: { 
        min: 0, 
        title: { text: 'Sales (SGD)' },
        labels: {
          formatter: function () {
            return '$' + Highcharts.numberFormat(this.value as number, 0);
          }
        }
      },

      legend: { enabled: false },
      tooltip: { pointFormat: 'Sales: <b>${point.y:.2f}</b>' },
      series: [{
        type: 'column',
        name: 'Sales (SGD)',
        colorByPoint: true,
        colors: [
          '#9b20d9', '#7010f9', '#691af3', '#533be1', '#4c46db', '#9215ac', '#9b20d9'
        ],
        groupPadding: 0.05,
        data: [],
        dataLabels: {
          enabled: true,
          color: '#000000',
          inside: false,
          verticalAlign: 'bottom',
          format: '${point.y:,.0f}',
          style: { fontSize: '13px', fontFamily: 'Verdana, sans-serif' }
        }
      }]
    });

    // 2) Fetch backend data
    let params = new HttpParams().set('vendorId', this.vendorId);
    if (this.from && this.to) {
      params = params.set('from', this.from).set('to', this.to);
    }

    this.http.get<TierRevenueResponse>('/api/revenue-by-tier', { params }).subscribe({
      next: (res) => {
        if (!this.chart) return;
        this.chart.update(
          {
            xAxis: { categories: res.categories ?? [] },
            series: [
              {
                type: 'column',
                name: res.series?.[0]?.name ?? 'Revenue (SGD)',
                data: res.series?.[0]?.data ?? []
              } as Highcharts.SeriesColumnOptions
            ]
          },
          true,
          true
        );
      },
      error: (err) => console.error('[revenue-by-tier] API error:', err)
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
