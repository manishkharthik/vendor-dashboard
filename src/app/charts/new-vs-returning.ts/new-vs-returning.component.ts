// src/app/charts/new-vs-returning-monthly.component.ts
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Highcharts from 'highcharts';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type FRMonthlyResp = {
  categories: string[];
  series: { name: string; data: number[] }[];
};

@Component({
  selector: 'app-new-vs-returning-monthly',
  standalone: true,
  template: `<div #container style="width:100%; height:420px;"></div>`
})
export class NewVsReturningMonthlyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1) Create the empty stacked-percent chart shell
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'column' },
      title: { text: `New vs Returning Customers` },
      subtitle: { text: 'Source: CRM Table' },
      xAxis: { categories: [] },
      yAxis: { min: 0, title: { text: 'Percentage (%)' } },
      legend: { align: 'center', verticalAlign: 'bottom' },
      tooltip: {
        shared: true,
        useHTML: true,
        headerFormat: '<b>For the month of {point.key}</b><br/>',
        pointFormat:
          `<span style="color:{series.color}">\u25CF {series.name}</span>: `
          + `<b>${'{point.y:,.2f}'}</b> ({point.percentage:.0f}%)<br/>`
      },
      plotOptions: {
        column: {
          stacking: 'percent',
          dataLabels: {
            enabled: true,
            format: '{point.percentage:.0f}%',
            style: { textOutline: 'none', fontWeight: 'bold' }
          }
        }
      },
      // nice two-color palette like your screenshot
      colors: ['#1EB7FF', '#5A38D6'],
      series: [
        { type: 'column', name: 'New',       data: [] },
        { type: 'column', name: 'Returning', data: [] }
      ]
    });

    // 2) Fetch backend and plug in
    this.http.get<FRMonthlyResp>('/api/new-vs-returning', {
      params: { step: 'fr-monthly' }
    }).subscribe({
      next: (res) => {
        if (!this.chart) return;

        const cats = res.categories ?? [];
        const newIdx = (res.series || []).findIndex(s => /first|new/i.test(s.name));
        const retIdx = (res.series || []).findIndex(s => /return/i.test(s.name));

        const newData = newIdx >= 0 ? res.series![newIdx].data : [];
        const retData = retIdx >= 0 ? res.series![retIdx].data : [];

        this.chart.update({
          xAxis: { categories: cats },
          series: [
            { type: 'column', name: 'New',       data: newData },
            { type: 'column', name: 'Returning', data: retData }
          ]
        }, true, true);

        // Optional: title suffix like “Q3 ’25” from first/last categories
        if (cats.length) {
          const t = this.chart.options.title?.text || 'New vs Returning Shoppers';
          this.chart.setTitle({ text: t });
        }
      },
      error: (err) => console.error('[fr-monthly] API error:', err)
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
