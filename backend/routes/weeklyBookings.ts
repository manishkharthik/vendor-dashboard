// Count weekly bookings from users.bookings (no isActive filter)
import { Router } from "express";
import { ObjectId } from "mongodb";

type WeeklyRow = { label: string; count: number };

export default function weeklyBookingsRoute(db: any) {
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
        // explode each user's bookings
        { $unwind: "$bookings" },

        // serviceId == vendorId (support ObjectId and string)
        {
          $match: {
            $expr: {
              $or: [
                ...(vendorObjId ? [{ $eq: ["$bookings.serviceId", vendorObjId] }] : []),
                { $eq: ["$bookings.serviceId", vendorIdParam] },
                { $eq: [{ $toString: "$bookings.serviceId" }, vendorIdParam] }
              ]
            }
          }
        },

        // replace your $addFields with this more robust version
        {
          $addFields: {
            _dt: {
              $switch: {
                branches: [
                  { // already a BSON Date
                    case: { $eq: [{ $type: "$bookings.startTime" }, "date"] },
                    then: "$bookings.startTime"
                  },
                  { // ISO string (assume local SGT if no offset in string)
                    case: { $eq: [{ $type: "$bookings.startTime" }, "string"] },
                    then: {
                      $let: {
                        vars: { s: "$bookings.startTime" },
                        in: {
                          $cond: [
                            // if string already has a timezone (+/- or Z), let Mongo parse it
                            { $regexMatch: { input: "$$s", regex: /[zZ]|[+\-]\d{2}:\d{2}$/ } },
                            { $toDate: "$$s" },
                            // otherwise assume Asia/Singapore
                            { $dateFromString: { dateString: "$$s", timezone: tz } }
                          ]
                        }
                      }
                    }
                  },
                  { // numeric epoch (ms)
                    case: { $in: [{ $type: "$bookings.startTime" }, ["int", "long", "decimal"] ] },
                    then: { $toDate: "$bookings.startTime" }
                  }
                ],
                default: null
              }
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
                  timezone: "Asia/Singapore",
                  startOfWeek: "Mon",
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
        window: { start, end, tz },
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