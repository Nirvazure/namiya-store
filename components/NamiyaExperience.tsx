"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { DeliveryAnimation, type MailFlight } from "@/components/letter/DeliveryAnimation";
import { LetterPanel } from "@/components/letter/LetterPanel";
import { ReplyPanel } from "@/components/letter/ReplyPanel";
import { CompanionRuntime } from "@/components/companions/CompanionRuntime";
import { FocusBookmark } from "@/components/companions/FocusBookmark";
import { MusicDock } from "@/components/music/MusicDock";
import { ExteriorScene } from "@/components/scene/ExteriorScene";
import { IndoorScene } from "@/components/scene/IndoorScene";
import { deliverPreparedLetter } from "@/services/letters/deliverLetter";
import { preloadIndoorEntry } from "@/services/scene/preloadIndoor";
import { useAppStore } from "@/store/useAppStore";
import { useLetterStore } from "@/store/useLetterStore";
import { useCompanionStore } from "@/store/useCompanionStore";

export function NamiyaExperience() {
  const hydrateApp = useAppStore(state => state.hydrate);
  const flowState = useLetterStore(state => state.flowState);
  const mailboxState = useLetterStore(state => state.mailboxState);
  const reply = useLetterStore(state => state.reply);
  const error = useLetterStore(state => state.error);
  const hydrateRecent = useLetterStore(state => state.hydrateRecent);
  const [flight, setFlight] = useState<MailFlight>();
  const [location, setLocation] = useState<"outside" | "inside">("outside");
  const [hasEntered, setHasEntered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [entryError, setEntryError] = useState<string>();
  const [conversationOpen, setConversationOpen] = useState(false);
  const transitionLock = useRef(false);
  const focusAfterTransition = useRef(false);
  const transitionLayer = useRef<HTMLDivElement>(null);
  const transitionTimeline = useRef<gsap.core.Timeline | null>(null);
  const alive = useRef(true);
  const sending = useRef(false);
  const hasReply = mailboxState === "hasReply" || flowState === "replyReady";
  const letterOpen = flowState === "letterWriting" || flowState === "characterSelecting" || flowState === "privacySelecting" || flowState === "replyReading";
  const companionHidden = letterOpen || transitioning || flowState === "delivering" || (location === "inside" && conversationOpen);

  useEffect(() => { hydrateApp(); hydrateRecent(); }, [hydrateApp, hydrateRecent]);
  useEffect(() => useLetterStore.subscribe((state, previous) => {
    if (state.flowState !== previous.flowState) useCompanionStore.getState().close();
  }), []);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; transitionTimeline.current?.kill(); };
  }, []);
  useEffect(() => {
    if (transitioning || !focusAfterTransition.current) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(location === "inside" ? "#indoor-scene" : ".shop-entry-door")?.focus({ preventScroll: true });
      focusAfterTransition.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location, transitioning]);

  async function changeScene(next: "outside" | "inside") {
    if (transitionLock.current || next === location || letterOpen || flowState === "delivering") return;
    useCompanionStore.getState().close();
    transitionLock.current = true;
    focusAfterTransition.current = true;
    setTransitioning(true);
    setEntryError(undefined);
    if (next === "inside") {
      try { await preloadIndoorEntry(); }
      catch {
        if (!alive.current) return;
        setEntryError("店里的灯还没亮好。请再点一次门试试。");
        setTransitioning(false);
        focusAfterTransition.current = false;
        transitionLock.current = false;
        return;
      }
      if (!alive.current) return;
      setHasEntered(true);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? .1 : .55;
    const timeline = gsap.timeline({ onComplete: () => {
      if (!alive.current) return;
      setTransitioning(false);
      transitionLock.current = false;
    } });
    transitionTimeline.current = timeline;
    if (next === "inside" && !reduced) timeline.to(".shop-perspective", { scale: 1.18, xPercent: -2, yPercent: -5, duration, ease: "power2.in" }, 0);
    timeline.to(transitionLayer.current, { opacity: 1, duration, ease: "power2.inOut" }, 0)
      .call(() => { setLocation(next); gsap.set(".shop-perspective", { scale: 1, xPercent: 0, yPercent: 0 }); })
      .to(transitionLayer.current, { opacity: 0, duration: reduced ? .1 : .5, delay: .12, ease: "power2.out" });
  }

  function openMailbox() {
    const letter = useLetterStore.getState();
    if (letter.flowState === "delivering" || sending.current) return;
    useAppStore.getState().completeIntro();
    if (letter.flowState === "envelopeReady") {
      const envelope = document.querySelector(".held-envelope")?.getBoundingClientRect();
      const slot = document.querySelector(".mail-slot-flap")?.getBoundingClientRect();
      if (slot) {
        setFlight({ from: { x: envelope ? envelope.left + envelope.width / 2 : window.innerWidth * .5, y: envelope ? envelope.top + envelope.height / 2 : window.innerHeight * .7 }, to: { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2 }, slotWidth: slot.width });
      }
      sending.current = true;
      void deliverPreparedLetter().finally(() => { sending.current = false; });
    } else if (letter.reply && (letter.mailboxState === "hasReply" || letter.flowState === "replyReady")) letter.openReply();
    else letter.openLetter();
  }

  return (
    <main className="namiya-world" id="street">
      <div className="scene-layer" hidden={location !== "outside"} inert={location !== "outside" || transitioning || letterOpen}>
        <ExteriorScene flowState={flowState} hasReply={hasReply} error={error} onOpenMailbox={openMailbox} onEditLetter={() => useLetterStore.getState().openLetter()} onEnter={() => void changeScene("inside")} onPrepareEntry={() => { void preloadIndoorEntry().catch(() => {}); }} entering={transitioning} entryError={entryError} />
      </div>
      {hasEntered ? <div className="scene-layer" hidden={location !== "inside"} inert={location !== "inside" || transitioning || letterOpen}>
        <IndoorScene active={location === "inside"} blocked={letterOpen || transitioning} envelopeReady={flowState === "envelopeReady"} onExit={() => void changeScene("outside")} onWrite={() => { useLetterStore.getState().setSelectedCharacter("grandpa"); useLetterStore.getState().openLetter(); }} onEditLetter={() => useLetterStore.getState().openLetter()} onConversationChange={setConversationOpen} />
      </div> : null}
      <div className={`scene-transition ${transitioning ? "is-busy" : ""}`} ref={transitionLayer} aria-hidden="true" />
      <LetterPanel />
      {flowState === "delivering" && flight ? <DeliveryAnimation flight={flight} /> : null}
      {flowState === "replyReading" && reply ? <ReplyPanel onClose={() => useLetterStore.getState().resetLetter()} reply={reply} /> : null}
      <CompanionRuntime />
      <MusicDock outside={location === "outside"} hidden={companionHidden} />
      <FocusBookmark outside={location === "outside"} hidden={companionHidden} />
    </main>
  );
}
