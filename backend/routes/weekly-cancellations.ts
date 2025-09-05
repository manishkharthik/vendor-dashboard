import * as express from "express";
import WeeklyCancellationsController from "../controllers/weekly-cancellations.controller";

export default function weeklyCancellationsRoutes(ctrl: WeeklyCancellationsController) {
  const router = express.Router();
  router.get("/api/weekly-cancellations", ctrl.weekly.bind(ctrl));
  
  return router;
}
