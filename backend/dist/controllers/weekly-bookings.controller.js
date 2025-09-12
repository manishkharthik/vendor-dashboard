"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
class WeeklyBookingsController {
    constructor(db) {
        this.db = db;
    }
    // GET /api/weekly-bookings
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
                // 1. Explode each user's bookings
                { $unwind: "$bookings" },
                // 2. Match serviceId to vendorId 
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
                // 3. Normalize startTime to a BSON Date in _dt
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
                                                        { $dateFromString: { dateString: "$$s", timezone: tz } }
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
                // 4. Match to the date range
                { $match: { _dt: { $ne: null, $gte: start, $lt: end } } },
                // 5. Group by week 
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
                // 6. Format the output
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
            const rows = await users.aggregate(pipeline).toArray();
            return res.json({
                window: { start, end, tz },
                categories: rows.map(r => r.label),
                series: [{ name: "Total Bookings", data: rows.map(r => r.count) }]
            });
        }
        catch (err) {
            console.error("weekly-bookings (users) error:", err?.message ?? err);
            return res.status(500).json({ error: "Failed to fetch weekly bookings" });
        }
    }
}
exports.default = WeeklyBookingsController;
