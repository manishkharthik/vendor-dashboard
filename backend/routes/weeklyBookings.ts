// Count weekly bookings from users.bookings (no isActive filter)
import { Router } from "express";
import { ObjectId } from "mongodb";

type WeeklyRow = { label: string; count: number };

export default function weeklyBookingsRoute(db: any) {
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
      const rawVendor =
        (vendorId && vendorId.trim()) || "67f773acc9504931fcc411ec";

      let vendorObjId: ObjectId | null = null;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        /* keep null so we also match string ids */
      }

      // default to last 12 weeks if no range given
      const end = to ? new Date(to) : new Date();
      const start = from
        ? new Date(from)
        : new Date(end.getTime() - 12 * 7 * 24 * 3600 * 1000);

      const pipeline: any[] = [
        // explode each user's bookings
        { $unwind: "$bookings" },

        // serviceId == vendorId (support ObjectId and string)
        {
          $match: {
            $expr: {
              $or: [
                ...(vendorObjId ? [{ $eq: ["$bookings.serviceId", vendorObjId] }] : []),
                { $eq: ["$bookings.serviceId", rawVendor] },
                { $eq: [{ $toString: "$bookings.serviceId" }, rawVendor] }
              ]
            }
          }
        },

        // normalize startTime to a Date
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

        // require valid date within window
        { $match: { _dt: { $ne: null, $gte: start, $lt: end } } },

        // group by week (Singapore tz)
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
            bookings: { $sum: 1 }
          }
        },
        { $sort: { "_id.weekStart": 1 } },

        // format for chart
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
            count: "$bookings"
          }
        }
      ];

      const rows = (await users.aggregate(pipeline).toArray()) as WeeklyRow[];

      res.json({
        categories: rows.map((r: WeeklyRow) => r.label),
        series: [{ name: "Total Bookings", data: rows.map((r: WeeklyRow) => r.count) }]
      });
    } catch (err: any) {
      console.error("weekly-bookings (users) error:", err?.message ?? err);
      res.status(500).json({ error: "Failed to fetch weekly bookings" });
    }
  });

  return router;
}

