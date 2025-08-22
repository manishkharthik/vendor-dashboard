// return weekly sales data from table "member visits"
import { Router } from "express";
import { ObjectId } from "mongodb";

export default function weeklySalesRoute(db: any) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const visits = db.collection("member_visits"); 
      const { vendorId, from, to } = req.query as {
        vendorId?: string;
        from?: string;
        to?: string;
      };

      const end = to ? new Date(to) : new Date();
      const start = from
        ? new Date(from)
        : new Date(end.getTime() - 12 * 7 * 24 * 3600 * 1000);

      const rawVendor = (vendorId && vendorId.trim())
        ? vendorId.trim()
        : '67f773acc9504931fcc411ec';

      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res.status(400).json({ error: 'Invalid vendorId format (expected ObjectId)' });
      }

      const match = {
        vendorId: vendorObjId,                 
        visitDate: { $gte: start, $lt: end }, 
        $expr: { $eq: [{ $type: '$visitDate' }, 'date'] }
      };

      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: {
              weekStart: {
                $dateTrunc: {
                  date: "$visitDate",
                  unit: "week",
                  timezone: "Asia/Singapore"
                }
              }
            },
            totalSales: { $sum: { $ifNull: ["$amountSpent", 0] } }
          }
        },
        { $sort: { "_id.weekStart": 1 } },
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

      res.json({
        categories: rows.map((r: any) => r.label),
        series: [{ name: "Sales (SGD)", data: rows.map((r: any) => r.totalSales) }]
      });
    } catch (err) {
      console.error("weekly-sales error:", err);
      res.status(500).json({ error: "Failed to fetch weekly sales" });
    }
  });

  return router;
}
