"use client";

import { formatFocusTime } from "@/domain/companions";
import { usePomodoroStore } from "@/store/usePomodoroStore";

export function PomodoroPanel() {
  const remaining = usePomodoroStore(state => state.remainingSeconds);
  const duration = usePomodoroStore(state => state.durationSeconds);
  const running = usePomodoroStore(state => state.isRunning);
  const start = usePomodoroStore(state => state.start);
  const pause = usePomodoroStore(state => state.pause);
  const reset = usePomodoroStore(state => state.reset);
  const completed = remaining === 0;
  return <>
    <p className="companion-note-intro">留二十五分钟，做眼前的事。</p>
    <p className="companion-focus-time" aria-label={`剩余时间 ${formatFocusTime(remaining)}`}>{formatFocusTime(remaining)}</p>
    {completed && <p className="companion-completed" role="status">这一刻完成了，歇一会儿吧。</p>}
    <div className="companion-focus-actions">
      <button type="button" onClick={running ? pause : () => { if (completed) reset(); start(); }}>{running ? "暂停片刻" : completed ? "再专注一刻" : remaining < duration ? "继续专注" : "开始专注"}</button>
      <button type="button" onClick={reset}>重新计时</button>
    </div>
  </>;
}
