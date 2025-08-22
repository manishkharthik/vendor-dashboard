import { Component } from '@angular/core';
import { WeeklyBookingsComponent } from './charts/weekly-bookings/weekly-bookings.component';
import { WeeklySalesComponent } from "./charts/weekly-sales/weekly-sales.component";
import { SignupsMonthlyComponent } from "./charts/signups-monthly/signups-monthly.component";
import { RevenueByTierComponent } from "./charts/revenue-by-tier/revenue-by-tier.component";
import { BookingsByFacilityComponent } from './charts/bookings-by-facility/bookings-by-facility.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    WeeklyBookingsComponent,
    WeeklySalesComponent,
    SignupsMonthlyComponent,
    RevenueByTierComponent,
    BookingsByFacilityComponent
  ],
  template: `
    <div class="grid-container">
      <app-weekly-bookings></app-weekly-bookings>
      <app-weekly-sales></app-weekly-sales>
      <app-signups-monthly></app-signups-monthly>
      <app-revenue-by-tier></app-revenue-by-tier>
      <app-bookings-by-facility></app-bookings-by-facility>
    </div>
  `,
})
export class App {}

