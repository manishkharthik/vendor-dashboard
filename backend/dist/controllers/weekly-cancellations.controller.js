"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
class WeeklyCancellationsController {
    constructor(db) {
        this.db = db;
    }
    // GET /api/weekly-cancellations
    async weekly(req, res) {
        try {
            const users = this.db.collection("users");
            const { start, end, tz } = res.locals.window;
            const vendorIdParam = req.query.vendorId?.trim() || "67f773acc9504931fcc411ec";
            let vendorObjId = null;
            try {
                vendorObjId = new mongodb_1.ObjectId(vendorIdParam);
            }
            catch {
            }
            const pipeline = [
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
                                        { $eq: ["$bookings.serviceId", vendorIdParam] },
                                        { $eq: [{ $toString: "$bookings.serviceId" }, vendorIdParam] }
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
                                    startOfWeek: "Mon"
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
                        count: "$cancellations"
                    }
                }
            ];
            const rows = (await users.aggregate(pipeline).toArray());
            return res.json({
                window: { start, end, tz },
                categories: rows.map((r) => r.label),
                series: [{ name: "Cancellations", data: rows.map((r) => r.count) }]
            });
        }
        catch (err) {
            console.error("[weekly-cancellations] error:", err?.message ?? err, err?.stack ?? "");
            return res.status(500).json({ error: "Failed to fetch weekly cancellations" });
        }
    }
}
exports.default = WeeklyCancellationsController;
