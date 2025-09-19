import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";

interface FacilityBookingRow {
  facilityId: ObjectId;
  name: string;
  count: number;
}

export default class FacilitiesController {
  constructor(private db: Db) {}

  // GET /api/bookings-by-facility?vendorId=<ObjectId>
  async bookingsByFacility(req: Request, res: Response) {
    try {
      const users = this.db.collection("users");
      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      const rawVendor = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";
      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res.status(400).json({ error: "Invalid vendorId (expected ObjectId hex)" });
      }

      const pipeline = [
        // 1) Explode bookings
        { $unwind: "$bookings" },

        // 2) Filter by vendor/serviceId and date range
        {
          $match: {
            "bookings.serviceId": vendorObjId,
            "bookings.startTime": { $gte: start, $lt: end },
            "bookings.isActive": true
          }
        },

        // 3) Group by facilityId + title/unitName
        {
          $group: {
            _id: {
              facilityId: "$bookings.facilityId",
              name: { $ifNull: ["$bookings.title", "$bookings.unitName"] }
            },
            count: { $sum: 1 }
          }
        },

        // 4) Clean up
        { $sort: { count: -1, "_id.name": 1 } },
        {
          $project: {
            _id: 0,
            facilityId: "$_id.facilityId",
            name: "$_id.name",
            count: 1
          }
        }
      ];

      const rows = await users.aggregate<FacilityBookingRow>(pipeline).toArray();

      return res.json({
        window: { start, end, tz },
        categories: rows.map(r => r.name?.trim() ?? "Unknown"),
        series: [{ name: "Bookings (count)", data: rows.map(r => r.count) }],
        table: rows
      });
    } catch (err: any) {
      console.error("[facilities.bookingsByFacility] error:", err?.message ?? err);
      return res.status(500).json({ error: "Failed to fetch bookings by facility" });
    }
  }
}
