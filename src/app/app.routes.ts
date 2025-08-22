import { Routes } from '@angular/router';
import { WeeklyBookingsComponent } from './charts/weekly-bookings/weekly-bookings.component';

export const routes: Routes = [
  { path: 'weekly-bookings', component: WeeklyBookingsComponent },
  { path: '', redirectTo: 'weekly-bookings', pathMatch: 'full' }
];
