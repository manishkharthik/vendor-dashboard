import * as express from "express";
import WeeklySalesController from "../controllers/weekly-sales.controller";

export default function weeklySalesRoutes(ctrl: WeeklySalesController) {
  const router = express.Router();
  router.get("/api/weekly-sales", ctrl.weekly.bind(ctrl));

  return router;
}
