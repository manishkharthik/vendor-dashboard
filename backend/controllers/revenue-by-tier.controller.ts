import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";
import { MemberVisits } from "../models/schema";

interface RevenueRow {
  tier: string;
  totalRevenueGross: number;
  totalRevenueNet: number;
}

export default class RevenueByTierController {
  constructor(private db: Db) {}

  // GET /api/revenue-by-tier?vendorId=<ObjectId>
  async byTier(req: Request, res: Response) {
    try {
      const visits = MemberVisits(this.db);
      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      const rawVendor = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";
      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res.status(400).json({ error: "Invalid vendorId (expected ObjectId hex)" });
      }

      const pipeline = [
        // 1. filter by vendor
        { $match: { vendorId: vendorObjId } },

        // 2. normalize fields (no $convert/$trim in 3.6)
        {
          $project: {
            visitDate: 1,
            spent: { $ifNull: ["$amountSpent", 0] },
            saved: { $ifNull: ["$amountSaved", 0] },
            tier: {
              $cond: [
                { $ifNull: ["$tier.displayName", false] },
                "$tier.displayName",
                "Unknown"
              ]
            }
          }
        },

        // 3. filter by date range
        { $match: { visitDate: { $gte: start, $lt: end } } },

        // 4. group by tier
        {
          $group: {
            _id: "$tier",
            totalRevenueGross: { $sum: "$spent" },
            totalRevenueNet: { $sum: { $subtract: ["$spent", "$saved"] } }
          }
        },
        { $sort: { totalRevenueGross: -1, _id: 1 } }
      ];

      const rows = await visits.aggregate<RevenueRow>(pipeline).toArray();

      // Round in Node.js since $round isn’t in 3.6
      rows.forEach(r => {
        r.totalRevenueGross = Math.round(r.totalRevenueGross);
        r.totalRevenueNet = Math.round(r.totalRevenueNet);
      });

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
