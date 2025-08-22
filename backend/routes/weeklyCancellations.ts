import { Router } from "express";
import { ObjectId } from "mongodb";

type CancelRow = { label: string; count: number };

export default function weeklyCancellationsRoute(db: any) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const users = db.collection("users");
      const { vendorId, from, to } = req.query as {
        vendorId?: string;
        from?: string;
        to?: string;
      };

      // Treat vendorId as the serviceId we match in users.bookings.serviceId
      const rawVendor = (vendorId && vendorId.trim())
        ? vendorId.trim()
        : "67f773acc9504931fcc411ec";

      let vendorObjId: ObjectId | null = null;
      try { vendorObjId = new ObjectId(rawVendor); } catch { /* keep null */ }

      // Optional window: default last 12 weeks, like your other routes
      const end = to ? new Date(to) : new Date();
      const start = from
        ? new Date(from)
        : new Date(end.getTime() - 12 * 7 * 24 * 3600 * 1000);

      const pipeline: any[] = [
        // 1) Explode each user's bookings
        { $unwind: "$bookings" },

        // 2) serviceId == vendorId (support ObjectId or string) AND inactive bookings
        {
          $match: {
            $and: [
              {
                $expr: {
                  $or: [
                    ...(vendorObjId ? [{ $eq: ["$bookings.serviceId", vendorObjId] }] : []),
                    { $eq: ["$bookings.serviceId", rawVendor] },
                    { $eq: [ { $toString: "$bookings.serviceId" }, rawVendor ] }
                  ]
                }
              },
              { "bookings.isActive": false }
            ]
          }
        },

        // 3) Normalize startTime to a real Date -> _dt
        {
          $addFields: {
            _dt: {
              $cond: [
                { $eq: [{ $type: "$bookings.startTime" }, "date"] },
                "$bookings.startTime",
                {
                  $convert: {
                    input: "$bookings.startTime",
                    to: "date",
                    onError: null,
                    onNull: null
                  }
                }
              ]
            }
          }
        },

        // 4) Keep only bookings with a valid date, inside the window
        { $match: { _dt: { $ne: null, $gte: start, $lt: end } } },

        // 5) Group by week
        {
          $group: {
            _id: {
              weekStart: {
                $dateTrunc: {
                  date: "$_dt",
                  unit: "week",
                  timezone: "Asia/Singapore"
                }
              }
            },
            cancellations: { $sum: 1 }
          }
        },
        { $sort: { "_id.weekStart": 1 } },

        // 6) Shape for charts
        {
          $project: {
            _id: 0,
            weekStart: "$_id.weekStart",
            count: "$cancellations",
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

      const rows = (await users.aggregate(pipeline).toArray()) as CancelRow[];

      res.json({
        categories: rows.map((r: CancelRow) => r.label),
        series: [{ name: "Cancellations", data: rows.map((r: CancelRow) => r.count) }]
      });
    } catch (err: any) {
      console.error("weekly-cancellations error:", err);
      res.status(500).json({ error: "Failed to fetch weekly cancellations" });
    }
  });

  return router;
}
