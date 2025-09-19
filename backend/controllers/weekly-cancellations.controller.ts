import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";

type CancelRow = { label: string; count: number };

export default class WeeklyCancellationsController {
  constructor(private db: Db) {}

  // GET /api/weekly-cancellations
  async weekly(req: Request, res: Response) {
    try {
      const users = this.db.collection("users");
      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      const vendorIdParam =
        (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";

      let vendorObjId: ObjectId | null = null;
      try {
        vendorObjId = new ObjectId(vendorIdParam);
      } catch {
        // fall back to string
      }

      const pipeline: any[] = [
        // 1) Explode each user's bookings
        { $unwind: "$bookings" },

        // 2) Match serviceId to vendor + inactive
        {
          $match: {
            $and: [
              {
                $or: [
                  ...(vendorObjId ? [{ "bookings.serviceId": vendorObjId }] : []),
                  { "bookings.serviceId": vendorIdParam }
                ]
              },
              { "bookings.isActive": false }
            ]
          }
        },

        // 3) Keep only bookings with valid Date in [start, end)
        {
          $match: {
            "bookings.startTime": { $ne: null, $gte: start, $lt: end }
          }
        },

        // 4) Group by ISO week/year
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

      const rows = await users.aggregate<CancelRow & { _id: { year: number; week: number } }>(pipeline).toArray();

      // Format labels in Node.js
      const formatted: CancelRow[] = rows.map(r => ({
        label: `Week ${r._id.week}, ${r._id.year}`,
        count: r.count
      }));

      return res.json({
        window: { start, end, tz },
        categories: formatted.map(r => r.label),
        series: [{ name: "Cancellations", data: formatted.map(r => r.count) }]
      });
    } catch (err: any) {
      console.error("[weekly-cancellations] error:", err?.message ?? err, err?.stack ?? "");
      return res.status(500).json({ error: "Failed to fetch weekly cancellations" });
    }
  }
}
