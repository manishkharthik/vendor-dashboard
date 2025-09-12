import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";
import { MemberVisits } from "../models/schema";

export default class RevenueByTierController {
  constructor(private db: Db) {}

  // GET /api/revenue-by-tier?vendorId=<ObjectId>
  async byTier(req: Request, res: Response) {
    try {
      const visits = MemberVisits(this.db);
      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      const rawVendor = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";
      let vendorObjId: ObjectId;
      try { vendorObjId = new ObjectId(rawVendor); }
      catch { return res.status(400).json({ error: "Invalid vendorId (expected ObjectId hex)" }); }

      const pipeline = [
        // 1. filter by vendor
        { $match: { vendorId: vendorObjId } },

        // 2. normalize fields
        { $set: {
            _visit: { $convert: { input: "$visitDate", to: "date", onError: null, onNull: null } },
            _spent: { $toDouble: { $ifNull: ["$amountSpent", 0] } },
            _saved: { $toDouble: { $ifNull: ["$amountSaved", 0] } },
            _tier: {
              $trim: {
                input: { $convert: { input: "$tier.displayName", to: "string", onError: "Unknown", onNull: "Unknown" } }
              }
            }
        }},

        // 3. filter by date range
        { $match: { _visit: { $ne: null, $gte: start, $lt: end } } },

        // 4. group by tier
        {
          $group: {
            _id: "$_tier",
            totalRevenueGross: { $sum: "$_spent" },
            totalRevenueNet:   { $sum: { $subtract: ["$_spent", "$_saved"] } }
          }
        },
        { $sort: { totalRevenueGross: -1, _id: 1 } },
        {
          $project: {
            _id: 0,
            tier: "$_id",
            totalRevenueGross: { $round: ["$totalRevenueGross", 0] },
            totalRevenueNet:   { $round: ["$totalRevenueNet", 0] }
          }
        }
      ];

      const rows = await visits.aggregate(pipeline).toArray();

      return res.json({
        window: { start, end, tz },
        categories: rows.map(r => r.tier),
        series: [{ name: "Revenue (SGD)", data: rows.map(r => r.totalRevenueGross) }],
        table: rows
      });
    } catch (err: any) {
      console.error("[revenue.byTier] error:", err?.message ?? err);
      return res.status(500).json({ error: "Failed to fetch revenue by tier" });
    }
  }
}
