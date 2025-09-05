import * as express from "express";
import FacilitiesController from "../controllers/bookings-by-facility.controller";

export default function facilitiesRoutes(ctrl: FacilitiesController) {
  const router = express.Router();
  router.get("/api/bookings-by-facility", ctrl.bookingsByFacility.bind(ctrl));

  return router;
}
