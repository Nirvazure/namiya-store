import { usePomodoroStore } from "@/store/usePomodoroStore";

/** The clock lives with the experience, not with any of its four controls. */
export function watchFocusClock(store = usePomodoroStore) {
  let timer: ReturnType<typeof setInterval> | undefined;
  function sync() {
    if (store.getState().isRunning && timer === undefined) timer = setInterval(() => store.getState().tick(), 1000);
    else if (!store.getState().isRunning && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  }
  const unsubscribe = store.subscribe(sync);
  sync();
  return () => { unsubscribe(); clearInterval(timer); };
}
