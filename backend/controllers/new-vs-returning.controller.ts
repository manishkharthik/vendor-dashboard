import { Db, ObjectId } from "mongodb";
import { Request, Response } from "express";
import { Users, MemberVisits } from "../models/schema";

interface UserIdsDoc {
  userIds: ObjectId[];
}

interface EarliestDoc {
  _id: ObjectId;
  firstVisit: Date;
}

interface VisitRow {
  memberId: ObjectId;
  visitDate: Date;
  net: number;
  year: number;
  week: number;
}

export default class NewVsReturningVisitsController {
  constructor(private db: Db) {}

  async newVsReturningWeekly(req: Request, res: Response) {
    try {
      const step = String(req.query.step || "");
      if (step !== "fr-weekly") {
        return res.status(400).json({ error: "Add ?step=fr-weekly" });
      }

      const usersCol = Users(this.db);
      const visitsCol = MemberVisits(this.db);

      const vendorId = "67f773acc9504931fcc411ec";
      const vendorObj = new ObjectId(vendorId);

      const { start, end, tz } = res.locals.window as { start: Date; end: Date; tz: string };

      // 1) Find userIds
      const idsDoc = await usersCol
        .aggregate<UserIdsDoc>([
          { $unwind: "$userLoyaltyTier" },
          { $match: { "userLoyaltyTier.vendorId": vendorId } },
          { $group: { _id: "$_id", tvLatest: { $last: "$userLoyaltyTier.totalVisits" } } },
          { $match: { tvLatest: { $gte: 1 } } },
          { $group: { _id: null, userIds: { $addToSet: "$_id" } } },
          { $project: { _id: 0, userIds: 1 } }
        ])
        .next();

      const userIds: ObjectId[] = idsDoc?.userIds ?? [];
      if (!userIds.length) {
        return res.json({
          window: { start, end, tz },
          rows: [],
          categories: [],
          series: [
            { name: "First-time", data: [] },
            { name: "Returning", data: [] }
          ]
        });
      }

      // 2) Earliest visit for each user
      const earliestDocs = await visitsCol
        .aggregate<EarliestDoc>([
          { $match: { memberId: { $in: userIds }, vendorId: vendorObj } },
          { $group: { _id: "$memberId", firstVisit: { $min: "$visitDate" } } }
        ])
        .toArray();

      const earliestVisitMap: Record<string, Date> = {};
      earliestDocs.forEach(d => {
        earliestVisitMap[d._id.toHexString()] = d.firstVisit;
      });

      // 3) Visits inside time window
      const rawVisits = await visitsCol
        .aggregate<VisitRow>([
          {
            $match: {
              memberId: { $in: userIds },
              vendorId: vendorObj,
              visitDate: { $gte: start, $lt: end }
            }
          },
          {
            $project: {
              memberId: 1,
              visitDate: 1,
              net: { $subtract: [{ $ifNull: ["$amountSpent", 0] }, { $ifNull: ["$amountSaved", 0] }] },
              year: { $isoWeekYear: "$visitDate" },
              week: { $isoWeek: "$visitDate" }
            }
          }
        ])
        .toArray();

      // 4) Post-process
      const grouped: Record<string, any> = {};

      for (const v of rawVisits) {
        const key = `${v.year}-W${v.week}`;
        if (!grouped[key]) {
          grouped[key] = { year: v.year, week: v.week, firstCount: 0, returningCount: 0, firstTotal: 0, returningTotal: 0 };
        }

        const uid = v.memberId.toHexString();
        const firstVisit = earliestVisitMap[uid];

        const isFirst = firstVisit && v.visitDate.getTime() === firstVisit.getTime();
        if (isFirst) {
          grouped[key].firstCount += 1;
          grouped[key].firstTotal += v.net;
        } else {
          grouped[key].returningCount += 1;
          grouped[key].returningTotal += v.net;
        }
      }

      // Convert to array
      const rows = Object.values(grouped).sort((a: any, b: any) =>
        a.year === b.year ? a.week - b.week : a.year - b.year
      );

      rows.forEach(r => {
        r.firstTotal = Number(r.firstTotal.toFixed(2));
        r.returningTotal = Number(r.returningTotal.toFixed(2));
        r.label = `Week ${r.week}, ${r.year}`;
      });

      // 5) Response
      const categories = rows.map(r => r.label);
      const firstSeries = rows.map(r => r.firstCount);
      const returningSeries = rows.map(r => r.returningCount);

      return res.json({
        window: { start, end, tz },
        rows,
        categories,
        series: [
          { name: "First-time", data: firstSeries },
          { name: "Returning", data: returningSeries }
        ]
      });
    } catch (err: any) {
      console.error("[newVsReturningWeekly] error:", err?.message ?? err);
      return res.status(500).json({ error: "Failed to fetch new vs returning visits" });
    }
  }
}

