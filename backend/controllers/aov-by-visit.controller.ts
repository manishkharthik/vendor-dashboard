import { Request, Response } from "express";
import { Db, ObjectId } from "mongodb";

export default class AovByVisitController {
  constructor(private db: Db) {}

  async aovByActual(req: Request, res: Response) {
    try {
      const step = (req.query.step as string) || "";
      if (step !== "by-actual") {
        return res.status(400).json({
          error: "Add ?step=by-actual to compute AOV by actual visits within the time window."
        });
      }

      const vendorId = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";
      const vendorObjId = new ObjectId(vendorId);

      const { start, end } = res.locals.window;

      const rows = await this.db.collection("users").aggregate([
        // 1) explode vendor tiers
        { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },
        { $match: { "userLoyaltyTier.vendorId": vendorId } },

        // 2) lookup member_visits by memberId (basic form only)
        {
          $lookup: {
            from: "member_visits",
            localField: "_id",        // user._id
            foreignField: "memberId", // visits.memberId
            as: "visits"
          }
        },

        // 3) flatten visits
        { $unwind: { path: "$visits", preserveNullAndEmptyArrays: true } },

        // 4) filter visits by time window
        { $match: { "visits.visitDate": { $gte: start, $lt: end } } },

        // 5) compute net spend and count visits
        {
          $addFields: {
            _spent: { $ifNull: ["$visits.amountSpent", 0] },
            _saved: { $ifNull: ["$visits.amountSaved", 0] }
          }
        },
        {
          $addFields: {
            _net: { $subtract: ["$_spent", "$_saved"] }
          }
        },

        // 6) group back per user
        {
          $group: {
            _id: "$_id",
            netSpend: { $sum: "$_net" },
            actualVisits: { $sum: { $cond: [{ $ifNull: ["$visits._id", false] }, 1, 0] } }
          }
        },

        // 7) compute user-level AOV
        {
          $addFields: {
            aov: {
              $cond: [
                { $gt: ["$actualVisits", 0] },
                { $divide: ["$netSpend", "$actualVisits"] },
                null
              ]
            }
          }
        },

        // 8) regroup globally by visit counts
        {
          $group: {
            _id: "$actualVisits",
            users: { $sum: 1 },
            meanAOV: { $avg: "$aov" },
            sumNet: { $sum: "$netSpend" },
            sumVisits: { $sum: "$actualVisits" }
          }
        },

        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            actualVisits: "$_id",
            users: 1,
            meanAOV: 1,
            weightedAOV: {
              $cond: [
                { $gt: ["$sumVisits", 0] },
                { $divide: ["$sumNet", "$sumVisits"] },
                null
              ]
            },
            sumNet: 1,
            sumVisits: 1
          }
        }
      ]).toArray();

      // round in Node.js
      rows.forEach(r => {
        if (r.meanAOV != null) r.meanAOV = Number(r.meanAOV.toFixed(2));
        if (r.weightedAOV != null) r.weightedAOV = Number(r.weightedAOV.toFixed(2));
        if (r.sumNet != null) r.sumNet = Number(r.sumNet.toFixed(2));
      });

      return res.json({ window: res.locals.window, rows });
    } catch (err: any) {
      console.error("[aov-by-visit] error:", err?.message ?? err, err?.stack ?? "");
      return res.status(500).json({ error: "Failed in aov-by-visit controller" });
    }
  }
}

