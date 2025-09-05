import { Router } from "express";
import { ObjectId } from "mongodb";
import { count } from "node:console";

type CancelRow = { label: string; count: number };

export default function weeklyCancellationsRoute(db: any) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const users = db.collection("users");
      const { start, end, tz } = res.locals.window;

      const vendorIdParam = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";
      let vendorObjId: ObjectId | null = null;
      try {
        vendorObjId = new ObjectId(vendorIdParam);
      } catch {
        /* keep null so we also match string ids */
      }

      const pipeline: any[] = [
        // 1) Explode each user's bookings
        { $unwind: "$bookings" },

        // 2) Match only bookings for the vendor and that are cancelled
        {
          $match: {
            $and: [
              {
                $expr: {
                  $or: [
                    ...(vendorObjId ? [{ $eq: ["$bookings.serviceId", vendorObjId] }] : []),
                    { $eq: ["$bookings.serviceId", vendorIdParam] },
                    { $eq: [ { $toString: "$bookings.serviceId" }, vendorIdParam ] }
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
                  timezone: "Asia/Singapore",
                  startOfWeek: "Mon",
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
            label: {
              $dateToString: {
                date: "$_id.weekStart",
                format: "Week of %d %b %Y",
                timezone: "Asia/Singapore"
              }
            },
            count: "$cancellations",
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