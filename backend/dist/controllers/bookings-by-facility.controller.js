"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const schema_1 = require("../models/schema");
class FacilitiesController {
    constructor(db) {
        this.db = db;
    }
    // GET /api/bookings-by-facility?vendorId=<ObjectId>
    async bookingsByFacility(req, res) {
        try {
            const facilities = (0, schema_1.Facilities)(this.db);
            const { start, end, tz } = res.locals.window;
            const rawVendor = req.query.vendorId?.trim() || "67f773acc9504931fcc411ec";
            let vendorObjId;
            try {
                vendorObjId = new mongodb_1.ObjectId(rawVendor);
            }
            catch {
                return res.status(400).json({ error: "Invalid vendorId (expected ObjectId hex)" });
            }
            const pipeline = [
                // 1) All facilities for this vendor
                { $match: { vendorId: vendorObjId } },
                {
                    $project: {
                        facilityId: "$_id",
                        facilityIdStr: { $toString: "$_id" },
                        name: {
                            $trim: {
                                input: { $convert: { input: "$name", to: "string", onError: "", onNull: "" } }
                            }
                        }
                    }
                },
                { $match: { name: { $ne: "" } } },
                // 2) Count bookings in "users.bookings" referencing this facility, within [start, end)
                {
                    $lookup: {
                        from: "users",
                        let: { fid: "$facilityId", fidStr: "$facilityIdStr", start: start, end: end, tz: tz },
                        pipeline: [
                            { $project: { bookings: 1 } },
                            { $unwind: "$bookings" },
                            {
                                $addFields: {
                                    _dt: {
                                        $switch: {
                                            branches: [
                                                {
                                                    case: { $eq: [{ $type: "$bookings.startTime" }, "date"] },
                                                    then: "$bookings.startTime"
                                                },
                                                {
                                                    case: { $eq: [{ $type: "$bookings.startTime" }, "string"] },
                                                    then: {
                                                        $let: {
                                                            vars: { s: "$bookings.startTime" },
                                                            in: {
                                                                $cond: [
                                                                    { $regexMatch: { input: "$$s", regex: /[zZ]|[+\-]\d{2}:\d{2}$/ } },
                                                                    { $toDate: "$$s" },
                                                                    { $dateFromString: { dateString: "$$s", timezone: "$$tz" } } // naive → SGT
                                                                ]
                                                            }
                                                        }
                                                    }
                                                },
                                                {
                                                    case: { $in: [{ $type: "$bookings.startTime" }, ["int", "long", "decimal"]] },
                                                    then: { $toDate: "$bookings.startTime" }
                                                }
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
                                            { $lt: ["$_dt", "$$end"] }
                                        ]
                                    }
                                }
                            },
                            { $count: "cnt" }
                        ],
                        as: "bookingCounts"
                    }
                },
                { $addFields: { count: { $ifNull: [{ $arrayElemAt: ["$bookingCounts.cnt", 0] }, 0] } } },
                { $project: { _id: 0, facilityId: 1, name: 1, count: 1 } },
                { $sort: { count: -1, name: 1 } }
            ];
            const rows = await facilities.aggregate(pipeline).toArray();
            return res.json({
                window: { start, end, tz },
                categories: rows.map(r => r.name),
                series: [{ name: "Bookings (count)", data: rows.map(r => r.count) }],
                table: rows
            });
        }
        catch (err) {
            console.error("[facilities.bookingsByFacility] error:", err?.message ?? err);
            return res.status(500).json({ error: "Failed to fetch bookings by facility" });
        }
    }
}
exports.default = FacilitiesController;
