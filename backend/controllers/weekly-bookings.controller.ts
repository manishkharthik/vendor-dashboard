import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";

interface WeeklyRow {
  _id: { year: number; week: number };
  count: number;
}

export default class WeeklyBookingsController {
  constructor(private db: Db) {}

  // GET /api/weekly-bookings
  async weekly(req: Request, res: Response) {
    try {
      const users = this.db.collection("users");
      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      const vendorIdParam = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";
      let vendorObjId: ObjectId | null = null;
      try {
        vendorObjId = new ObjectId(vendorIdParam);
      } catch {
        // fallback to string matching
      }

      const pipeline: any[] = [
        // 1. Explode each user's bookings
        { $unwind: "$bookings" },

        // 2. Match by vendorId (ObjectId or string)
        {
          $match: {
            $or: [
              ...(vendorObjId ? [{ "bookings.serviceId": vendorObjId }] : []),
              { "bookings.serviceId": vendorIdParam }
            ]
          }
        },

        // 3. Only keep bookings with valid startTime within [start, end)
        {
          $match: {
            "bookings.startTime": { $ne: null, $gte: start, $lt: end }
          }
        },

        // 4. Group by ISO week/year
        {
          $project: {
            startTime: "$bookings.startTime",
            year: { $isoWeekYear: "$bookings.startTime" },
            week: { $isoWeek: "$bookings.startTime" }
          }
        },
        {
          $group: {
            _id: { year: "$year", week: "$week" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } }
      ];

      const rows = await users.aggregate<WeeklyRow>(pipeline).toArray();

      // Format labels in Node.js
      const formatted = rows.map(r => {
        const label = `Week ${r._id.week}, ${r._id.year}`;
        return { ...r, label };
      });

      return res.json({
        window: { start, end, tz },
        categories: formatted.map(r => r.label),
        series: [{ name: "Total Bookings", data: formatted.map(r => r.count) }]
      });
    } catch (err: any) {
      console.error("weekly-bookings (users) error:", err?.message ?? err);
      return res.status(500).json({ error: "Failed to fetch weekly bookings" });
    }
  }
}

