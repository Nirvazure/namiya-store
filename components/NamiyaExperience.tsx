"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { EnvelopeSimple, Storefront, SignOut, MapTrifold } from "@phosphor-icons/react";
import { DeliveryAnimation, type MailFlight } from "@/components/letter/DeliveryAnimation";
import { LetterPanel } from "@/components/letter/LetterPanel";
import { ReplyPanel } from "@/components/letter/ReplyPanel";
import { ThreadMailbox } from "@/components/letter/ThreadMailbox";
import { ShopDirectory } from "@/components/shops/ShopDirectory";
import { ShopEditor } from "@/components/shops/ShopEditor";
import { ShopDialog } from "@/components/shops/ShopDialog";
import { FocusBookmark } from "@/components/companions/FocusBookmark";
import { MusicDock } from "@/components/music/MusicDock";
import { ExteriorScene } from "@/components/scene/ExteriorScene";
import { IndoorScene } from "@/components/scene/IndoorScene";
import { deliverPreparedLetter } from "@/services/letters/deliverLetter";
import { preloadIndoorEntry } from "@/services/scene/preloadIndoor";
import { api, errorMessage } from "@/services/api/client";
import { prepareLogin } from "@/services/auth/login";
import { defaultShop, getSystemShop, systemShops, type Shop, type SessionResponse, type CurrentUser } from "@/domain/shops";
import { isLetterReply, type LetterReply } from "@/domain/letterTypes";
import type { ThreadListResponse } from "@/domain/threads";
import { useLocalSnapshot } from "@/services/storage/useLocalSnapshot";
import { useAppStore } from "@/store/useAppStore";
import { useLetterStore } from "@/store/useLetterStore";
import { useMusicStore } from "@/store/useMusicStore";
import { useCompanionStore } from "@/store/useCompanionStore";

type Panel = "directory" | "editor" | "mail" | "login" | "legacy";

