# VendorDashboard

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.5.

The **Vendor Dashboard** is a full-stack analytics platform that provides vendors with real-time insights into their bookings, sales, signups, and revenue.  
It combines an **Angular frontend** with an **Express + MongoDB backend** to visualise business data through analytical charts.

---

## Tech Stack
- **Frontend**: Angular  
- **Backend**: Express API (Node.js)  
- **Database**: MongoDB  

---

## Getting Started

To start a local development server:

Navigate to the backend directory and start the server:
```bash
cd backend 
npm run dev
```

Split the terminal and navigate back to the vendor-dashboard directory
```bash
cd .. 
npm install
npm start
```

Landing page can be found under src/app/app.ts

Details for charts created so far:
1. Weekly Booking Data
- Backend: backend/routes/weeklyBookings.ts backend/routes/weeklyCancellations.ts
- Frontend: src/app/charts/weekly-bookings/weekly-bookings.component.ts

2. Weekly Sales
- Backend: backend/routes/weeklySales.ts
- Frontend: src/app/charts/weekly-sales/weekly-sales.component.ts

3. New Signup's 2025
- Backend: backend/routes/signupsMonthly.ts
- Frontend: src/app/charts/signups-monthly/signups-monthly.component.ts

4. Revenue by Loyalty Tier
- Backend: backend/routes/revenue-by-tier.ts
- Frontend: src/app/charts/revenue-by-tier/revenue-by-tier.component.ts

5. Booking breakdown by facility
- Backend: backend/routes/bookings-by-facility.ts
- Frontend: src/app/charts/bookings-by-facility/bookings-by-facility.component.ts