import { Router } from "express";
import { ObjectId } from "mongodb";

type FacilityCountRow = { name: string; count: number };

export default function bookingsByFacilityRoute(db: any) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const facilities = db.collection('facilities');
      const { vendorId } = req.query as { vendorId?: string };

      const rawVendor = (vendorId && vendorId.trim())
        ? vendorId.trim()
        : '67f773acc9504931fcc411ec';

      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res.status(400).json({ error: 'Invalid vendorId (expected ObjectId hex)' });
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
        // 2) Count bookings in users that reference this facility
        {
          $lookup: {
            from: "users",
            let: { fid: "$facilityId", fidStr: "$facilityIdStr" },
            pipeline: [
              { $project: { bookings: 1 } },
              { $unwind: "$bookings" },
              {
                $match: {
                  $expr: {
                    $or: [ { $eq: ["$bookings.facilityId", "$$fid"] }, ]
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
            count: {
              $ifNull: [ { $arrayElemAt: ["$bookingCounts.cnt", 0] }, 0 ]
            }
          }
        },
        { $project: { _id: 0, facilityId: 1, name: 1, count: 1 } },
        { $sort: { count: -1, name: 1 } }
      ];
      const rows = (await facilities.aggregate(pipeline).toArray()) as FacilityCountRow[];

      res.json({
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
