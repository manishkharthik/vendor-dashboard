import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, Input } from '@angular/core';
import * as Highcharts from 'highcharts';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

type ByActualRow = {
  actualVisits: number;
  users: number;
  meanAOV: number;       // per-user average AOV in this bucket
  weightedAOV?: number;  // optional (sumNet / sumVisits)
};

type ByActualResponse = {
  rows: ByActualRow[];
  // (your backend may also return categories/series; we’ll build from rows)
};

@Component({
  selector: 'app-aov-by-visit',
  standalone: true,
  template: `<div #container style="width:100%; height:400px;"></div>`
})
export class AovByVisitComponent implements AfterViewInit, OnDestroy {
  @Input() vendorId: string = '67f773acc9504931fcc411ec';
  @Input() from?: string; // optional ISO
  @Input() to?: string;   // optional ISO

  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1) Chart shell
    this.chart = Highcharts.chart(this.container.nativeElement, {
      chart: { type: 'column' },
      title: { text: 'Mean AOV by Visit Count' },
      subtitle: { text: 'Source: Member visits' },
      credits: { enabled: false },
      xAxis: {
        categories: [],
        title: { text: 'Number of visits' },
        labels: {
          autoRotation: [-45, -90],
          style: { fontSize: '13px', fontFamily: 'Verdana, sans-serif' }
        }
      },
      yAxis: {
        min: 0,
        title: { text: 'Mean AOV (SGD)' },
        labels: { formatter: function () { return '$' + Highcharts.numberFormat(this.value as number, 0); } }
      },
      tooltip: {
        headerFormat: '<b>For users who visited {point.key} time(s)</b><br/>',
        pointFormat: 'Mean AOV: <b>${point.y:.2f}</b><br/>Number of users: <b>{point.users}</b>'
      },
      legend: { enabled: false },
      plotOptions: {
        column: { groupPadding: 0.08, pointPadding: 0 }
      },
      series: [{
        type: 'column',
        name: 'Mean AOV',
        data: [] as Highcharts.PointOptionsObject[],
        colorByPoint: true,
        colors: [
          '#9b20d9', '#9215ac', '#861ec9', '#7a17e6', '#7010f9', '#691af3',
          '#6225ed', '#5b30e7', '#533be1', '#4c46db', '#9215ac', '#9b20d9'
        ],
        dataLabels: {
          enabled: true,
          format: '${point.y:,.0f}',
          style: { fontSize: '12px', fontFamily: 'Verdana, sans-serif' }
        }
      }]
    });

    // 2) Fetch backend
    let params = new HttpParams()
      .set('step', 'by-actual')
      .set('vendorId', this.vendorId);
    if (this.from && this.to) params = params.set('from', this.from).set('to', this.to);

    this.http.get<ByActualResponse>('/api/aov-by-visit', { params }).subscribe({
      next: (res) => {
        if (!this.chart) return;

        // Sort buckets numerically (e.g., 1,2,6,7,12,20)
        const rows = [...(res.rows ?? [])].sort((a, b) => a.actualVisits - b.actualVisits);

        // Build categories and points; attach `users` to each point for tooltip
        const categories = rows.map(r => String(r.actualVisits));
        const points = rows.map(r => ({
          y: Number(r.meanAOV ?? 0),
          users: Number(r.users ?? 0)   // custom field for tooltip
        }));

        this.chart.update(
          {
            xAxis: { categories },
            series: [{ type: 'column', name: 'Mean AOV', data: points }]
          },
          true,
          true
        );
      },
      error: (err) => console.error('[aov-by-actual] API error:', err)
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}