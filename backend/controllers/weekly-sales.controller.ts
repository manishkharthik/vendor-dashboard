import { Db, ObjectId } from "mongodb";

export default class WeeklySalesController {
  constructor(private db: Db) {}

  // GET /api/weekly-sales
  async weekly(req, res) {
    try {
      const visits = this.db.collection("member_visits");
      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      const rawVendor = (req.query.vendorId as string)?.trim() ?? "67f773acc9504931fcc411ec";

      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res
          .status(400)
          .json({ error: "Invalid vendorId format (expected ObjectId)" });
      }

      const match = {
        vendorId: vendorObjId,
        visitDate: { $gte: start, $lt: end },
        $expr: { $eq: [{ $type: "$visitDate" }, "date"] }
      };

      const pipeline = [
        // 1) Filter by vendorId and date range
        { $match: match },

        // 2) Group by week and sum amountSpent
        {
          $group: {
            _id: {
              weekStart: {
                $dateTrunc: {
                  date: "$visitDate",
                  unit: "week",
                  timezone: tz,
                  startOfWeek: "Mon"
                }
              }
            },
            totalSales: { $sum: { $ifNull: ["$amountSpent", 0] } }
          }
        },

        // 3) Sort by weekStart
        { $sort: { "_id.weekStart": 1 } },

        // 4) Shape output
        {
          $project: {
            _id: 0,
            weekStart: "$_id.weekStart",
            totalSales: 1,
            label: {
              $dateToString: {
                date: "$_id.weekStart",
                format: "Week of %d %b %Y",
                timezone: "Asia/Singapore"
              }
            }
          }
        }
      ];

      const rows = await visits.aggregate(pipeline).toArray();

      return res.json({
        categories: rows.map((r: any) => r.label),
        series: [{ name: "Sales (SGD)", data: rows.map((r: any) => r.totalSales) }]
      });
    } catch (err: any) {
      console.error("weekly-sales error:", err?.message ?? err);
      return res.status(500).json({ error: "Failed to fetch weekly sales" });
    }
  }
}
