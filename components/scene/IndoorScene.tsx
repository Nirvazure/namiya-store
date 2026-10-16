"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, EnvelopeSimple, X } from "@phosphor-icons/react";
import { gsap } from "gsap";
import { indoorCounters, indoorItems, indoorLayers, type CounterId } from "@/domain/indoor";
import { defaultShop, sceneImageStyle, type Shop } from "@/domain/shops";
import { useIndoorStore } from "@/store/useIndoorStore";
import { IndoorCompanions } from "@/components/companions/SceneCompanions";
import { useCompanionStore } from "@/store/useCompanionStore";
import "./indoor-scene.css";
import "@/components/shops/shops.css";

export { indoorEntryAssets } from "@/domain/indoor";

type Props = {
  shop?: Shop;
  active: boolean;
  blocked: boolean;
  envelopeReady: boolean;
  onExit: () => void;
  onWrite: () => void;
  onEditLetter: () => void;
  onConversationChange: (open: boolean) => void;
};
type Conversation = { counter: CounterId; kind: "talk" | "menu"; line: number };

export function IndoorScene({ shop = defaultShop, active, blocked, envelopeReady, onExit, onWrite, onEditLetter, onConversationChange }: Props) {
  const root = useRef<HTMLElement>(null);
  const dialogBox = useRef<HTMLDivElement>(null);
  const moveScene = useRef<(x: number, y: number) => void>(() => {});
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const orders = useIndoorStore(state => state.orders);
  const paused = blocked || Boolean(conversation) || !active;
  const scene = shop.scenes.indoor;
  const counter = indoorCounters.find(item => item.id === scene.templateId) ?? indoorCounters[0];
  const layered = scene.mode === "layers" && Boolean(scene.templateId);
  const order = layered ? orders[counter.id] : undefined;
  const item = order && indoorItems[order.item];
  const dialogCounter = conversation && indoorCounters.find(item => item.id === conversation.counter);

  useEffect(() => {
    const timers = Object.entries(orders).flatMap(([id, entry]) => entry?.phase === "preparing" ? [window.setTimeout(() => useIndoorStore.getState().serve(id as CounterId, entry.readyAt), Math.max(0, entry.readyAt - Date.now()))] : []);
    return () => timers.forEach(window.clearTimeout);
  }, [orders]);

  useEffect(() => {
    if (!active || !layered || !root.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const planes = Array.from(root.current.querySelectorAll<HTMLElement>("[data-indoor-depth]")).map(element => {
      const depth = Number(element.dataset.indoorDepth);
      return { element, depth, x: gsap.quickTo(element, "x", { duration: 1, ease: "power3.out" }), y: gsap.quickTo(element, "y", { duration: 1.2, ease: "power3.out" }) };
    });
    moveScene.current = (x, y) => planes.forEach(plane => { plane.x(reduced.matches ? 0 : x * plane.depth); plane.y(reduced.matches ? 0 : y * plane.depth * .45); });
    return () => { planes.forEach(plane => { plane.x.tween.kill(); plane.y.tween.kill(); gsap.set(plane.element, { clearProps: "transform" }); }); moveScene.current = () => {}; };
  }, [active, layered, shop.id, scene.templateId]);

  useEffect(() => { if (paused) moveScene.current(0, 0); }, [paused]);

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

  return <section id="indoor-scene" ref={root} tabIndex={-1} className={`indoor-scene single-shop-indoor ${active ? "indoor-is-active" : ""} ${envelopeReady ? "indoor-has-envelope" : ""}`} aria-label={`${shop.name}店内`} aria-hidden={!active} inert={!active || blocked} onPointerMove={handlePointer} onPointerLeave={() => moveScene.current(0, 0)}>
    <div className="indoor-paper" aria-hidden="true" />
    <div className="indoor-content" inert={Boolean(conversation)}>
      <header className="indoor-header">
        <button data-indoor-exit className="indoor-back" type="button" onClick={onExit} disabled={blocked}><ArrowLeft size={18} /><span>返回店门前</span></button>
        <p className="indoor-wordmark">{shop.name}<span>在这里，慢一点</span></p>

      </header>
      <div className="indoor-scroller indoor-scroll-paused" aria-label="当前小店的室内场景">
        <article className={`indoor-panel indoor-panel-${counter.id}`}>
          <div className="indoor-panel-caption"><span className="indoor-eyebrow">{shop.kind === "system" ? "一封信，一盏灯" : "此刻，只在这家小店"}</span><h2>{layered ? counter.invitation : "进来了，就坐一会儿吧。"}</h2><p>{shop.description || "让心事慢慢落在纸上。"}</p></div>
          <div className="indoor-artboard">
            {layered ? <><div className="indoor-art-shadow" aria-hidden="true" />{indoorLayers.map(layer => <div className={`indoor-plane indoor-plane-${layer.name}`} data-indoor-depth={layer.depth} key={layer.name} aria-hidden="true"><Image src={`/indoor/optimized/${counter.id}/${layer.name}.webp`} alt="" fill sizes="(max-width: 700px) 112vw, 85vw" unoptimized loading="eager" draggable={false} /></div>)}
              <button className={`indoor-hotspot indoor-keeper-hotspot indoor-keeper-${counter.id}`} type="button" aria-label={`和${counter.keeper}聊聊`} onClick={() => openConversation({ counter: counter.id, kind: "talk", line: 0 })}><span className="indoor-hotspot-dot" /><span className="indoor-hotspot-label">和{counter.keeper}聊聊</span></button>
              {counter.id === "grandpa" ? <button className="indoor-hotspot indoor-writing-hotspot" type="button" onClick={envelopeReady ? onEditLetter : onWrite} disabled={!shop.acceptingLetters && !envelopeReady}><EnvelopeSimple size={19} /><span>{envelopeReady ? "展开信纸" : "写一封信"}</span></button> : <button className="indoor-hotspot indoor-menu-hotspot" type="button" onClick={() => openConversation({ counter: counter.id, kind: "menu", line: 0 })}><span>看看菜单</span><ArrowRight size={16} /></button>}
            </> : <div className="indoor-plane whole-indoor-picture"><Image src={scene.src} alt={`${shop.name}的室内场景`} fill unoptimized style={sceneImageStyle(scene)} sizes="(max-width: 700px) 112vw, 85vw" /></div>}
            <div className="indoor-companion-plane" data-indoor-depth={indoorLayers.find(layer => layer.name === "counter")?.depth ?? 20.4}><IndoorCompanions counter={counter.id} /></div>
            {order && item && <div className={`indoor-order indoor-order-${order.phase}`} aria-live="polite">{order.phase === "preparing" ? <div className="indoor-preparing"><span className="indoor-preparing-dot" /><p>{item.preparing}</p></div> : <><div className="indoor-served-item"><Image src={`/indoor/optimized/items/${order.item}.webp`} width={224} height={180} unoptimized alt={item.name} />{(order.item === "matcha" || order.item === "coffee") && <div className="indoor-steam" aria-hidden="true"><i /><i /><i /></div>}</div><div className="indoor-order-note"><p>{order.phase === "tasted" ? item.tasted : item.served}</p><div>{order.phase !== "tasted" && <button type="button" onClick={() => useIndoorStore.getState().taste(counter.id)}>{item.verb}</button>}<button type="button" onClick={() => useIndoorStore.getState().clear(counter.id)}>收起</button><button type="button" onClick={() => openConversation({ counter: counter.id, kind: "menu", line: 0 })}>再点一份</button></div></div></>}</div>}
          </div>
        </article>
      </div>
      {envelopeReady && <div className="indoor-envelope-note"><EnvelopeSimple size={19} /><span>信已折好。带到门外，亲手寄出。</span><button type="button" onClick={onExit}>带上信，去寄出 <ArrowRight size={15} /></button></div>}
      <footer className="indoor-footer single-shop-footer"><p>门外与门内，都是{shop.name}。</p><button className="shop-letter-button" type="button" onClick={envelopeReady ? onEditLetter : onWrite} disabled={!shop.acceptingLetters && !envelopeReady}><EnvelopeSimple size={18} />{envelopeReady ? "展开信纸" : shop.acceptingLetters ? "写一封信" : "今日歇信，安心小坐"}</button></footer>
    </div>
    {conversation && dialogCounter && <div className="indoor-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) setConversation(null); }}><div ref={dialogBox} className="indoor-dialog" role="dialog" aria-modal="true" aria-labelledby="indoor-dialog-title" tabIndex={-1}>
      <button className="indoor-dialog-close" type="button" aria-label="关闭对话" onClick={() => setConversation(null)}><X size={20} /></button><span className="indoor-eyebrow">{conversation.kind === "talk" ? "柜台边的小对话" : "今日小菜单"}</span><h3 id="indoor-dialog-title">{dialogCounter.keeper}</h3>
      {conversation.kind === "talk" ? <><p className="indoor-dialog-words">「{dialogCounter.dialogues[conversation.line]}」</p><div className="indoor-dialog-actions"><button type="button" onClick={() => setConversation({ ...conversation, line: (conversation.line + 1) % dialogCounter.dialogues.length })}>再聊一句 <ArrowRight size={15} /></button>{dialogCounter.id === "grandpa" ? <button type="button" disabled={!shop.acceptingLetters && !envelopeReady} onClick={() => { setConversation(null); if (envelopeReady) onEditLetter(); else onWrite(); }}>{envelopeReady ? "展开我的信" : "我想写封信"}</button> : <button type="button" onClick={() => setConversation({ ...conversation, kind: "menu" })}>看看菜单</button>}</div></> : <><p className="indoor-menu-intro">选一份喜欢的，坐一会儿。店长请客。</p><div className="indoor-menu-items">{dialogCounter.items.map(id => <button type="button" key={id} onClick={() => { useIndoorStore.getState().order(dialogCounter.id, id); setConversation(null); }}><Image src={`/indoor/optimized/items/${id}.webp`} alt="" width={96} height={80} unoptimized /><span><strong>{indoorItems[id].name}</strong><small>{indoorItems[id].detail}</small></span><ArrowRight size={18} /></button>)}</div></>}
    </div></div>}
  </section>;
}
