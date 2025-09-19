import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";

interface SignupRow {
  _id?: { year: number; week: number };
  weekStart: Date;
  label: string;
  total: number;
}

export default class SignupsMonthlyController {
  constructor(private db: Db) {}

  // GET /api/signups-monthly
  async monthly(req: Request, res: Response) {
    try {
      const users = this.db.collection("users");

      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      const vendorIdParam = (req.query.vendorId as string)?.trim() ?? "67f773acc9504931fcc411ec";

      const pipeline = [
        // 1) Unwind tiers so we can vendor-filter
        { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },

        // 2) Vendor filter (string fallback)
        { $match: { "userLoyaltyTier.vendorId": vendorIdParam } },

        // 3) Use createdAt if exists, else fallback to _id timestamp
        {
          $project: {
            signupDate: {
              $cond: [
                { $ifNull: ["$createdAt", false] },
                "$createdAt",
                "$_id"
              ]
            }
          }
        },

        // 4) Restrict by reporting window
        { $match: { signupDate: { $gte: start, $lt: end } } },

        // 5) Derive week/year (works in 3.6)
        {
          $project: {
            signupDate: 1,
            year: { $isoWeekYear: "$signupDate" },
            week: { $isoWeek: "$signupDate" }
          }
        },

        // 6) Group per week
        {
          $group: {
            _id: { year: "$year", week: "$week" },
            weekStart: { $min: "$signupDate" },
            total: { $sum: 1 }
          }
        },

        { $sort: { "_id.year": 1, "_id.week": 1 } }
      ];

      const rows = await users.aggregate<SignupRow>(pipeline).toArray();

      // Add labels for charting
      rows.forEach(r => {
        const year = r._id?.year ?? new Date(r.weekStart).getUTCFullYear();
        const week = r._id?.week ?? 0;
        r.label = `Week ${week}, ${year}`;
      });

      return res.json({
        window: { start, end, tz },
        categories: rows.map(r => r.label),
        series: [{ name: "Sign-ups", data: rows.map(r => r.total) }]
      });
    } catch (err: any) {
      console.error("signups-monthly error:", err?.message ?? err, err?.stack ?? "");
      return res.status(500).json({ error: "Failed to fetch signups by month" });
    }
  }
}