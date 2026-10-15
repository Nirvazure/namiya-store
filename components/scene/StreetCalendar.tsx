import { getCalendarPage } from "@/domain/calendar";
import styles from "./StreetCalendar.module.css";

/** Paper calendar adapted from ashif_6672's Uiverse calendar (public/demo/section1). */
export function StreetCalendar({ date }: { date?: string }) {
  const page = date ? getCalendarPage(date) : undefined;
  return <div className={styles.calendar}>
    <div className={styles.binding} aria-hidden="true"><i /><span>{page?.year ?? "年历"}</span><i /></div>
    {page ? <>
      <time className="sr-only" dateTime={date}>{page.year}年{page.month}月{page.day}日，{page.weekday}</time>
      <div className={styles.page} aria-hidden="true">
        <span className={styles.month}>{String(page.month).padStart(2, "0")} 月</span>
        <span className={styles.date}>{String(page.day).padStart(2, "0")}</span>
        <span className={styles.weekday}>{page.weekday}</span>
      </div>
    </> : <div className={`${styles.page} ${styles.pending}`} aria-hidden="true"><span className={styles.month}>此刻</span><span className={styles.date}>—</span></div>}
  </div>;
}
