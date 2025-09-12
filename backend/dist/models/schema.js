"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Users = Users;
exports.MemberVisits = MemberVisits;
exports.Facilities = Facilities;
function Users(db) {
    return db.collection("users");
}
function MemberVisits(db) {
    return db.collection("member_visits");
}
function Facilities(db) {
    return db.collection("facilities");
}
