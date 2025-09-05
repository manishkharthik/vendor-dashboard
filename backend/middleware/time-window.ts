import { Request, Response, NextFunction } from "express";
/**
 * Fixed 8-week Mon–Sun window in Asia/Singapore:
 *  - Start: Mon, 16 Jun 2025 00:00 (+08:00)
 *  - End (exclusive): Mon, 11 Aug 2025 00:00 (+08:00)  // covers Sun, 10 Aug fully
 */
const WINDOW_TZ = "Asia/Singapore";
const WINDOW_START = new Date("2025-06-16T00:00:00+08:00");
const WINDOW_END   = new Date("2025-08-11T00:00:00+08:00"); // exclusive

export function setFixedTimeWindow(req: Request, res: Response, next: NextFunction) {
  res.locals['window'] = { start: WINDOW_START, end: WINDOW_END, tz: WINDOW_TZ };
  next();
}
