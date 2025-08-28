// returns monthly signups data from table "users"
import { Router } from "express";

export default function signupsMonthlyRoute(db: any) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const users = db.collection('users');

      const { vendorId, year, from, to } = req.query as {
        vendorId?: string; year?: string; from?: string; to?: string 
      };
      const rawVendor = "67f773acc9504931fcc411ec";

      // Build window [start, end)
      let start: Date, end: Date;
      if (from && to) {
        start = new Date(from);
        end   = new Date(to);
      } else if (year) {
        const y = parseInt(year, 10);
        start = new Date(Date.UTC(y, 0, 1));
        end   = new Date(Date.UTC(y + 1, 0, 1));
      } else {
        end = new Date();
        start = new Date(end);
        start.setMonth(start.getMonth() - 12); // default = last 12 months
      }

      const pipeline = [
        // 0) explode the array so each tier entry is its own doc
        { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },
        // 1) vendor filter (string)
        { $match: { "userLoyaltyTier.vendorId": rawVendor } },
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
        // 4) month buckets (SG timezone to avoid boundary issues)
        { $set: { month: { $dateTrunc: { date: "$_mdj", unit: "month", timezone: "Asia/Singapore" } } } },
        // 5) count entries per month
        { $group: { _id: "$month", total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        // 6) tidy output (you can also return timestamps directly)
        { $project: { _id: 0, month: "$_id", total: 1 } }
      ];

      const rows = await users.aggregate(pipeline).toArray();
      const categories: string[] = [];
      const data: number[] = [];
      const points: [number, number][] = [];

      for (const r of rows) {
        const d = new Date(r.month); // month start in UTC
        const mon = d.toLocaleString("en-SG", { month: "short", timeZone: "Asia/Singapore" });
        const yyyy = d.getUTCFullYear();
        categories.push(`${mon} ${yyyy}`);
        data.push(r.total ?? 0);
        points.push([d.getTime(), r.total ?? 0]); // useful for datetime axis
      }

      res.json({ categories, series: [{ name: 'Signups', data }] });
    } catch (err: any) {
      console.error('signups-monthly error:', err?.message ?? err, err?.stack ?? '');
      return res.status(500).json({ error: 'Failed to fetch signups by month' });
    }
  });
  return router;
}

