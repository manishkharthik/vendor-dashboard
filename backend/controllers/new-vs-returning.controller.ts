import { Db, ObjectId } from "mongodb";
import { Users, MemberVisits } from "../models/schema";

export default class NewVsReturningVisitsController {
  constructor(private db: Db) {}

  // GET /api/new-vs-returning?step=fr-weekly
  async newVsReturningWeekly(req, res) {
    try {
      const step = String(req.query.step || "");
      if (step !== "fr-weekly") {
        return res.status(400).json({ error: "Add ?step=fr-weekly" });
      }

      const usersCol  = Users(this.db);
      const visitsCol = MemberVisits(this.db);

      const vendorId = "67f773acc9504931fcc411ec"; 
      const vendorObj = new ObjectId(vendorId);   

      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      // 1) userIds for this vendor, with totalVisits >= 1 (latest tier per user)
      const idsDoc = await usersCol.aggregate([
        { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },
        { $match: { "userLoyaltyTier.vendorId": vendorId } },
        { $set: {
            _mdj: { $convert: { input: "$userLoyaltyTier.memberDateJoined", to: "date", onError: null, onNull: null } },
            _tv:  "$userLoyaltyTier.totalVisits"
        }},
        { $sort: { _id: 1, _mdj: -1 } },
        { $group: { _id: "$_id", tvLatest: { $first: "$_tv" } } },
        { $set: {
            totalVisits: {
              $convert: { input: { $trim: { input: { $toString: "$tvLatest" } } }, to: "int", onError: null, onNull: null }
            }
        }},
        { $match: { totalVisits: { $gte: 1 } } },
        { $group: { _id: null, userIds: { $addToSet: "$_id" } } },
        { $project: { _id: 0, userIds: 1 } }
      ]).next();

      const userIds: ObjectId[] = idsDoc?.userIds ?? [];
      if (!userIds.length) {
        return res.json({
          window: { start, end, tz },
          rows: [],
          categories: [],
          series: [
            { name: "First-time", data: [] },
            { name: "Returning",  data: [] }
          ]
        });
      }

      // 2) visits for those users & vendor → label first vs returning per member → group by week
      const rows = await visitsCol.aggregate([
        { $match: { memberId: { $in: userIds }, vendorId: vendorObj } },

        { $set: {
            _visit: { $convert: { input: "$visitDate", to: "date", onError: null, onNull: null } },
            _spent: { $toDouble: { $ifNull: ["$amountSpent", 0] } },
            _saved: { $toDouble: { $ifNull: ["$amountSaved", 0] } }
        }},
        { $match: { _visit: { $ne: null } } },
        { $set: { _net: { $subtract: ["$_spent", "$_saved"] } } },

        { $set: {
            _sortKey: {
              $concat: [
                { $toString: { $toLong: "$_visit" } }, "-",
                { $toString: "$_id" }
              ]
            }
        }},
        {
          $setWindowFields: {
            partitionBy: "$memberId",
            sortBy: { _sortKey: 1 },            
            output: { visitIndex: { $documentNumber: {} } }
          }
        },

        { $match: { _visit: { $gte: start, $lt: end } } },

        { $set: {
            weekStart: {
              $dateTrunc: { date: "$_visit", unit: "week", timezone: tz, startOfWeek: "monday" }
            }
        }},

        {
          $group: {
            _id: "$weekStart",
            firstCount:     { $sum: { $cond: [{ $eq: ["$visitIndex", 1] }, 1, 0] } },
            returningCount: { $sum: { $cond: [{ $gt: ["$visitIndex", 1] }, 1, 0] } },
            firstTotal:     { $sum: { $cond: [{ $eq: ["$visitIndex", 1] }, "$_net", 0] } },
            returningTotal: { $sum: { $cond: [{ $gt: ["$visitIndex", 1] }, "$_net", 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $project: {
            _id: 0,
            weekStart: 1,
            label: { $dateToString: { date: "$_id", format: "Week of %d %b %Y", timezone: tz } },
            firstTotal:     { $round: ["$firstTotal", 2] },
            returningTotal: { $round: ["$returningTotal", 2] },
            firstCount: 1,
            returningCount: 1
        }}
      ]).toArray();

      // 3. Chart shape
      const categories = rows.map(r => r.label);
      const firstSeries = rows.map(r => Number(r.firstCount || 0));
      const returningSeries = rows.map(r => Number(r.returningCount || 0));

      return res.json({
        window: { start, end, tz },
        rows,
        categories,
        series: [
          { name: "First-time", data: firstSeries },
          { name: "Returning",  data: returningSeries }
        ]
      });
    } catch (e: any) {
      console.error("[new-vs-returning fr-weekly] error:", e?.message, e?.stack);
      return res.status(500).json({ error: e?.message || "Failed fr-weekly" });
    }
  }
}
