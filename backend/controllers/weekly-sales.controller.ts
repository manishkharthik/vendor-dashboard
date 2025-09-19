import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";

export default class WeeklySalesController {
  constructor(private db: Db) {}

  // GET /api/weekly-sales
  async weekly(req: Request, res: Response) {
    try {
      const visits = this.db.collection("member_visits");
      const { start, end, tz } = res.locals.window as {
        start: Date;
        end: Date;
        tz: string;
      };

      const rawVendor = (req.query.vendorId as string)?.trim() ?? "67f773acc9504931fcc411ec";

      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res
          .status(400)
          .json({ error: "Invalid vendorId format (expected ObjectId)" });
      }

      const pipeline = [
        // 1. filter
        {
          $match: {
            vendorId: vendorObjId,
            visitDate: { $gte: start, $lt: end }
          }
        },

        // 2. project fields
        {
          $project: {
            amountSpent: { $ifNull: ["$amountSpent", 0] },
            visitDate: 1,
            year: { $isoWeekYear: "$visitDate" },
            week: { $isoWeek: "$visitDate" }
          }
        },

        // 3. group by iso year/week
        {
          $group: {
            _id: { year: "$year", week: "$week" },
            weekStart: { $min: "$visitDate" },
            totalSales: { $sum: "$amountSpent" }
          }
        },

        { $sort: { "_id.year": 1, "_id.week": 1 } }
      ];

      const rows = await visits.aggregate(pipeline).toArray();

      // 4. build labels in Node.js
      const formatted = rows.map(r => {
        const year = r._id.year;
        const week = r._id.week;
        const date = new Date(r.weekStart);
        return {
          ...r,
          label: `Week ${week}, ${year}`,
          weekStart: date,
          totalSales: Number(r.totalSales.toFixed(2))
        };
      });

      return res.json({
        window: { start, end, tz },
        categories: formatted.map(r => r.label),
        series: [{ name: "Sales (SGD)", data: formatted.map(r => r.totalSales) }],
        table: formatted
      });
    } catch (err: any) {
      console.error("weekly-sales error:", err?.message ?? err);
      return res.status(500).json({ error: "Failed to fetch weekly sales" });
    }
  }
}
