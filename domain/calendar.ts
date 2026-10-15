const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** Use the scene's civil date, without converting it back to the device timezone. */
export function getCalendarPage(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return undefined;
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return undefined;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return { year, month: month + 1, day, weekday: weekdays[date.getUTCDay()] };
}
