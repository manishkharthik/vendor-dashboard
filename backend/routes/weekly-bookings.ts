import * as express from "express";
import WeeklyBookingsController from "../controllers/weekly-bookings.controller";

export default function weeklyBookingsRoutes(ctrl: WeeklyBookingsController) {
  const router = express.Router();
  router.get("/api/weekly-bookings", ctrl.weekly.bind(ctrl));

  return router;
}
