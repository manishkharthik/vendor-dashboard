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
  templateUrl: './app.html',
})
export class App {}