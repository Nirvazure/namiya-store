"use client";

import { create } from "zustand";
import type { CompanionOwner, CompanionTool } from "@/domain/companions";

type OpenCompanion = { owner: CompanionOwner; tool: CompanionTool };
type CompanionState = {
  active: OpenCompanion | null;
  toggle: (owner: CompanionOwner, tool: CompanionTool) => void;
  close: () => void;
};

export const useCompanionStore = create<CompanionState>(set => ({
  active: null,
  toggle: (owner, tool) => set(state => ({
    active: state.active?.owner === owner && state.active.tool === tool ? null : { owner, tool },
  })),
  close: () => set({ active: null }),
}));
