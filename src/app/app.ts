import { Component } from '@angular/core';
import { WeeklyBookingsComponent } from './charts/weekly-bookings/weekly-bookings.component';
import { WeeklySalesComponent } from "./charts/weekly-sales/weekly-sales.component";
import { SignupsMonthlyComponent } from "./charts/signups-monthly/signups-monthly.component";
import { RevenueByTierComponent } from "./charts/revenue-by-tier/revenue-by-tier.component";
import { BookingsByFacilityComponent } from './charts/bookings-by-facility/bookings-by-facility.component';
import { AovByVisitComponent } from './charts/aov-by-visit/aov-by-visit.component';
import { NewVsReturningWeeklyComponent } from './charts/new-vs-returning.ts/new-vs-returning.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    WeeklyBookingsComponent,
    WeeklySalesComponent,
    SignupsMonthlyComponent,
    RevenueByTierComponent,
    BookingsByFacilityComponent,
    AovByVisitComponent,
    NewVsReturningWeeklyComponent,
  ],
  template: `
    <div class="grid-container">
      <app-weekly-bookings></app-weekly-bookings>
      <app-weekly-sales></app-weekly-sales>
      <app-signups-monthly></app-signups-monthly>
      <app-revenue-by-tier></app-revenue-by-tier>
      <app-bookings-by-facility></app-bookings-by-facility>
      <app-aov-by-visit></app-aov-by-visit>
      <app-new-vs-returning-weekly></app-new-vs-returning-weekly>
    </div>
  `,
})
export class App {}

