import * as dotenv from "dotenv";
import { resolve } from 'node:path';
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

import { setFixedTimeWindow } from "./middleware/time-window";

// Import controllers and routes
import AovByVisitController from "./controllers/aov-by-visit.controller";
import aovByVisitRoutes from "./routes/aov-by-visit";

import FacilitiesController from "./controllers/bookings-by-facility.controller";
import bookingsByFacilityRoutes from "./routes/bookings-by-facility";

import NewVsReturningVisitsController from "./controllers/new-vs-returning.controller";
import newVsReturningVisitsRoutes from "./routes/new-vs-returning";

import RevenueByTierController from "./controllers/revenue-by-tier.controller";
import revenueByTierRoutes from "./routes/revenue-by-tier";

import SignupsMonthlyController from "./controllers/signups-monthly.controller";
import signupsMonthlyRoutes from "./routes/signups-monthly";

import WeeklyBookingsController from "./controllers/weekly-bookings.controller";
import weeklyBookingsRoutes from "./routes/weekly-bookings";

import WeeklyCancellationsController from "./controllers/weekly-cancellations.controller";
import weeklyCancellationsRoutes from "./routes/weekly-cancellations";

import WeeklySalesController from "./controllers/weekly-sales.controller";
import weeklySalesRoutes from "./routes/weekly-sales";

dotenv.config({ path: "../.env" });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());
// Window available to all routes below
app.use(setFixedTimeWindow); 

const uri = process.env.MONGO_URI ?? '';
if (!uri) {
  console.error("MONGO_URI is missing from .env");
  process.exit(1);
}

const dbName = process.env.MONGO_DBNAME || 'fridaylife-dev';

async function startServer() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    app.get("/", (req, res) => res.send("API is running"));

    // Initialize controllers and routes
    const aovByVisitCtrl = new AovByVisitController(db);
    app.use("/", aovByVisitRoutes(aovByVisitCtrl));

    const facilitiesCtrl = new FacilitiesController(db);
    app.use("/", bookingsByFacilityRoutes(facilitiesCtrl));

    const newVsReturningCtrl = new NewVsReturningVisitsController(db);
    app.use("/", newVsReturningVisitsRoutes(newVsReturningCtrl));

    const revenueByTierCtrl = new RevenueByTierController(db);
    app.use("/", revenueByTierRoutes(revenueByTierCtrl));

    const signupsMonthlyCtrl = new SignupsMonthlyController(db);
    app.use("/", signupsMonthlyRoutes(signupsMonthlyCtrl));

    const weeklyBookingsCtrl = new WeeklyBookingsController(db);
    app.use("/", weeklyBookingsRoutes(weeklyBookingsCtrl));

    const weeklyCancellationsCtrl = new WeeklyCancellationsController(db);
    app.use("/", weeklyCancellationsRoutes(weeklyCancellationsCtrl));
    
    const weeklySalesCtrl = new WeeklySalesController(db);
    app.use("/", weeklySalesRoutes(weeklySalesCtrl));

    app.listen(port, () => {
      console.log(`Backend running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

startServer();