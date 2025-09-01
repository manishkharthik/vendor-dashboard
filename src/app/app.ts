import { Component } from '@angular/core';
import { KpiRowComponent } from './charts/kpi-row/kpi-row.component';
import { WeeklyBookingsComponent } from './charts/weekly-bookings/weekly-bookings.component';
import { WeeklySalesComponent } from "./charts/weekly-sales/weekly-sales.component";
import { SignupsMonthlyComponent } from "./charts/signups-monthly/signups-monthly.component";
import { RevenueByTierComponent } from "./charts/revenue-by-tier/revenue-by-tier.component";
import { BookingsByFacilityComponent } from './charts/bookings-by-facility/bookings-by-facility.component';
import { AovByVisitComponent } from './charts/aov-by-visit/aov-by-visit.component';
import { NewVsReturningWeeklyVisitComponent } from './charts/new-vs-returning-visits/new-vs-returning-visits.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    KpiRowComponent,
    WeeklyBookingsComponent,
    WeeklySalesComponent,
    SignupsMonthlyComponent,
    RevenueByTierComponent,
    BookingsByFacilityComponent,
    AovByVisitComponent,
    NewVsReturningWeeklyVisitComponent,
  ],
  template: `
    <div class="appbar">Ganesha Ek Sanskriti</div>
    <div class="page-subheader">Analytics</div>

    <div class="container">
      <!-- SUMMARY stays -->
      <app-kpi-row></app-kpi-row>

      <!-- CHART CARDS like the screenshot -->
      <div class="grid-container">
        <div class="panel">
          <div class="panel-title">Weekly Booking data</div>
          <div class="panel-subtitle">Source : Order Table</div>
          <app-weekly-bookings></app-weekly-bookings>
        </div>

        <div class="panel">
          <div class="panel-title">Weekly Sales data</div>
          <div class="panel-subtitle">Source : Order Table</div>
          <app-weekly-sales></app-weekly-sales>
        </div>

        <div class="panel">
          <div class="panel-title">Daily sessions at Urban Sports</div>
          <div class="panel-subtitle">Source: Click stream Analytics</div>
          <app-signups-monthly></app-signups-monthly>
        </div>

        <div class="panel">
          <div class="panel-title">Broadcasts delivery statistics</div>
          <div class="panel-subtitle">&nbsp;</div>
          <app-revenue-by-tier></app-revenue-by-tier>
        </div>

        <div class="panel">
          <div class="panel-title">Bookings by Facility</div>
          <div class="panel-subtitle">Source : Order Table</div>
          <app-bookings-by-facility></app-bookings-by-facility>
        </div>

        <div class="panel">
          <div class="panel-title">AOV by Visit</div>
          <div class="panel-subtitle">Source : Member visits</div>
          <app-aov-by-visit></app-aov-by-visit>
        </div>

        <div class="panel">
          <div class="panel-title">New vs Returning – Weekly Visits</div>
          <div class="panel-subtitle">Source : Member visits</div>
          <app-new-vs-returning-visits></app-new-vs-returning-visits>
        </div>
      </div>
    </div>
  `,
})
export class App {}