import { systemShops, type Shop, type ShopPageResponse } from "@/domain/shops";
import { api } from "@/services/api/client";

export class ShopTrail {
  private ids: string[];
  private position = 0;
  private seen: Set<string>;
  constructor(id: string) { this.ids = [id]; this.seen = new Set([id]); }
  observe(id: string) {
    const index = this.ids.indexOf(id);
    if (index >= 0) this.position = index;
    else { this.ids = [...this.ids.slice(0, this.position + 1), id]; this.position++; }
    this.seen.add(id);
  }
  previousIds() { return this.ids.slice(0, this.position).reverse(); }
  forwardIds() { return this.ids.slice(this.position + 1); }
  hasVisited(id: string) { return this.seen.has(id); }
}

export class DiscoveryQueue {
  private shops: Shop[] = [];
  private cursor: string | null = null;
  private started = false;
  private pending: Promise<void> | null = null;
  constructor(private readonly excludeId?: string) {}
  private async fill() {
    if (this.shops.length || (this.started && !this.cursor)) return;
    if (!this.pending) this.pending = (async () => {
      const first = !this.started;
      const page = await api<ShopPageResponse>(`/api/shops${this.cursor ? `?cursor=${encodeURIComponent(this.cursor)}` : ""}`);
      this.shops = (first && page.shops.length === 0 ? [...systemShops.filter(shop => shop.kind === "demo"), systemShops[0]] : page.shops).filter(shop => shop.id !== this.excludeId);
      this.cursor = page.nextCursor; this.started = true;
    })().finally(() => { this.pending = null; });
    await this.pending;
  }
  async peek(): Promise<Shop | null> { await this.fill(); return this.shops[0] ?? null; }
  async take(): Promise<Shop | null> { await this.fill(); return this.shops.shift() ?? null; }
}
export function swipeDirection(dx: number, dy: number): "next" | "previous" | null {
  return Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5 ? dx < 0 ? "next" : "previous" : null;
}
