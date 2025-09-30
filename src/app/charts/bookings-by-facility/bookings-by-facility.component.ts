import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Input, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import * as Highcharts from 'highcharts';

type FacilityVolumeResponse = {
  categories: string[];
  series: { name: string; data: number[] }[];
};

@Component({
  selector: 'app-bookings-by-facility',
  standalone: true,
  templateUrl: './bookings-by-facility.component.html',
  styleUrls: ['./bookings-by-facility.component.scss']
})
export class BookingsByFacilityComponent implements AfterViewInit, OnDestroy {
  @Input() vendorId = '67f773acc9504931fcc411ec';
  @Input() title = `Booking breakdown by facility`;
  @Input() subtitle = 'Source : Facilities';

  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private chart?: Highcharts.Chart;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1) Chart shell 
    const options: Highcharts.Options = {
      chart: { type: 'pie' },
      title: { text: this.title },
      subtitle: { text: this.subtitle },
      accessibility: { point: { valueSuffix: '%' } },
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: {
        headerFormat: '<span style="font-size:12px">{point.key}</span><br/>',
        pointFormat:
          'Bookings Breakdown: <b>{point.percentage:.0f}%</b><br/>' +
          'Bookings: <b>{point.y:,.0f}</b>' 
      },
      plotOptions: {
        pie: {
          innerSize: '65%',
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: [
            { enabled: true, distance: 25, format: '{point.name}' } as Highcharts.SeriesPieDataLabelsOptionsObject,
            { enabled: true, distance: -18, format: '{point.percentage:.0f}%', style: { fontSize: '0.95em', fontWeight: 'bold' } } as Highcharts.SeriesPieDataLabelsOptionsObject
          ],
          showInLegend: true
        } as Highcharts.PlotPieOptions
      },

      colors: ['#2DA3FF', '#5B5CE2', '#08D474', '#FF7A45', '#FFC53D', '#13C2C2']
    };

    this.chart = Highcharts.chart(this.container.nativeElement, options);

    // 2) Fetch data and update
    let params = new HttpParams().set('vendorId', this.vendorId);
    this.http.get<FacilityVolumeResponse>('/api/bookings-by-facility', { params }).subscribe({
      next: (res) => {
        const names = res.categories ?? [];
        const counts = (res.series?.[0]?.data ?? []).map(v => Math.max(0, Math.round(Number(v) || 0)));
        const data = names.map((name, i) => ({ name, y: counts[i] ?? 0 }));

        this.chart?.update({
          series: [{
            type: 'pie',
            name: 'Bookings Breakdown',
            innerSize: '65%',
            data
          }]
        }, true, true);
      },
      error: err => console.error('[bookings-by-facility] API error:', err)
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}

