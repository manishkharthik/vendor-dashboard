// returns revenue by tier from table "member visits"
import { Router } from 'express';
import { ObjectId } from "mongodb";

type TierRow = {
  tier: string;
  totalRevenue: number;
};

export default function revenueByTierRoute(db: any) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const visits = db.collection('member_visits');
      const { vendorId, from, to } = req.query as {
        vendorId?: string; from?: string; to?: string;
      };

      // Vendor filter (ObjectId)
      const rawVendor = (vendorId && vendorId.trim())
        ? vendorId.trim()
        : '67f773acc9504931fcc411ec';

      let vendorObjId: ObjectId;
      try {
        vendorObjId = new ObjectId(rawVendor);
      } catch {
        return res.status(400).json({ error: 'Invalid vendorId (expected ObjectId hex)' });
      }

      const end = to ? new Date(to) : new Date();
      const start = from
        ? new Date(from)
        : new Date(end.getTime() - 12 * 7 * 24 * 3600 * 1000);

      const match = {
        vendorId: vendorObjId,
        visitDate: { $gte: start, $lt: end },
        $expr: { $eq: [{ $type: '$visitDate' }, 'date'] }
      };

      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: { 
              tierName: { 
                $trim: {
                  input: { $ifNull: ['$tier.displayName', 'Unknown'] }
                }
              } 
            },
            totalRevenue: {
              $sum: { $convert: { input: { $ifNull: ['$amountSpent', 0] }, to: 'double', onError: 0, onNull: 0 }}
            }
          }
        },
        { $sort: { totalRevenue: -1 } },
        {
          $project: {
            _id: 0,
            tier: '$_id.tierName',
            totalRevenue: { $round: ['$totalRevenue', 0] }
          }
        }
      ];

      const rows = (await visits.aggregate(pipeline).toArray()) as TierRow[];

      return res.json({
        categories: rows.map((r) => r.tier),
        series: [{ name: 'Revenue (SGD)', data: rows.map((r) => r.totalRevenue) }]
      });
    } catch (err: any) {
      console.error('revenue-by-tier error:', err?.message ?? err);
      return res.status(500).json({ error: 'Failed to fetch revenue by tier' });
    }
  });

  return router;
}