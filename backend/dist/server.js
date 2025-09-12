"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const node_path_1 = require("node:path");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("mongodb");
const time_window_1 = require("./middleware/time-window");
// Import controllers and routes
const aov_by_visit_controller_1 = __importDefault(require("./controllers/aov-by-visit.controller"));
const aov_by_visit_1 = __importDefault(require("./routes/aov-by-visit"));
const bookings_by_facility_controller_1 = __importDefault(require("./controllers/bookings-by-facility.controller"));
const bookings_by_facility_1 = __importDefault(require("./routes/bookings-by-facility"));
const new_vs_returning_controller_1 = __importDefault(require("./controllers/new-vs-returning.controller"));
const new_vs_returning_1 = __importDefault(require("./routes/new-vs-returning"));
const revenue_by_tier_controller_1 = __importDefault(require("./controllers/revenue-by-tier.controller"));
const revenue_by_tier_1 = __importDefault(require("./routes/revenue-by-tier"));
const signups_monthly_controller_1 = __importDefault(require("./controllers/signups-monthly.controller"));
const signups_monthly_1 = __importDefault(require("./routes/signups-monthly"));
const weekly_bookings_controller_1 = __importDefault(require("./controllers/weekly-bookings.controller"));
const weekly_bookings_1 = __importDefault(require("./routes/weekly-bookings"));
const weekly_cancellations_controller_1 = __importDefault(require("./controllers/weekly-cancellations.controller"));
const weekly_cancellations_1 = __importDefault(require("./routes/weekly-cancellations"));
const weekly_sales_controller_1 = __importDefault(require("./controllers/weekly-sales.controller"));
const weekly_sales_1 = __importDefault(require("./routes/weekly-sales"));
dotenv.config({ path: "../.env" });
dotenv.config({ path: (0, node_path_1.resolve)(process.cwd(), '.env') });
const app = (0, express_1.default)();
const port = process.env.PORT || 5050;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Window available to all routes below
app.use(time_window_1.setFixedTimeWindow);
const uri = process.env.MONGO_URI ?? '';
if (!uri) {
    console.error("MONGO_URI is missing from .env");
    process.exit(1);
}
const dbName = process.env.MONGO_DBNAME || 'fridaylife-dev';
async function startServer() {
    try {
        const client = new mongodb_1.MongoClient(uri);
        await client.connect();
        const db = client.db(dbName);
        app.get("/", (req, res) => res.send("API is running"));
        // Initialize controllers and routes
        const aovByVisitCtrl = new aov_by_visit_controller_1.default(db);
        app.use("/", (0, aov_by_visit_1.default)(aovByVisitCtrl));
        const facilitiesCtrl = new bookings_by_facility_controller_1.default(db);
        app.use("/", (0, bookings_by_facility_1.default)(facilitiesCtrl));
        const newVsReturningCtrl = new new_vs_returning_controller_1.default(db);
        app.use("/", (0, new_vs_returning_1.default)(newVsReturningCtrl));
        const revenueByTierCtrl = new revenue_by_tier_controller_1.default(db);
        app.use("/", (0, revenue_by_tier_1.default)(revenueByTierCtrl));
        const signupsMonthlyCtrl = new signups_monthly_controller_1.default(db);
        app.use("/", (0, signups_monthly_1.default)(signupsMonthlyCtrl));
        const weeklyBookingsCtrl = new weekly_bookings_controller_1.default(db);
        app.use("/", (0, weekly_bookings_1.default)(weeklyBookingsCtrl));
        const weeklyCancellationsCtrl = new weekly_cancellations_controller_1.default(db);
        app.use("/", (0, weekly_cancellations_1.default)(weeklyCancellationsCtrl));
        const weeklySalesCtrl = new weekly_sales_controller_1.default(db);
        app.use("/", (0, weekly_sales_1.default)(weeklySalesCtrl));
        app.listen(port, () => {
            console.log(`Backend running at http://localhost:${port}`);
        });
    }
    catch (err) {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    }
}
startServer();
