import { create } from "zustand";
import type { CounterId, IndoorItemId } from "@/domain/indoor";

type Order = { item: IndoorItemId; phase: "preparing" | "served" | "tasted"; readyAt: number };

type IndoorState = {
  currentCounter: CounterId;
  orders: Partial<Record<CounterId, Order>>;
  setCounter: (counter: CounterId) => void;
  order: (counter: CounterId, item: IndoorItemId) => void;
  serve: (counter: CounterId, readyAt: number) => void;
  taste: (counter: CounterId) => void;
  clear: (counter: CounterId) => void;
};

export const useIndoorStore = create<IndoorState>((set) => ({
  currentCounter: "grandpa",
  orders: {},
  setCounter: (currentCounter) => set({ currentCounter }),
  order: (counter, item) => set((state) => ({ orders: { ...state.orders, [counter]: { item, phase: "preparing", readyAt: Date.now() + 1300 } } })),
  serve: (counter, readyAt) => set((state) => {
    const order = state.orders[counter];
    return order && order.phase === "preparing" && order.readyAt === readyAt ? { orders: { ...state.orders, [counter]: { ...order, phase: "served" } } } : state;
  }),
  taste: (counter) => set((state) => {
    const order = state.orders[counter];
    return order ? { orders: { ...state.orders, [counter]: { ...order, phase: "tasted" } } } : state;
  }),
  clear: (counter) => set((state) => ({ orders: { ...state.orders, [counter]: undefined } })),
}));
