import * as express from "express";
import SignupsMonthlyController from "../controllers/signups-monthly.controller";

export default function signupsMonthlyRoutes(ctrl: SignupsMonthlyController) {
  const router = express.Router();
  router.get("/api/signups-monthly", ctrl.monthly.bind(ctrl));

  return router;
}
