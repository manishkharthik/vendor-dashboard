import { Db } from "mongodb";

export default class AovByVisitController {
  constructor(private db: Db) {}

  // GET /api/aov-by-visit?step=by-actual&vendorId
  async aovByActual(req, res) {
    try {
      const step = (req.query.step as string) || "";
      if (step !== "by-actual") {
        return res.status(400).json({
          error: "Add ?step=by-actual to compute AOV by actual visits within the time window."
        });
      }

      const vendor = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";
      const { start, end } = res.locals.window; 

      const rows = await this.db.collection("users").aggregate([
        // 1) explode vendor tiers & filter by vendor
        { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },
        { $match: { "userLoyaltyTier.vendorId": vendor } },

        // 2) keep useful fields
        {
          $addFields: {
            _mdj: {
              $convert: {
                input: "$userLoyaltyTier.memberDateJoined",
                to: "date",
                onError: null,
                onNull: null
              }
            },
            totalVisitsStored: "$userLoyaltyTier.totalVisits"
          }
        },
        {
          $addFields: {
            totalVisits: {
              $convert: { input: "$totalVisitsStored", to: "int", onError: null, onNull: null }
            }
          }
        },

        // 3) lookup user spending in member_visits, filtered by time window
        {
          $lookup: {
            from: "member_visits",
            let: { uid: "$_id", start: start, end: end },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$memberId", "$$uid"] },
                      { $eq: [{ $type: "$visitDate" }, "date"] },
                      { $gte: ["$visitDate", "$$start"] },
                      { $lt:  ["$visitDate", "$$end"] }
                    ]
                  }
                }
              },
              {
                $set: {
                  _spent: { $toDouble: { $ifNull: ["$amountSpent", 0] } },
                  _saved: { $toDouble: { $ifNull: ["$amountSaved", 0] } }
                }
              },
              {
                $group: {
                  _id: null,
                  netSpend: { $sum: { $subtract: ["$_spent", "$_saved"] } },
                  actualVisits: { $sum: 1 }
                }
              }
            ],
            as: "mv"
          }
        },

        // 4) per-user AOV = netSpend / actualVisits
        {
          $addFields: {
            netSpend: { $ifNull: [{ $first: "$mv.netSpend" }, 0] },
            actualVisits: { $ifNull: [{ $first: "$mv.actualVisits" }, 0] }
          }
        },
        {
          $addFields: {
            aov: {
              $cond: [{ $gt: ["$actualVisits", 0] }, { $divide: ["$netSpend", "$actualVisits"] }, null]
            }
          }
        },

        // 5) Group by number of visits (actual, in-window)
        {
          $group: {
            _id: "$actualVisits",
            users: { $sum: 1 },
            meanAOV: { $avg: "$aov" },
            sumNet: { $sum: "$netSpend" },
            sumVisits: { $sum: "$actualVisits" }
          }
        },

        // 6) format output
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            actualVisits: "$_id",
            users: 1,
            meanAOV: { $round: ["$meanAOV", 2] },
            weightedAOV: {
              $cond: [{ $gt: ["$sumVisits", 0] }, { $round: [{ $divide: ["$sumNet", "$sumVisits"] }, 2] }, null]
            },
            sumNet: { $round: ["$sumNet", 2] },
            sumVisits: 1
          }
        }
      ]).toArray();

      return res.json({ window: res.locals.window, rows });
    } catch (err: any) {
      console.error("[aov-by-visit] error:", err?.message ?? err, err?.stack ?? "");
      return res.status(500).json({ error: "Failed in aov-by-visit controller" });
    }
  }
}
