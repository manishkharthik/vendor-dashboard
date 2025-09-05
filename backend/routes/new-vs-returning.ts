import * as express from "express";
import newVsReturningVisitsController from "../controllers/new-vs-returning.controller";

export default function newVsReturningVisitsRoutes(ctrl: newVsReturningVisitsController) {
  const router = express.Router();
  router.get("/api/new-vs-returning", ctrl.newVsReturningWeekly.bind(ctrl));

  return router;
}
