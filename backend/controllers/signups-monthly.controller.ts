import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";

export default class SignupsMonthlyController {
  constructor(private db: Db) {}

  // GET /api/signups-monthly
  async monthly(req: Request, res: Response) {
    try {
      const users = this.db.collection('users');

      const { start, end, tz } = res.locals.window;

      const vendorIdParam = (req.query.vendorId as string)?.trim() ?? "67f773acc9504931fcc411ec";
      let vendorObjId: ObjectId | null = null;
      try { 
        vendorObjId = new ObjectId(vendorIdParam); 
      } catch {
        
      }

      const pipeline = [
        // 1) explode the array so each tier entry is its own doc
        { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },
        // 2) vendor filter (string)
        { $match: { "userLoyaltyTier.vendorId": vendorIdParam } },
        // 3) convert string -> Date 
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
        // 4) Window on the converted date
        { $match: { _mdj: { $ne: null, $gte: start, $lt: end } } },
        // 5) Weekly buckets (Mon–Sun) in the same timezone
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
        // 6) tidy output 
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
      return res.json({
        window: { start, end, tz },
        categories: rows.map((r: any) => r.label),
        series: [{ name: "Sign-ups", data: rows.map((r: any) => r.total) }]
      });
    } catch (err: any) {
      console.error('signups-monthly error:', err?.message ?? err, err?.stack ?? '');
      return res.status(500).json({ error: 'Failed to fetch signups by month' });
    }
  }
}
