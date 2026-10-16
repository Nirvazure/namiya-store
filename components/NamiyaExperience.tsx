"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Heart } from "@phosphor-icons/react/dist/csr/Heart";
import { DeliveryAnimation, type MailFlight } from "@/components/letter/DeliveryAnimation";
import { LetterPanel } from "@/components/letter/LetterPanel";
import { ShopDialog } from "@/components/shops/ShopDialog";
import { WorldAccount } from "@/components/shops/WorldAccount";
import { ShopAnchors } from "@/components/shops/ShopAnchors";
import { useShopSession } from "@/components/shops/useShopSession";
import { useShopSwipe } from "@/components/shops/useShopSwipe";
import { FocusBookmark } from "@/components/companions/FocusBookmark";
import { MusicDock } from "@/components/music/MusicDock";
import { ExteriorScene } from "@/components/scene/ExteriorScene";
import { deliverPreparedLetter } from "@/services/letters/deliverLetter";
import { preloadIndoorEntry } from "@/services/scene/preloadIndoor";
import { api, ApiError, errorMessage } from "@/services/api/client";
import { prepareLogin } from "@/services/auth/login";
import { loadShopDestination, preloadExterior, shopPath } from "@/services/shops/navigation";
import { DiscoveryQueue, ShopTrail } from "@/services/shops/exploration";
import { defaultShop, getSystemShop, type Shop } from "@/domain/shops";
import { useAppStore } from "@/store/useAppStore";
import { useLetterStore } from "@/store/useLetterStore";
import { useMusicStore } from "@/store/useMusicStore";
import { useCompanionStore } from "@/store/useCompanionStore";
import "@/components/shops/world-navigation.css";
import "@/components/letter/mailbox.css";

const loadIndoor = () => import("@/components/scene/IndoorScene");
const IndoorScene = dynamic(() => loadIndoor().then(module => module.IndoorScene));
const ThreadMailbox = dynamic(() => import("@/components/letter/ThreadMailbox").then(module => module.ThreadMailbox), {
  loading: () => <p className="world-notice" role="status">正在打开自己的信箱…</p>,
});

