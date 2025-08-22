// returns monthly signups data from table "users"
import { Router } from "express";

export default function signupsMonthlyRoute(db: any) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const users = db.collection('users');
      
      const { year, from, to } = req.query as { year?: string; from?: string; to?: string };

      let start: Date, end: Date;
      if (from && to) {
        start = new Date(from);
        end = new Date(to);
      } else {
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        start = new Date(Date.UTC(y, 0, 1));
        end   = new Date(Date.UTC(y + 1, 0, 1));
      }

      const pipeline = [
        {
          $match: {
            $and: [
              { signedUpOn: { $exists: true, $ne: null } },
              { signedUpOn: { $gte: start, $lt: end } },
              { $expr: { $eq: [{ $type: '$signedUpOn' }, 'date'] } } // ensure real Date
            ]
          }
        },
        {
          $group: {
            _id: { y: { $year: '$signedUpOn' }, m: { $month: '$signedUpOn' } },
            total: { $sum: 1 }
          }
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
        {
          $project: {
            _id: 0,
            total: 1,
            y: '$_id.y',
            m: '$_id.m'
          }
        }
      ];

      const rows = await users.aggregate(pipeline).toArray();
      const categories: string[] = [];
      const data: number[] = [];
      for (const r of rows) {
        const monthStart = new Date(Date.UTC(r.y, r.m - 1, 1));
        const mon = monthStart.toLocaleString('en-SG', { month: 'short', timeZone: 'Asia/Singapore' });
        const yy  = String(monthStart.getUTCFullYear()).slice(-2);
        categories.push(`${mon} '${yy}`);
        data.push(r.total ?? 0);
      }
      res.json({ categories, series: [{ name: 'Signups', data }] });
    } catch (err: any) {
      console.error('signups-monthly error:', err?.message ?? err, err?.stack ?? '');
      return res.status(500).json({ error: 'Failed to fetch signups by month' });
    }
  });
  return router;
}

