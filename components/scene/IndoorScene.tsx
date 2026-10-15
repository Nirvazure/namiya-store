"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, EnvelopeSimple, X } from "@phosphor-icons/react";
import { gsap } from "gsap";
import { indoorCounters, indoorItems, indoorLayers, type CounterId } from "@/domain/indoor";
import { useIndoorStore } from "@/store/useIndoorStore";
import { attachIndoorSnap } from "@/services/scene/indoorSnap";
import { IndoorCompanions } from "@/components/companions/SceneCompanions";
import { useCompanionStore } from "@/store/useCompanionStore";
import "./indoor-scene.css";

export { indoorEntryAssets } from "@/domain/indoor";

type Props = {
  active: boolean;
  blocked: boolean;
  envelopeReady: boolean;
  onExit: () => void;
  onWrite: () => void;
  onEditLetter: () => void;
  onConversationChange: (open: boolean) => void;
};

type Conversation = { counter: CounterId; kind: "talk" | "menu"; line: number };

export function IndoorScene({ active, blocked, envelopeReady, onExit, onWrite, onEditLetter, onConversationChange }: Props) {
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const dialogBox = useRef<HTMLDivElement>(null);
  const moveScene = useRef<(x: number, y: number) => void>(() => {});
  const navigate = useRef<(index: number) => void>(() => {});
  const cancelNavigation = useRef<() => void>(() => {});
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const currentCounter = useIndoorStore((state) => state.currentCounter);
  const orders = useIndoorStore((state) => state.orders);
  const paused = blocked || Boolean(conversation) || !active;
  const pauseRef = useRef(paused);
  const currentIndex = indoorCounters.findIndex((counter) => counter.id === currentCounter);
  const current = indoorCounters[currentIndex];
  const dialogCounter = conversation && indoorCounters.find((counter) => counter.id === conversation.counter);

  useEffect(() => {
    pauseRef.current = paused;
    if (paused && scroller.current) {
      cancelNavigation.current();
      moveScene.current(0, 0);
    }
  }, [paused]);

  useEffect(() => {
    const timers = Object.entries(orders).flatMap(([counter, order]) => order?.phase === "preparing" ? [window.setTimeout(() => useIndoorStore.getState().serve(counter as CounterId, order.readyAt), Math.max(0, order.readyAt - Date.now()))] : []);
    return () => timers.forEach(window.clearTimeout);
  }, [orders]);

  useEffect(() => {
    if (!active || !root.current || !scroller.current) return;
    const viewport = scroller.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pointerX = 0;
    let pointerY = 0;
    const layers = Array.from(root.current.querySelectorAll<HTMLElement>("[data-indoor-depth]"));
    const planes = layers.map((element) => {
      const depth = Number(element.dataset.indoorDepth);
      const duration = 1.3 - depth * .022;
      return { element, depth, index: Number(element.dataset.indoorIndex), x: gsap.quickTo(element, "x", { duration, ease: "power3.out" }), y: gsap.quickTo(element, "y", { duration: duration + .15, ease: "power3.out" }) };
    });
    function updateMotion() {
      const progress = viewport.scrollLeft / (viewport.clientWidth || 1);
      for (const plane of planes) {
        const local = Math.max(-1.2, Math.min(1.2, progress - plane.index));
        plane.x(reduced.matches ? 0 : pointerX * plane.depth - local * plane.depth * 1.6);
        plane.y(reduced.matches ? 0 : pointerY * plane.depth * .45);
      }
    }
    const initial = indoorCounters.findIndex((counter) => counter.id === useIndoorStore.getState().currentCounter);
    const snap = attachIndoorSnap(viewport, {
      count: indoorCounters.length,
      initialIndex: initial,
      isPaused: () => pauseRef.current,
      onSelect(index) {
        const id = indoorCounters[index].id;
        if (useIndoorStore.getState().currentCounter !== id) {
          useCompanionStore.getState().close();
          useIndoorStore.getState().setCounter(id);
        }
      },
      onMove: updateMotion,
    });
    navigate.current = snap.select;
    cancelNavigation.current = snap.cancel;
    moveScene.current = (x, y) => { pointerX = x; pointerY = y; updateMotion(); };
    viewport.addEventListener("scroll", updateMotion, { passive: true });
    reduced.addEventListener("change", updateMotion);
    return () => {
      snap.destroy();
      planes.forEach((plane) => { plane.x.tween.kill(); plane.y.tween.kill(); gsap.set(plane.element, { clearProps: "transform" }); });
      viewport.removeEventListener("scroll", updateMotion);
      reduced.removeEventListener("change", updateMotion);
      moveScene.current = () => {};
      navigate.current = () => {};
      cancelNavigation.current = () => {};
    };
  }, [active]);

  const dialogKey = conversation ? `${conversation.counter}-${conversation.kind}` : null;
  useEffect(() => {
    onConversationChange(Boolean(dialogKey));
    return () => onConversationChange(false);
  }, [dialogKey, onConversationChange]);
  useEffect(() => {
    if (!dialogKey) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogBox.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setConversation(null); }
      if (event.key === "Tab" && dialogBox.current) {
        const buttons = Array.from(dialogBox.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogBox.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("keydown", keydown); previous?.focus({ preventScroll: true }); };
  }, [dialogKey]);

  function handlePointer(event: PointerEvent<HTMLElement>) {
    if (paused || event.pointerType === "touch" || (event.target instanceof Element && event.target.closest("[data-companion-interactive]"))) return;
    const box = event.currentTarget.getBoundingClientRect();
    moveScene.current((event.clientX - box.left) / box.width * 2 - 1, (event.clientY - box.top) / box.height * 2 - 1);
  }

  function openConversation(next: Conversation) {
    useCompanionStore.getState().close();
    setConversation(next);
  }

  return (
    <section id="indoor-scene" ref={root} tabIndex={-1} className={`indoor-scene ${active ? "indoor-is-active" : ""} ${envelopeReady ? "indoor-has-envelope" : ""}`} aria-label="解忧杂货店内" aria-hidden={!active} inert={!active || blocked} onPointerMove={handlePointer} onPointerLeave={() => moveScene.current(0, 0)}>
      <div className="indoor-paper" aria-hidden="true" />
      <div className="indoor-content" inert={Boolean(conversation)}>
        <header className="indoor-header">
          <button data-indoor-exit className="indoor-back" type="button" onClick={onExit} disabled={blocked}><ArrowLeft size={18} /><span>返回街角</span></button>
          <p className="indoor-wordmark">解忧杂货店 <span>店内散步</span></p>
        </header>

        <div ref={scroller} className={`indoor-scroller ${paused ? "indoor-scroll-paused" : ""}`} aria-label="横向探索四个柜台" onTouchStart={() => moveScene.current(0, 0)}>
          {indoorCounters.map((counter, index) => {
            const order = orders[counter.id];
            const item = order && indoorItems[order.item];
            const isCurrent = counter.id === currentCounter;
            return <article key={counter.id} className={`indoor-panel indoor-panel-${counter.id}`} aria-label={counter.name} aria-hidden={!isCurrent} inert={!isCurrent}>
              <div className="indoor-panel-caption"><span className="indoor-eyebrow">{String(index + 1).padStart(2, "0")} / 四处小憩</span><h2>{counter.invitation}</h2><p>{counter.description}</p></div>
              <div className="indoor-artboard">
                <div className="indoor-art-shadow" aria-hidden="true" />
                {indoorLayers.map((layer) => <div className={`indoor-plane indoor-plane-${layer.name}`} data-indoor-depth={layer.depth} data-indoor-index={index} key={layer.name} aria-hidden="true"><Image src={`/indoor/optimized/${counter.id}/${layer.name}.webp`} alt="" fill sizes="(max-width: 700px) 112vw, 85vw" unoptimized loading={index === 0 ? "eager" : "lazy"} draggable={false} /></div>)}
                <div className="indoor-companion-plane" data-indoor-depth={indoorLayers.find(layer => layer.name === "counter")?.depth ?? 20.4} data-indoor-index={index}><IndoorCompanions counter={counter.id} /></div>
                <button className={`indoor-hotspot indoor-keeper-hotspot indoor-keeper-${counter.id}`} type="button" aria-label={`和${counter.keeper}聊聊`} onClick={() => openConversation({ counter: counter.id, kind: "talk", line: 0 })}><span className="indoor-hotspot-dot" /><span className="indoor-hotspot-label">和{counter.keeper}聊聊</span></button>
                {counter.id === "grandpa" ? <button className="indoor-hotspot indoor-writing-hotspot" type="button" onClick={envelopeReady ? onEditLetter : onWrite}><EnvelopeSimple size={19} /><span>{envelopeReady ? "展开信纸" : "写一封信"}</span></button> : <button className="indoor-hotspot indoor-menu-hotspot" type="button" onClick={() => openConversation({ counter: counter.id, kind: "menu", line: 0 })}><span>看看菜单</span><ArrowRight size={16} /></button>}
                {order && item && <div className={`indoor-order indoor-order-${order.phase}`} aria-live="polite">
                  {order.phase === "preparing" ? <div className="indoor-preparing"><span className="indoor-preparing-dot" /><p>{item.preparing}</p></div> : <>
                    <div className="indoor-served-item"><Image src={`/indoor/optimized/items/${order.item}.webp`} width={224} height={180} unoptimized alt={item.name} />{(order.item === "matcha" || order.item === "coffee") && <div className="indoor-steam" aria-hidden="true"><i /><i /><i /></div>}</div>
                    <div className="indoor-order-note"><p>{order.phase === "tasted" ? item.tasted : item.served}</p><div>{order.phase !== "tasted" && <button type="button" onClick={() => useIndoorStore.getState().taste(counter.id)}>{item.verb}</button>}<button type="button" onClick={() => useIndoorStore.getState().clear(counter.id)}>收起</button><button type="button" onClick={() => openConversation({ counter: counter.id, kind: "menu", line: 0 })}>再点一份</button></div></div>
                  </>}
                </div>}
              </div>
            </article>;
          })}
        </div>

        {envelopeReady && <div className="indoor-envelope-note"><EnvelopeSimple size={19} /><span>信已折好。去门外的红邮箱，把心事寄出去。</span><button type="button" onClick={onExit}>带上信，去寄出 <ArrowRight size={15} /></button></div>}
        <footer className="indoor-footer"><p className="indoor-scroll-hint"><span>↔</span> <span className="indoor-desktop-hint">滚动鼠标，慢慢逛</span><span className="indoor-touch-hint">左右滑动，慢慢逛</span></p><nav aria-label="选择柜台">{indoorCounters.map((counter, index) => <button key={counter.id} type="button" aria-current={currentCounter === counter.id ? "location" : undefined} onClick={() => navigate.current(index)}><span>{String(index + 1).padStart(2, "0")}</span>{counter.name}</button>)}</nav><p className="indoor-current-note" aria-live="polite">{current.name}</p></footer>
      </div>

      {conversation && dialogCounter && <div className="indoor-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setConversation(null); }}><div ref={dialogBox} className="indoor-dialog" role="dialog" aria-modal="true" aria-labelledby="indoor-dialog-title" tabIndex={-1}>
        <button className="indoor-dialog-close" type="button" aria-label="关闭对话" onClick={() => setConversation(null)}><X size={20} /></button>
        <span className="indoor-eyebrow">{conversation.kind === "talk" ? "柜台边的小对话" : "今日小菜单"}</span><h3 id="indoor-dialog-title">{dialogCounter.keeper}</h3>
        {conversation.kind === "talk" ? <><p className="indoor-dialog-words">「{dialogCounter.dialogues[conversation.line]}」</p><div className="indoor-dialog-actions"><button type="button" onClick={() => setConversation({ ...conversation, line: (conversation.line + 1) % dialogCounter.dialogues.length })}>再聊一句 <ArrowRight size={15} /></button>{dialogCounter.id === "grandpa" ? <button type="button" onClick={() => { setConversation(null); if (envelopeReady) onEditLetter(); else onWrite(); }}>{envelopeReady ? "展开我的信" : "我想写封信"}</button> : <button type="button" onClick={() => setConversation({ ...conversation, kind: "menu" })}>看看菜单</button>}</div></> : <><p className="indoor-menu-intro">选一份喜欢的，坐一会儿。店长请客。</p><div className="indoor-menu-items">{dialogCounter.items.map((id) => <button type="button" key={id} onClick={() => { useIndoorStore.getState().order(dialogCounter.id, id); setConversation(null); }}><Image src={`/indoor/optimized/items/${id}.webp`} alt="" width={96} height={80} unoptimized /><span><strong>{indoorItems[id].name}</strong><small>{indoorItems[id].detail}</small></span><ArrowRight size={18} /></button>)}</div></>}
      </div></div>}
    </section>
  );
}