type Panel = "account" | "mail" | "login";
export function NamiyaExperience({ initialShopId = "grandpa" }: { initialShopId?: string }) {
  const session = useShopSession();
  const { user, ready: sessionReady } = session;
  const syncShop = session.syncShop;
  const userId = user?.id ?? null;
  const [shop, setShop] = useState<Shop>(() => getSystemShop(initialShopId) ?? defaultShop);
  const [resolved, setResolved] = useState(() => Boolean(getSystemShop(initialShopId)));
  const [routeFailure, setRouteFailure] = useState("");
  const [routeRetry, setRouteRetry] = useState(0);
  const [panel, setPanel] = useState<Panel>();
  const [notice, setNotice] = useState("");
  const [accountError, setAccountError] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const [canPrevious, setCanPrevious] = useState(false);
  const [hopDirection, setHopDirection] = useState<"next" | "previous">("next");
  const [trail] = useState(() => new ShopTrail(initialShopId));
  const queue = useMemo(() => new DiscoveryQueue(session.own?.id), [session.own?.id]);
  const [flight, setFlight] = useState<MailFlight>();
  const [location, setLocation] = useState<"outside" | "inside">("outside");
  const [hasEntered, setHasEntered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [entryError, setEntryError] = useState<string>();
  const [conversationOpen, setConversationOpen] = useState(false);
  const transitionLock = useRef(false);
  const transitionLayer = useRef<HTMLDivElement>(null);
  const transitionTimeline = useRef<gsap.core.Timeline | null>(null);
  const alive = useRef(true);
  const sending = useRef(false);
  const navigationVersion = useRef(0);
  const shopVersion = useRef(0);
  const navigating = useRef(false);
  const current = useRef({ shop, resolved, userId });
  const flowState = useLetterStore(state => state.flowState);
  const error = useLetterStore(state => state.error);
  const letterOpen = ["letterWriting", "characterSelecting", "privacySelecting", "replyReading"].includes(flowState);
  const blocked = Boolean(panel) || letterOpen || transitioning || navigationBusy;
  const companionHidden = blocked || flowState === "delivering" || (location === "inside" && conversationOpen);

  useEffect(() => {
    alive.current = true; useAppStore.getState().hydrate();
    const generation = navigationVersion;
    const authError = new URLSearchParams(window.location.search).get("error");
    if (authError) queueMicrotask(() => setNotice(authError === "account_initialization_failed" ? "登录已完成，小店准备失败，请在账号菜单重试。" : "这次登录没有完成，请重新试一次。草稿仍在这台设备。"));
    return () => { alive.current = false; generation.current++; transitionTimeline.current?.kill(); };
  }, []);
  useEffect(() => useLetterStore.subscribe((state, previous) => { if (state.flowState !== previous.flowState) useCompanionStore.getState().close(); }), []);

  const applyDestination = useCallback((destination: Shop) => {
    shopVersion.current++;
    syncShop(destination);
    trail.observe(destination.id); setCanPrevious(trail.previousIds().length > 0);
    current.current = { shop: destination, resolved: true, userId };
    useLetterStore.getState().setContext(userId, destination); useCompanionStore.getState().close();
    setShop(destination); setResolved(true); setRouteFailure(""); setLocation("outside"); setHasEntered(false); setConversationOpen(false); setPanel(undefined); setEntryError(undefined);
  }, [userId, trail, syncShop]);
  useEffect(() => {
    if (current.current.resolved && current.current.shop.id === initialShopId && current.current.userId === userId && !routeRetry) return;
    const controller = new AbortController();
    const version = ++navigationVersion.current;
    void loadShopDestination(initialShopId, controller.signal).then(destination => {
      if (!controller.signal.aborted && version === navigationVersion.current) applyDestination(destination);
    }).catch(error => {
      if (controller.signal.aborted || version !== navigationVersion.current) return;
      if (current.current.resolved) { window.history.replaceState(null, "", shopPath(current.current.shop.id)); setNotice(errorMessage(error)); }
      else setRouteFailure(errorMessage(error));
    });
    return () => controller.abort();
  }, [initialShopId, userId, routeRetry, applyDestination]);

  const visit = useCallback(async (id: string, replace = false) => {
    if (navigating.current || transitionLock.current || useLetterStore.getState().flowState === "delivering") return;
    navigating.current = true; setNavigationBusy(true);
    const version = ++navigationVersion.current;
    try {
      const destination = await loadShopDestination(id);
      if (!alive.current || version !== navigationVersion.current) return;
      window.history[replace ? "replaceState" : "pushState"](null, "", shopPath(destination.id));
      applyDestination(destination); setNotice("");
    } catch (error) { if (alive.current && version === navigationVersion.current) setNotice(errorMessage(error)); }
    finally { navigating.current = false; if (alive.current) setNavigationBusy(false); }
  }, [applyDestination]);
  async function hop(direction: "next" | "previous") {
    if (navigating.current || blocked || location !== "outside" || flowState === "delivering") return;
    navigating.current = true; setNavigationBusy(true);
    const version = ++navigationVersion.current;
    const accept = (destination: Shop) => {
      if (!alive.current || version !== navigationVersion.current) return;
      setHopDirection(direction); window.history.pushState(null, "", shopPath(destination.id));
      applyDestination(destination); setNotice("");
    };
    const available = (candidate: Shop) => candidate.isOwner || candidate.isOpen && (candidate.kind !== "human" || candidate.discoverable);
    try {
      for (const id of direction === "previous" ? trail.previousIds() : trail.forwardIds()) {
        try { const destination = await loadShopDestination(id); if (available(destination)) { accept(destination); return; } }
        catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
      }
      if (direction === "next") {
        let candidate: Shop | null;
        while ((candidate = await queue.peek())) {
          if (trail.hasVisited(candidate.id) || candidate.id === session.own?.id) { await queue.take(); continue; }
          try {
            const destination = await loadShopDestination(candidate.id);
            await queue.take();
            if (available(destination)) { accept(destination); return; }
          } catch (error) { if (error instanceof ApiError && error.status === 404) { await queue.take(); continue; } throw error; }
          if (version !== navigationVersion.current) return;
        }
      }
      setNotice(direction === "next" ? "这一程暂时逛完了。可以往回走，或回熟悉的小店坐坐。" : "前面的小店暂时歇息了，可以继续向前逛。");
    } catch (error) { if (alive.current && version === navigationVersion.current) setNotice(errorMessage(error)); }
    finally { navigating.current = false; if (alive.current) setNavigationBusy(false); }
  }
  const swipe = useShopSwipe(resolved && location === "outside" && !blocked && flowState !== "delivering", direction => void hop(direction));
  useEffect(() => {
    let active = true;
    void queue.peek().then(candidate => { if (active && candidate && !trail.hasVisited(candidate.id)) return preloadExterior(candidate); }).catch(() => {});
    return () => { active = false; };
  }, [queue, shop.id, trail]);
  const ownShopId = session.own?.id;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && ownShopId && window.location.pathname === "/" && !new URLSearchParams(window.location.search).has("error")) void visit(ownShopId, true);
    });
    return () => { active = false; };
  }, [ownShopId, visit]);
  useEffect(() => {
    useLetterStore.getState().setContext(userId, shop);
  }, [shop, userId]);
  useEffect(() => {
    useMusicStore.getState().applyShopDefault(shop.id, shop.musicTrackId);
  }, [shop.id, shop.musicTrackId]);
  useEffect(() => {
    if (!userId || !sessionReady) return;
    try {
      const raw = window.sessionStorage.getItem("namiya.login-draft");
      if (!raw) return;
      const carried = JSON.parse(raw);
      if (carried.shopId === shop.id && typeof carried.draft?.body === "string" && typeof carried.draft?.title === "string") {
        const state = useLetterStore.getState();
        if (!state.draft.body) { state.updateDraft(carried.draft); state.setSignature(typeof carried.signature === "string" ? carried.signature : ""); }
        window.sessionStorage.removeItem("namiya.login-draft");
      }
    } catch { /* Browser storage is optional. */ }
  }, [shop.id, userId, sessionReady]);
  useEffect(() => {
    if (shop.kind !== "human") return;
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (document.hidden || pending) return;
      pending = true;
      const version = shopVersion.current;
      try {
        const { shop: latest } = await api<{ shop: Shop }>(`/api/shops/${encodeURIComponent(shop.id)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (controller.signal.aborted || current.current.shop.id !== latest.id || shopVersion.current !== version) return;
        current.current.shop = latest; setShop(latest);
        syncShop(latest);
        if (!latest.isOpen && !latest.isOwner) { setLocation("outside"); setHasEntered(false); }
      } catch { /* Poll failures keep the usable scene. */ }
      finally { pending = false; }
    }
    const timer = window.setInterval(() => { void refresh(); }, 15_000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [shop.id, shop.kind, userId, syncShop]);

  function prepareEntry() {
    return Promise.all([preloadIndoorEntry(shop), loadIndoor()]);
  }
  async function changeScene(next: "outside" | "inside") {
    if (transitionLock.current || next === location || blocked || flowState === "delivering") return;
    if (next === "inside" && !shop.isOpen && !shop.isOwner) { setNotice("店主暂时关店，改天再来坐坐吧。"); return; }
    useCompanionStore.getState().close(); transitionLock.current = true; setTransitioning(true); setEntryError(undefined);
    if (next === "inside") {
      try { await prepareEntry(); }
      catch { if (alive.current) { setEntryError("店里的图片还没准备好，请再试一次。"); setTransitioning(false); transitionLock.current = false; } return; }
      if (!alive.current) return;
      setHasEntered(true);
    }
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : .3;
    transitionTimeline.current = gsap.timeline({ onComplete: () => {
      if (!alive.current) return;
      setTransitioning(false); transitionLock.current = false;
      requestAnimationFrame(() => document.querySelector<HTMLElement>(next === "inside" ? "#indoor-scene" : ".shop-entry-door")?.focus({ preventScroll: true }));
    } }).to(transitionLayer.current, { opacity: 1, duration }).call(() => setLocation(next)).to(transitionLayer.current, { opacity: 0, duration });
  }
  function openLetter() {
    if (shop.isOwner) { setNotice("收信请回门口，点击自己的实体信箱。"); return; }
    if (!shop.isOpen || !shop.acceptingLetters) { setNotice("店主暂不接收新来信，已有往来可回自己店里的信箱继续。"); return; }
    if (!sessionReady) { setNotice("正在确认登录状态，请稍等一下。"); return; }
    useLetterStore.getState().openLetter();
  }
  function openMailbox() {
    const letter = useLetterStore.getState();
    if (letter.flowState === "delivering" || sending.current) return;
    if (shop.isOwner) { setPanel("mail"); return; }
    if (!shop.isOpen || !shop.acceptingLetters) { openLetter(); return; }
    useAppStore.getState().completeIntro();
    if (letter.flowState !== "envelopeReady") { openLetter(); return; }
    if (!user) { setPanel("login"); return; }
    const envelope = document.querySelector(".held-envelope")?.getBoundingClientRect();
    const slot = (document.querySelector(".mail-slot-flap") ?? document.querySelector("#scene-mailbox"))?.getBoundingClientRect();
    if (slot) setFlight({ from: { x: envelope ? envelope.left + envelope.width / 2 : innerWidth * .5, y: envelope ? envelope.top + envelope.height / 2 : innerHeight * .7 }, to: { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2 }, slotWidth: slot.width });
    sending.current = true;
    void deliverPreparedLetter().then(result => {
      if (result && alive.current) { setNotice("信已送达。回到自己的店，等一封回信吧。"); void session.refreshUnread(); }
    }).finally(() => { sending.current = false; if (alive.current) setFlight(undefined); });
  }
  async function saveSettings(settings: Partial<Pick<Shop, "isOpen" | "discoverable" | "acceptingLetters">>) {
    if (settingsBusy) return;
    setSettingsBusy(true); setAccountError("");
    shopVersion.current++;
    try {
      const { shop: updated } = await api<{ shop: Shop }>("/api/shops/mine/settings", { method: "PATCH", body: JSON.stringify(settings) });
      if (useLetterStore.getState().userId !== userId) return;
      session.syncShop(updated);
      shopVersion.current++;
      if (updated.id === current.current.shop.id) { current.current.shop = updated; setShop(updated); }
    } catch (error) { setAccountError(errorMessage(error)); }
    finally { setSettingsBusy(false); }
  }
  async function toggleFavorite() {
    if (!user) { setPanel("login"); return; }
    if (favoriteBusy) return;
    const target = shop; setFavoriteBusy(true);
    shopVersion.current++;
    try {
      const result = await api<{ isFavorite: boolean }>(`/api/shops/${encodeURIComponent(target.id)}/favorite`, { method: target.isFavorite ? "DELETE" : "PUT" });
      if (useLetterStore.getState().userId !== userId) return;
      const updated = { ...target, ...result }; session.syncShop(updated);
      shopVersion.current++;
      if (current.current.shop.id === updated.id) { current.current.shop = updated; setShop(updated); }
    } catch (error) { setNotice(errorMessage(error)); }
    finally { setFavoriteBusy(false); }
  }
  async function signOut() {
    try {
      await session.signOut(); navigationVersion.current++; setPanel(undefined); setAccountError("");
      const publicShop = { ...current.current.shop, isOwner: false, isFavorite: false };
      current.current = { shop: publicShop, resolved: true, userId: null };
      useLetterStore.getState().setContext(null, publicShop); setShop(publicShop);
      if (!publicShop.isOpen) { setLocation("outside"); setHasEntered(false); }
    } catch (error) { setAccountError(errorMessage(error)); }
  }
  return <main className="namiya-world" id="street">
    <div inert={Boolean(panel && panel !== "account") || letterOpen || flowState === "delivering"}>
      <WorldAccount user={user} own={session.own} ready={sessionReady} open={panel === "account"} busy={settingsBusy} error={accountError || session.initializationError} onToggle={() => { useCompanionStore.getState().close(); setPanel(user ? panel === "account" ? undefined : "account" : "login"); }} onClose={() => setPanel(undefined)} onSignOut={() => void signOut()} onRetry={() => void session.refreshSession()} onSettings={settings => void saveSettings(settings)} />
    </div>
    <div inert={blocked || flowState === "delivering"}><ShopAnchors user={user} own={session.own} current={shop} favorites={session.favorites} unread={session.unread} hasMore={Boolean(session.favoriteCursor)} onVisit={id => void visit(id)} onLogin={() => user ? void session.refreshSession() : setPanel("login")} onMore={() => void session.moreFavorites().catch(error => setNotice(errorMessage(error)))} /></div>
    {notice && !panel && !letterOpen && <p className="world-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="收起提示"> ×</button></p>}
    {!resolved ? <div className="world-route-error" role="status"><p>{routeFailure || "正在寻找那家小店…"}</p>{routeFailure && <button type="button" onClick={() => setRouteRetry(value => value + 1)}>重新寻找</button>}</div> : <>
      <div className={`scene-layer world-stage ${!shop.isOpen ? "shop-closed" : ""}`} data-direction={hopDirection} hidden={location !== "outside"} inert={location !== "outside" || blocked} tabIndex={0} role="group" aria-label="左右逛店场景，方向键或滑动切换" {...swipe}>
        <ExteriorScene key={shop.id} shop={shop} flowState={flowState} hasReply={Boolean(shop.isOwner && session.unread)} error={error} onOpenMailbox={openMailbox} onEditLetter={openLetter} onEnter={() => void changeScene("inside")} onPrepareEntry={() => { if (shop.isOpen || shop.isOwner) void prepareEntry().catch(() => {}); }} entering={transitioning} entryError={entryError} />
        {!shop.isOpen && <div className="closed-shop-status" role="status"><strong>暂时关店</strong><small>{shop.isOwner ? "门口的信箱仍为你留着。" : "灯歇一会儿，已有往来仍可继续。"}</small></div>}
      </div>
      {hasEntered && <div className="scene-layer" hidden={location !== "inside"} inert={location !== "inside" || blocked}><IndoorScene key={shop.id} shop={shop} active={location === "inside"} blocked={blocked} envelopeReady={flowState === "envelopeReady"} onExit={() => void changeScene("outside")} onWrite={openLetter} onEditLetter={openLetter} onConversationChange={setConversationOpen} /></div>}
      {location === "outside" && <div className="world-shop-card" inert={blocked || flowState === "delivering"}><div><strong>{shop.name}</strong><small>{shop.isOwner ? "你的灯下" : `${shop.ownerDisplayName}的灯下`}{!shop.isOpen ? " · 暂时关店" : !shop.acceptingLetters ? " · 暂停新信" : ""}</small></div>{shop.kind === "human" && !shop.isOwner && <button className="world-favorite" type="button" disabled={favoriteBusy} onClick={() => void toggleFavorite()} aria-label={shop.isFavorite ? "取消收藏这家店" : "收藏这家店"} aria-pressed={Boolean(shop.isFavorite)}><Heart size={21} weight={shop.isFavorite ? "fill" : "regular"} /></button>}</div>}
      {location === "outside" && <nav className="world-roam" aria-label="左右逛店"><button type="button" aria-label="返回上一家小店" disabled={!canPrevious || blocked || flowState === "delivering"} onClick={() => void hop("previous")}><ArrowLeft size={18} /></button><span>沿着灯光，慢慢逛</span><button type="button" aria-label="发现下一家小店" disabled={blocked || flowState === "delivering"} onClick={() => void hop("next")}><ArrowRight size={18} /></button></nav>}
    </>}
    {navigationBusy && <p className="world-notice" role="status">正在走向下一盏灯…</p>}
    <div className={`scene-transition ${transitioning ? "is-busy" : ""}`} ref={transitionLayer} aria-hidden="true" />
    <LetterPanel />
    {flowState === "delivering" && flight && <DeliveryAnimation flight={flight} />}
    {panel === "mail" && user && <ThreadMailbox key={user.id} userId={user.id} onClose={() => setPanel(undefined)} onRead={() => void session.refreshUnread()} />}
    {panel === "login" && <ShopDialog title="让心事有处寄达" eyebrow="使用你已有的 YQYHub 账号" onClose={() => setPanel(undefined)}><p className="shop-intro">登录后会为你留一家小店。在别人的灯下寄信，回自己的店里收信。</p>{!session.configured && <p className="mail-error" role="status">账号服务暂时没有连接好，稍后再来试试。草稿已留在这台设备。</p>}<button type="button" className="shop-primary" disabled={!session.configured} onClick={() => prepareLogin()}>使用 GitHub 登录</button></ShopDialog>}
    <MusicDock outside={location === "outside"} hidden={companionHidden} />
    <FocusBookmark outside={location === "outside"} hidden={companionHidden} />
  </main>;
}
