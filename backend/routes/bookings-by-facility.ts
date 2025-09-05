// Returns count of bookings per facility for a given vendor in a given time window
import { Router } from "express";
import { ObjectId } from "mongodb";

type FacilityCountRow = { name: string; count: number };

export default function bookingsByFacilityRoute(db: any) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const facilities = db.collection("facilities");
      const { start, end, tz } = res.locals.window;    

      const { vendorId } = req.query as { vendorId?: string };
      const rawVendor = (vendorId && vendorId.trim())
        ? vendorId.trim()
        : "67f773acc9504931fcc411ec";

      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res.status(400).json({ error: "Invalid vendorId (expected ObjectId hex)" });
      }

      // 1) All facilities for this vendor
      const match = { vendorId: vendorObjId };

      const pipeline = [
        { $match: match },
        {
          $project: {
            facilityId: "$_id",
            facilityIdStr: { $toString: "$_id" },
            name: {
              $trim: {
                input: {
                  $convert: { input: "$name", to: "string", onError: "", onNull: "" }
                }
              }
            }
          }
        },
        { $match: { name: { $ne: "" } } },


        // 2) Count bookings in users that reference this facility and fall in [start,end)
        {
          $lookup: {
            from: "users",
            let: {
              fid: "$facilityId",
              fidStr: "$facilityIdStr",
              start: start,  
              end: end,
              tz: tz
            },
            pipeline: [
              { $project: { bookings: 1 } },
              { $unwind: "$bookings" },

              {
                $addFields: {
                  _dt: {
                    $switch: {
                      branches: [
                        { case: { $eq: [{ $type: "$bookings.startTime" }, "date"] },
                          then: "$bookings.startTime" },
                        { case: { $eq: [{ $type: "$bookings.startTime" }, "string"] },
                          then: {
                            $let: { vars: { s: "$bookings.startTime" },
                              in: {
                                $cond: [
                                  { $regexMatch: { input: "$$s", regex: /[zZ]|[+\-]\d{2}:\d{2}$/ } },
                                  { $toDate: "$$s" },
                                  { $dateFromString: { dateString: "$$s", timezone: "$$tz" } }
                                ]
                              }
                            }
                          } },
                        { case: { $in: [{ $type: "$bookings.startTime" }, ["int","long","decimal"]] },
                          then: { $toDate: "$bookings.startTime" } }
                      ],
                      default: null
                    }
                  }
                }
              },

              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $or: [
                          { $eq: ["$bookings.facilityId", "$$fid"] },
                          { $eq: [{ $toString: "$bookings.facilityId" }, "$$fidStr"] }
                        ]
                      },
                      { $ne: ["$_dt", null] },
                      { $gte: ["$_dt", "$$start"] },
                      { $lt:  ["$_dt", "$$end"] }
                    ]
                  }
                }
              },
              { $count: "cnt" }
            ],
            as: "bookingCounts"
          }
        },

        {
          $addFields: {
            count: { $ifNull: [{ $arrayElemAt: ["$bookingCounts.cnt", 0] }, 0] }
          }
        },
        { $project: { _id: 0, facilityId: 1, name: 1, count: 1 } },
        { $sort: { count: -1, name: 1 } }
      ];

      const rows = (await facilities.aggregate(pipeline).toArray()) as FacilityCountRow[];

      res.json({
        window: { start, end, tz },
        categories: rows.map((r) => r.name),
        series: [{ name: "Bookings (count)", data: rows.map((r) => r.count) }],
        table: rows
      });
    } catch (err: any) {
      console.error("bookings-by-facility error:", err?.message ?? err);
      res.status(500).json({ error: "Failed to fetch bookings by facility" });
    }
  });

  return router;
}
