import { Db, Collection, ObjectId } from "mongodb";

export interface UserLoyaltyTier {
  vendorId: string;
  totalVisits?: number | string;
  memberDateJoined?: string | Date;
}

export interface UserDoc {
  _id: ObjectId;
  userLoyaltyTier?: Array<{
    vendorId: string;
    memberDateJoined?: string | Date | null;
  }>;
}

export interface FacilityDoc {
  _id: ObjectId;
  vendorId: ObjectId;
  name?: string | null;
}

export interface MemberVisitDoc {
  _id: ObjectId;
  memberId: ObjectId | string;
  vendorId?: ObjectId | string;
  visitDate?: Date | string | number;
  amountSpent?: number | string;
  amountSaved?: number | string;
  tier?: { displayName?: string | null };
}

export function Users(db: Db): Collection<UserDoc> {
  return db.collection<UserDoc>("users");
}

export function MemberVisits(db: Db): Collection<MemberVisitDoc> {
  return db.collection<MemberVisitDoc>("member_visits");
}

export function Facilities(db: Db): Collection<FacilityDoc> {
  return db.collection<FacilityDoc>("facilities");
}
