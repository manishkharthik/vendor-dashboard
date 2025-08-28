import { Router } from "express";
import { ObjectId } from "mongodb";

export default function newVsReturningRoute(db: any) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const step = String(req.query.step || "");
      if (step !== "fr-monthly") 
        return res.status(400).json({ error: "Add ?step=fr-monthly" });

      const usersCol  = db.collection("users");
      const visitsCol = db.collection("member_visits");
      const vendorId = "67f773acc9504931fcc411ec";

      // 1) Get userIds (ensure visited >= 1)
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
        return res.json({ rows: [], categories: [], series: [
          { name: "First-time", data: [] },
          { name: "Returning",  data: [] }
        ]});
      }

      const tz = "Asia/Singapore";

      // 2) Member visits → label first vs returning PER MEMBER, then group by month
      const rows = await visitsCol.aggregate([
        { $match: { memberId: { $in: userIds }, vendorId: new ObjectId(vendorId) } },

        // Normalize
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

        // Month bucket (SG timezone)
        { $set: { month: { $dateTrunc: { date: "$_visit", unit: "month", timezone: tz } } } },

        // Monthly rollup: first vs returning
        {
          $group: {
            _id: "$month",
            firstTotal:     { $sum: { $cond: [{ $eq: ["$visitIndex", 1] }, "$_net", 0] } },
            returningTotal: { $sum: { $cond: [{ $gt: ["$visitIndex", 1] }, "$_net", 0] } },
            firstCount:     { $sum: { $cond: [{ $eq: ["$visitIndex", 1] }, 1, 0] } },
            returningCount: { $sum: { $cond: [{ $gt: ["$visitIndex", 1] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $project: {
            _id: 0,
            month: "$_id",
            firstTotal:     { $round: ["$firstTotal", 2] },
            returningTotal: { $round: ["$returningTotal", 2] },
            firstCount: 1,
            returningCount: 1
        }}
      ]).toArray();

      // 3) Optional chart-friendly shape
      const categories: string[] = [];
      const firstSeries: number[] = [];
      const returningSeries: number[] = [];
      for (const r of rows) {
        const d = new Date(r.month);
        categories.push(d.toLocaleString("en-SG", { month: "short", year: "numeric", timeZone: tz }));
        firstSeries.push(Number(r.firstTotal ?? 0));
        returningSeries.push(Number(r.returningTotal ?? 0));
      }

      return res.json({
        rows,                                   // [{ month, firstTotal, returningTotal, firstCount, returningCount }, ...]
        categories,                             // ["Jul 2025", ...]
        series: [
          { name: "First-time", data: firstSeries },
          { name: "Returning",  data: returningSeries }
        ]
      });
    } catch (e: any) {
      console.error("[new-vs-returning fr-monthly] error:", e?.message, e?.stack);
      return res.status(500).json({ error: e?.message || "Failed fr-monthly" });
    }
  });

  return router;
}
