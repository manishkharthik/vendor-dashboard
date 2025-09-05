import * as express from "express";
import AovByVisitController from "../controllers/aov-by-visit.controller";

export default function aovByVisitRoutes(ctrl: AovByVisitController) {
  const router = express.Router();
  router.get("/api/aov-by-visit", ctrl.aovByActual.bind(ctrl));
  
  return router;
}

