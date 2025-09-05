import * as express from "express";
import RevenueController from "../controllers/revenue-by-tier.controller";

export default function revenueByTierRoutes(ctrl: RevenueController) {
  const router = express.Router();
  router.get("/api/revenue-by-tier", ctrl.byTier.bind(ctrl));

  return router;
}
