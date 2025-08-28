// routes/aov-by-visit.ts
import { Router } from "express";

export default function aovByVisitRoute(db: any) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const users = db.collection("users");
      const step = (req.query.step as string) || "";

      if (step === "by-actual") {
        const vendor = (req.query.vendorId as string)?.trim() || "67f773acc9504931fcc411ec";

        const rows = await db.collection("users").aggregate([
          // 1) explode vendor tiers & filter by vendor
          { $unwind: { path: "$userLoyaltyTier", preserveNullAndEmptyArrays: false } },
          { $match: { "userLoyaltyTier.vendorId": vendor } },

          // 2) obtain the users who have visited (if totalVisits is not undefined)
          { $set: {
              _mdj: { $convert: { input: "$userLoyaltyTier.memberDateJoined", to: "date", onError: null, onNull: null } },
              _visitsRaw: "$userLoyaltyTier.totalVisits"
            }
          },
          { $project: { totalVisits: { $convert: { input: "$totalVisitsStored", to: "int", onError: null, onNull: null } } } },

          // 3) lookup user spending in member_visits
          {
            $lookup: {
              from: "member_visits",
              let: { uid: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $eq: ["$memberId", "$$uid"] }, 
                      ]
                    }
                  }
                },
                { $set: {
                    _spent: { $toDouble: { $ifNull: ["$amountSpent", 0] } },
                    _saved: { $toDouble: { $ifNull: ["$amountSaved", 0] } }
                  }
                },
                { $group: {
                    _id: null,
                    netSpend: { $sum: { $subtract: ["$_spent", "$_saved"] } },
                    actualVisits: { $sum: 1 }
                  }
                }
              ],
              as: "mv"
            }
          },

          // 4) Calculate each users AOV = netSpend / visits
          { $set: {
              netSpend: { $ifNull: [ { $first: "$mv.netSpend" }, 0 ] },
              actualVisits: { $ifNull: [ { $first: "$mv.actualVisits" }, 0 ] }
            }
          },
          { $set: {
              aov: {
                $cond: [
                  { $gt: ["$actualVisits", 0] },
                  { $divide: ["$netSpend", "$actualVisits"] },
                  null
                ]
              }
            }
          },

          // 5) Group by number of visits 
          { $group: {
              _id: "$actualVisits",
              users: { $sum: 1 },
              meanAOV: { $avg: "$aov" },          
              sumNet: { $sum: "$netSpend" },
              sumVisits: { $sum: "$actualVisits" }
            }
          },

          // 6) tidy
          { $sort: { _id: 1 } },
          { $project: {
              _id: 0,
              actualVisits: "$_id",
              users: 1,
              meanAOV: { $round: ["$meanAOV", 2] },
              weightedAOV: { $round: ["$weightedAOV", 2] },
              sumNet: { $round: ["$sumNet", 2] },
              sumVisits: 1
            }
          }
        ]).toArray();
        return res.json({ rows });
      }

      return res.status(400).json({ error: "Add ?step=users-spend to fetch per-user net spending (step 2)." });

    } catch (err: any) {
      console.error("[aov-by-visit] error:", err?.message ?? err, err?.stack ?? "");
      return res.status(500).json({ error: "Failed in aov-by-visit route" });
    }
  });

  return router;
}