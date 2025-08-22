import * as dotenv from "dotenv";
import { resolve } from 'node:path';
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

import weeklyBookingsRoute from "./routes/weeklyBookings";
import weeklySalesRoute from "./routes/weeklySales";
import signupsMonthlyRoute from "./routes/signupsMonthly";
import revenueByTierRoute from "./routes/revenue-by-tier";
import bookingsByFacilityRoute from "./routes/bookings-by-facility";
import weeklyCancellationsRoute from "./routes/weeklyCancellations";

dotenv.config({ path: "../.env" });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

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

    // API routes
    app.use("/api/weekly-bookings", weeklyBookingsRoute(db));
    app.use("/api/weekly-sales", weeklySalesRoute(db));
    app.use("/api/signups-monthly", signupsMonthlyRoute(db));
    app.use("/api/revenue-by-tier", revenueByTierRoute(db));
    app.use("/api/bookings-by-facility", bookingsByFacilityRoute(db));
    app.use("/api/weekly-cancellations", weeklyCancellationsRoute(db));

    app.listen(port, () => {
      console.log(`Backend running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

startServer();