export function NamiyaExperience({ initialShopId = "grandpa" }: { initialShopId?: string }) {
  const router = useRouter();
  const [shop, setShop] = useState<Shop>(getSystemShop(initialShopId) ?? defaultShop);
  const [shops, setShops] = useState<Shop[]>(systemShops);
  const [shopLoading, setShopLoading] = useState(!getSystemShop(initialShopId));
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [panel, setPanel] = useState<Panel>();
  const [loginNext, setLoginNext] = useState<string>();
  const [notice, setNotice] = useState("");
  const [unread, setUnread] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const oldSnapshot = useLocalSnapshot("namiya.recent-letter");
  let legacy: LetterReply | undefined;
  try { const old = oldSnapshot ? JSON.parse(oldSnapshot) : null; if (isLetterReply(old?.reply)) legacy = old.reply; } catch { /* Ignore malformed legacy data. */ }
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
  const flowState = useLetterStore(state => state.flowState);
  const error = useLetterStore(state => state.error);
  const letterOpen = ["letterWriting", "characterSelecting", "privacySelecting", "replyReading"].includes(flowState);
  const blocked = Boolean(panel) || letterOpen || transitioning;
  const companionHidden = blocked || flowState === "delivering" || (location === "inside" && conversationOpen);

  const loadShops = useCallback(async () => {
    try { const result = await api<{ shops: Shop[] }>("/api/shops"); if (alive.current) setShops([...systemShops, ...result.shops.filter(item => !getSystemShop(item.id))]); }
    catch { /* The four local scene pairs remain browsable while the service is unavailable. */ }
  }, []);
  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try { const result = await api<ThreadListResponse>("/api/threads?box=all"); if (alive.current) setUnread(result.threads.some(thread => thread.unread)); } catch { /* No disruptive error while focusing. */ }
  }, [user]);

  useEffect(() => {
    alive.current = true;
    useAppStore.getState().hydrate(); useLetterStore.getState().hydrateRecent();
    void api<{ shops: Shop[] }>("/api/shops").then(result => { if (alive.current) setShops([...systemShops, ...result.shops.filter(item => !getSystemShop(item.id))]); }).catch(() => {});
    const controller = new AbortController();
    void api<SessionResponse>("/api/me", { signal: controller.signal }).then(session => {
      setUser(session.user); setConfigured(session.configured); setSessionReady(true);
      const open = new URLSearchParams(window.location.search).get("open");
      if (open === "shop" || open === "mail") setPanel(session.user ? open === "shop" ? "editor" : "mail" : "login");
      const authError = new URLSearchParams(window.location.search).get("error");
      if (authError) setNotice("这次登录没有完成，请重新试一次。草稿仍在这台设备。");
    }).catch(error => { if (!controller.signal.aborted) { setSessionReady(true); setConfigured(false); setNotice(errorMessage(error)); } });
    return () => { alive.current = false; controller.abort(); transitionTimeline.current?.kill(); };
  }, [loadShops]);
  useEffect(() => useLetterStore.subscribe((state, previous) => { if (state.flowState !== previous.flowState) useCompanionStore.getState().close(); }), []);
  useEffect(() => {
    let cancelled = false;
    const local = getSystemShop(initialShopId);
    if (local) return;
    void api<{ shop: Shop }>(`/api/shops/${encodeURIComponent(initialShopId)}`).then(result => { if (!cancelled) { setShop(result.shop); setShopLoading(false); } }).catch(error => { if (!cancelled) { setShop(defaultShop); setShopLoading(false); setNotice(errorMessage(error)); } });
    return () => { cancelled = true; };
  }, [initialShopId]);
  useEffect(() => {
    useLetterStore.getState().setContext(user?.id ?? null, shop);
    useMusicStore.getState().applyShopDefault(shop.id, shop.musicTrackId);
    if (user && sessionReady) {
      try {
        const raw = window.sessionStorage.getItem("namiya.login-draft");
        if (raw) {
          const carried = JSON.parse(raw);
          if (carried.shopId === shop.id && typeof carried.draft?.body === "string" && typeof carried.draft?.title === "string") {
            const existing = useLetterStore.getState();
            if (!existing.draft.body) { existing.updateDraft({ title: carried.draft.title, body: carried.draft.body }); existing.setSignature(typeof carried.signature === "string" ? carried.signature : ""); }
            window.sessionStorage.removeItem("namiya.login-draft");
          }
        }
      } catch { /* Browser draft storage is optional. */ }
    }
  }, [shop, user, sessionReady]);
  useEffect(() => {
    if (!user) return;
    void api<ThreadListResponse>("/api/threads?box=all").then(result => { if (alive.current) setUnread(result.threads.some(thread => thread.unread)); }).catch(() => {});
    const timer = window.setInterval(() => { if (!document.hidden) void refreshUnread(); }, 45_000);
    return () => window.clearInterval(timer);
  }, [refreshUnread, user]);

  async function changeScene(next: "outside" | "inside") {
    if (transitionLock.current || next === location || letterOpen || flowState === "delivering" || panel) return;
    useCompanionStore.getState().close();
    transitionLock.current = true; setTransitioning(true); setEntryError(undefined);
    if (next === "inside") {
      try { await preloadIndoorEntry(shop); }
      catch { if (alive.current) { setEntryError("店里的灯还没亮好。请再点一次门试试。"); setTransitioning(false); transitionLock.current = false; } return; }
      if (!alive.current) return;
      setHasEntered(true);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? .1 : .45;
    const timeline = gsap.timeline({ onComplete: () => {
      if (!alive.current) return;
      setTransitioning(false); transitionLock.current = false;
      requestAnimationFrame(() => document.querySelector<HTMLElement>(next === "inside" ? "#indoor-scene" : ".shop-entry-door")?.focus({ preventScroll: true }));
    } });
    transitionTimeline.current = timeline;
    timeline.to(transitionLayer.current, { opacity: 1, duration, ease: "power2.inOut" }).call(() => setLocation(next)).to(transitionLayer.current, { opacity: 0, duration, delay: .1 });
  }
  function openLetter() {
    if (shop.isOwner) { setPanel("mail"); setThreadId(undefined); return; }
    if (!shop.acceptingLetters) { setNotice(shop.kind === "demo" ? "这家小店暂时只供小憩。想写信的话，爷爷的灯还亮着。" : "店主暂时暂停接收新来信，已有往来仍可在信箱继续。"); return; }
    if (!sessionReady) { setNotice("正在确认你的登录状态，请稍等一下。"); return; }
    useLetterStore.getState().openLetter();
  }
  function openMailbox() {
    const letter = useLetterStore.getState();
    if (letter.flowState === "delivering" || sending.current) return;
    useAppStore.getState().completeIntro();
    if (letter.flowState !== "envelopeReady") { openLetter(); return; }
    if (!user) { setPanel("login"); return; }
    const envelope = document.querySelector(".held-envelope")?.getBoundingClientRect();
    const slot = (document.querySelector(".mail-slot-flap") ?? document.querySelector("#scene-mailbox"))?.getBoundingClientRect();
    if (slot) setFlight({ from: { x: envelope ? envelope.left + envelope.width / 2 : innerWidth * .5, y: envelope ? envelope.top + envelope.height / 2 : innerHeight * .7 }, to: { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2 }, slotWidth: slot.width });
    sending.current = true;
    void deliverPreparedLetter().then(result => { if (result && alive.current) { setThreadId(result.thread.id); setPanel("mail"); } }).finally(() => { sending.current = false; setFlight(undefined); });
  }
  function visit(nextShop: Shop) {
    useCompanionStore.getState().close();
    setPanel(undefined); setNotice(""); setLocation("outside"); setHasEntered(false); setShop(nextShop);
    router.push(`/shops/${encodeURIComponent(nextShop.id)}`, { scroll: false });
  }
  async function signOut() {
    try {
      await api("/api/auth/signout", { method: "POST" });
      setPanel(undefined); setThreadId(undefined); setUnread(false); setUser(null);
      useLetterStore.getState().setContext(null, shop);
      setShops(current => current.map(item => ({ ...item, isOwner: false }))); setShop(current => ({ ...current, isOwner: false }));
    } catch (error) { setNotice(errorMessage(error)); }
  }
  function accountPanel(next: "mail" | "editor") { useCompanionStore.getState().close(); setThreadId(undefined); setLoginNext(`${window.location.pathname}?open=${next === "editor" ? "shop" : "mail"}`); setPanel(user ? next : "login"); }

  return <main className="namiya-world" id="street">
    <nav className="world-navigation" aria-label="小店与我的往来" inert={blocked || flowState === "delivering"}>
      <button type="button" onClick={() => setPanel("directory")}><MapTrifold size={16} />逛逛小店</button>
      <button type="button" onClick={() => accountPanel("editor")}><Storefront size={16} />我的小店</button>
      <button type="button" onClick={() => accountPanel("mail")}><EnvelopeSimple size={16} />信箱{unread && <span className="unread-dot" aria-label="有未读来信" />}</button>
      {legacy && <button type="button" onClick={() => setPanel("legacy")}>本机旧信</button>}
      {user ? <><span className="account-name">{user.displayName}</span><button type="button" aria-label="退出本站登录" onClick={() => void signOut()}><SignOut size={16} />退出</button></> : <button className="account-name" type="button" onClick={() => setPanel("login")} disabled={!sessionReady}>登录</button>}
    </nav>
    {notice && !panel && !letterOpen && <p className="world-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="收起提示"> ×</button></p>}
    {shopLoading ? <p className="shop-empty" role="status">正在寻找那家小店…</p> : <>
      <div className="scene-layer" hidden={location !== "outside"} inert={location !== "outside" || blocked}>
        <ExteriorScene key={shop.id} shop={shop} flowState={flowState} hasReply={false} error={error} onOpenMailbox={openMailbox} onEditLetter={openLetter} userCenter={{ user: user ? { nickname: user.displayName, avatarUrl: user.avatarUrl ?? undefined } : undefined, onOpenAccount: () => accountPanel("editor") }} onEnter={() => void changeScene("inside")} onPrepareEntry={() => { void preloadIndoorEntry(shop).catch(() => {}); }} entering={transitioning} entryError={entryError} />
      </div>
      {hasEntered && <div className="scene-layer" hidden={location !== "inside"} inert={location !== "inside" || blocked}><IndoorScene key={shop.id} shop={shop} active={location === "inside"} blocked={blocked} envelopeReady={flowState === "envelopeReady"} onExit={() => void changeScene("outside")} onWrite={openLetter} onEditLetter={openLetter} onConversationChange={setConversationOpen} /></div>}
    </>}
    <div className={`scene-transition ${transitioning ? "is-busy" : ""}`} ref={transitionLayer} aria-hidden="true" />
    <LetterPanel />
    {flowState === "delivering" && flight && <DeliveryAnimation flight={flight} />}
    {panel === "directory" && <ShopDirectory shops={shops} onVisit={visit} onClose={() => setPanel(undefined)} />}
    {panel === "editor" && user && <ShopEditor onClose={() => setPanel(undefined)} onPublished={published => { void loadShops(); visit(published); }} />}
    {panel === "mail" && user && <ThreadMailbox key={user.id} userId={user.id} initialThreadId={threadId} onClose={() => setPanel(undefined)} onRead={() => void refreshUnread()} />}
    {panel === "legacy" && legacy && <ReplyPanel reply={legacy} onClose={() => setPanel(undefined)} />}
    {panel === "login" && <ShopDialog title="让心事有处寄达" eyebrow="使用你已有的 YQYHub 账号" onClose={() => setPanel(undefined)}><p className="shop-intro">登录后可以寄信、保存往来，或开一家自己的小店。你也可以继续在这里听音乐、专注片刻。</p>{!configured && <p className="mail-error" role="status">账号服务暂时没有连接好，稍后再来试试。你的草稿已留在这台设备。</p>}<button type="button" className="shop-primary" disabled={!configured} onClick={() => prepareLogin(loginNext)}>使用 GitHub 登录</button></ShopDialog>}
    <MusicDock outside={location === "outside"} hidden={companionHidden} />
    <FocusBookmark outside={location === "outside"} hidden={companionHidden} />
  </main>;
}
