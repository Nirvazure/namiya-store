"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CurrentUser, SessionResponse, Shop, ShopPageResponse } from "@/domain/shops";
import type { ThreadListResponse } from "@/domain/threads";
import { api, errorMessage } from "@/services/api/client";

export function useShopSession() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [own, setOwn] = useState<Shop | null>(null);
  const [initializationError, setInitializationError] = useState("");
  const [favorites, setFavorites] = useState<Shop[]>([]);
  const [favoriteCursor, setFavoriteCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(false);
  const userId = user?.id ?? null;
  const epoch = useRef(0);
  const sessionVersion = useRef(0);
  const identity = useRef<string | null>(null);
  const unreadRequest = useRef<{ version: number; promise: Promise<void> } | null>(null);
  const moreBusy = useRef(false);

  const refreshSession = useCallback(async () => {
    const version = ++sessionVersion.current;
    try {
      const session = await api<SessionResponse>("/api/me");
      if (sessionVersion.current !== version) return;
      const nextIdentity = session.user?.id ?? null;
      if (identity.current !== nextIdentity) {
        identity.current = nextIdentity; epoch.current++;
        setOwn(null); setFavorites([]); setFavoriteCursor(null); setUnread(false);
      }
      setUser(session.user); setConfigured(session.configured); setReady(true);
      setInitializationError(session.initializationError ?? "");
      if (session.myShopId) {
        const result = await api<{ shop: Shop }>(`/api/shops/${encodeURIComponent(session.myShopId)}`);
        if (sessionVersion.current === version) setOwn(result.shop);
      } else setOwn(null);
    } catch (error) { if (sessionVersion.current === version) { setReady(true); setInitializationError(errorMessage(error)); } }
  }, []);

  useEffect(() => {
    let active = true;
    const generation = epoch;
    const requests = sessionVersion;
    queueMicrotask(() => { if (active) void refreshSession(); });
    return () => { active = false; generation.current++; requests.current++; };
  }, [refreshSession]);

  const refreshUnread = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    const version = epoch.current;
    if (unreadRequest.current?.version === version) return unreadRequest.current.promise;
    const promise = api<ThreadListResponse>("/api/threads?box=all", { signal: AbortSignal.timeout(10_000) }).then(result => {
      if (epoch.current === version) setUnread(result.threads.some(thread => thread.unread));
    }).catch(() => { /* Poll failures do not interrupt the scene. */ }).finally(() => {
      if (unreadRequest.current?.promise === promise) unreadRequest.current = null;
    });
    unreadRequest.current = { version, promise };
    return promise;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const version = epoch.current;
    void api<ShopPageResponse>("/api/shops/favorites").then(result => {
      if (epoch.current === version) { setFavorites(result.shops); setFavoriteCursor(result.nextCursor); }
    }).catch(() => {});
    const refresh = () => { if (!document.hidden) void refreshUnread(); };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [userId, refreshUnread]);

  async function moreFavorites() {
    if (!favoriteCursor || moreBusy.current || !userId) return;
    moreBusy.current = true;
    const version = epoch.current;
    try {
      const page = await api<ShopPageResponse>(`/api/shops/favorites?cursor=${encodeURIComponent(favoriteCursor)}`);
      if (epoch.current === version) { setFavorites(current => {
        const ids = new Set(current.map(shop => shop.id));
        return [...current, ...page.shops.filter(shop => !ids.has(shop.id))];
      }); setFavoriteCursor(page.nextCursor); }
    } finally { moreBusy.current = false; }
  }
  const syncShop = useCallback((shop: Shop) => {
    if (shop.isOwner) setOwn(shop);
    setFavorites(current => {
      const index = current.findIndex(item => item.id === shop.id);
      if (shop.isFavorite === false) return index < 0 ? current : current.filter(item => item.id !== shop.id);
      if (index < 0) return shop.isFavorite ? [...current, shop] : current;
      return current.map((item, position) => position === index ? { ...shop, isFavorite: true } : item);
    });
  }, []);
  async function signOut() {
    await api("/api/auth/signout", { method: "POST" });
    epoch.current++; sessionVersion.current++; identity.current = null;
    setUser(null); setOwn(null); setFavorites([]); setFavoriteCursor(null); setUnread(false); setInitializationError("");
  }
  return { user, ready, configured, own, favorites, favoriteCursor, unread, initializationError,
    refreshSession, refreshUnread, moreFavorites, syncShop, signOut };
}
