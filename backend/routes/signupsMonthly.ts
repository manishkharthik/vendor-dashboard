// returns monthly signups data from table "users"
import { Router } from "express";
import { ObjectId } from "mongodb";

export default function signupsMonthlyRoute(db: any) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const users = db.collection('users');

      const { start, end, tz } = res.locals.window;

      // vendorId handling (accepts string or ObjectId in DB)
      const vendorIdParam = (req.query.vendorId as string)?.trim() ?? "67f773acc9504931fcc411ec";
      let vendorObjId: ObjectId | null = null;
      try { 
        vendorObjId = new ObjectId(vendorIdParam); 
      } catch {
        // leave as empty
      }

      const pipeline = [
        // 0) explode the array so each tier entry is its own doc
        { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },
        // 1) vendor filter (string)
        { $match: { "userLoyaltyTier.vendorId": vendorIdParam } },
        // 2) convert string -> Date (robust)
        { $set: {
            _mdj: {
              $convert: { 
                input: "$userLoyaltyTier.memberDateJoined", 
                to: "date", 
                onError: null, onNull: null 
              }
            }
          }
        },
        // 3) window on the converted date
        { $match: { _mdj: { $ne: null, $gte: start, $lt: end } } },
        // 4) Weekly buckets (Mon–Sun) in the same timezone
        {
          $group: {
            _id: {
              weekStart: {
                $dateTrunc: { date: "$_mdj", unit: "week", timezone: tz, startOfWeek: "Mon" }
              }
            },
            total: { $sum: 1 }
          }
        },
        { $sort: { "_id.weekStart": 1 } },
        // 5) tidy output 
        {
          $project: {
            _id: 0,
            weekStart: "$_id.weekStart",
            label: {
              $dateToString: { date: "$_id.weekStart", format: "Week of %d %b %Y", timezone: tz }
            },
            total: 1
          }
        }
      ];

      const rows = await users.aggregate(pipeline).toArray();
      res.json({
        window: { start, end, tz },
        categories: rows.map((r: any) => r.label),
        series: [{ name: "Sign-ups", data: rows.map((r: any) => r.total) }]
      });
    } catch (err: any) {
      console.error('signups-monthly error:', err?.message ?? err, err?.stack ?? '');
      return res.status(500).json({ error: 'Failed to fetch signups by month' });
    }
  });
  return router;
}