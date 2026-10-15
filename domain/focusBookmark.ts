import { formatFocusTime } from "@/domain/companions";

export function focusBookmarkState(remaining: number, duration: number, running: boolean) {
  const status = remaining === 0 ? "completed" : running ? "running" : remaining < duration ? "paused" : "idle";
  return {
    status,
    text: status === "idle" ? "专注片刻" : status === "completed" ? "已完成" : formatFocusTime(remaining),
    progress: Math.max(0, Math.min(1, 1 - remaining / duration)),
    label: status === "completed" ? "这一刻已完成，打开专注控制" : status === "idle" ? "专注片刻，打开二十五分钟计时" : `${status === "paused" ? "已暂停" : "专注中"}，剩余 ${formatFocusTime(remaining)}，打开专注控制`,
  };
}
