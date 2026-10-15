"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";
import { gsap } from "gsap";
import type { LetterFlowState } from "@/domain/letterTypes";
import layers from "@/public/joy_store_parallax/optimized/layers.json";
import { useSceneEnvironment } from "@/components/scene/useSceneEnvironment";
import { ExteriorCompanions } from "@/components/companions/SceneCompanions";
import { UserCenterEntry, type UserCenterEntryProps } from "@/components/scene/UserCenterEntry";

const assets = "/joy_store_parallax/optimized/";
const partDepths: Record<string, number> = { roof_antenna: .9, roof_tiles: .2, upper_window: .2, sign_cola: .35, sign_shop: .3, awning: .6, ground_floor: 0, bicycle: .75, air_conditioner: .3, poster: .2, plants: .8 };

type Props = {
  flowState: LetterFlowState;
  hasReply: boolean;
  error?: string;
  onOpenMailbox: () => void;
  onEditLetter: () => void;
  onEnter: () => void;
  onPrepareEntry: () => void;
  entering: boolean;
  entryError?: string;
  userCenter?: UserCenterEntryProps;
};

export function ExteriorScene({ flowState, hasReply, error, onOpenMailbox, onEditLetter, onEnter, onPrepareEntry, entering, entryError, userCenter }: Props) {
  const root = useRef<HTMLElement>(null);
  const mailbox = useRef<HTMLButtonElement>(null);
  const moveScene = useRef<(x: number, y: number) => void>(() => {});
  const environment = useSceneEnvironment();
  const phase = environment?.phase ?? "pending";
  const condition = environment?.condition ?? "unknown";
  const ready = flowState === "envelopeReady";
  const delivering = flowState === "delivering";
  const paused = flowState === "letterWriting" || flowState === "replyReading" || delivering || entering;

  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const planes = gsap.utils.toArray<HTMLElement>("[data-depth]").map((element) => {
          const depth = Number(element.dataset.depth);
          const duration = depth > 35 ? .48 : 1.1;
          return { depth, x: gsap.quickTo(element, "x", { duration, ease: "power3.out" }), y: gsap.quickTo(element, "y", { duration, ease: "power3.out" }) };
        });
        const turn = gsap.quickTo(".shop-perspective", "rotationY", { duration: 1, ease: "power3.out" });
        const tilt = gsap.quickTo(".shop-perspective", "rotationX", { duration: 1, ease: "power3.out" });
        moveScene.current = (x, y) => {
          for (const plane of planes) { plane.x(x * plane.depth); plane.y(y * plane.depth * .48); }
          turn(x * 2.1); tilt(-y * 1.2);
        };
        gsap.fromTo(".shop-reveal", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.4, ease: "power2.out" });
        gsap.fromTo(".scene-introduction", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1, delay: .25 });
      }, root);
      return () => { moveScene.current = () => {}; ctx.revert(); };
    });
    return () => media.revert();
  }, []);

  useEffect(() => {
    if (ready) mailbox.current?.focus({ preventScroll: true });
  }, [ready]);

  function handlePointer(event: PointerEvent<HTMLElement>) {
    if (paused || (event.pointerType === "touch" && event.buttons === 0)) return;
    const box = event.currentTarget.getBoundingClientRect();
    moveScene.current(Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1)), Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1)));
  }

  const mailboxLabel = delivering ? "信件投递中" : ready ? "点击邮箱，投递这封信" : hasReply ? "邮箱有回信，点击取信" : "点击邮箱，取一张信纸";

  return (
    <section className={`interactive-street ${ready ? "letter-is-ready" : ""} ${delivering ? "is-delivering" : ""}`} data-phase={phase} data-weather={condition} ref={root} onPointerMove={handlePointer} onPointerLeave={() => { if (!paused) moveScene.current(0, 0); }} aria-label="解忧杂货店互动场景">
      <div className="street-sky sky-dusk" aria-hidden="true" />
      <div className="street-sky sky-morning" aria-hidden="true" />
      <div className="street-sky sky-day" aria-hidden="true" />
      <div className="scene-paper-grain" aria-hidden="true" />
      <div className="ambient-haze" data-depth="-10" aria-hidden="true" />
      <div className="watercolor-cloud cloud-left" data-depth="-15" aria-hidden="true" />
      <div className="watercolor-cloud cloud-right" data-depth="-8" aria-hidden="true" />
      <div className="ambient-moon" data-depth="-5" aria-hidden="true" />
      <div className="ambient-stars" data-depth="-7" aria-hidden="true" />
      <div className="weather-wash" aria-hidden="true" />
      <div className="weather-mist" aria-hidden="true" />
      <div className="weather-precipitation" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index} style={{ "--particle-x": `${(index * 43 + 7) % 100}%`, "--particle-delay": `${-(index * .73)}s`, "--particle-speed": `${.85 + (index % 5) * .18}`, "--particle-opacity": .2 + (index % 4) * .1 } as CSSProperties} />)}
      </div>

      <header className="scene-header">
        <a className="store-brand" href="#street" aria-label="解忧杂货店"><span className="brand-mark">解</span><span>解忧杂货店<small lang="en">Namiya General Store</small></span></a>
        <div className="scene-header-actions">
          <UserCenterEntry {...userCenter} />
        </div>
      </header>

      <div className="scene-introduction">
        <p className="scene-salutation">此地，此刻</p>
        <h1 className="scene-place-name" title={environment?.placeName}>{environment?.placeName ?? (environment?.live ? "所在地天气" : "本地时间")}</h1>
        <p className="scene-weather-reading"><span>{environment?.weatherLabel ?? "感受此刻…"}</span>{environment?.temperature !== undefined && <span className="scene-temperature">{Math.round(environment.temperature)}<small>°C</small></span>}</p>
        <p className="scene-local-time">{environment ? <>{environment.phaseLabel} · {environment.timeSource} <time>{environment.localTime}</time></> : "正在感受此刻的光线"}</p>
        {hasReply && <p className="scene-reply-reminder">邮箱里，多了一封回信。</p>}
        <button className="scene-write-link" onClick={hasReply ? onOpenMailbox : onEnter} onPointerEnter={onPrepareEntry} onFocus={onPrepareEntry} disabled={delivering || entering} type="button">{hasReply ? "取出你的回信" : entering ? "正在开门…" : "推门进店"}<ArrowRight size={17} /></button>
        {(environment?.live || environment?.placeName) && <p className="scene-data-credit">{environment.live && <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">天气 · Open-Meteo</a>}{environment.placeName && <a href="https://www.bigdatacloud.com/" target="_blank" rel="noreferrer">地点 · BigDataCloud</a>}</p>}
      </div>

      <div className="distant-shop distant-shop-left" data-depth="-4" aria-hidden="true"><Image src={`${assets}building.webp`} alt="" fill sizes="35vw" /></div>
      <div className="distant-shop distant-shop-right" data-depth="-7" aria-hidden="true"><Image src={`${assets}building.webp`} alt="" fill sizes="30vw" /></div>

      <div className="shop-position" data-depth="17">
        <div className="shop-ground" aria-hidden="true" />
        <div className="shop-perspective"><div className="shop-reveal">
          <div className="shop-art">
            <Image className="shop-base" src={`${assets}building.webp`} alt="有斑驳招牌、红雨棚、自行车的水彩手绘杂货店" width={1080} height={1080} sizes="(max-width: 700px) 100vw, 70vw" preload />
            {layers.map(layer => <div key={layer.name} className="shop-part" data-depth={partDepths[layer.name]} style={{ left: `${layer.left / 10.8}%`, top: `${layer.top / 10.8}%`, width: `${layer.width / 10.8}%`, height: `${layer.height / 10.8}%` }} aria-hidden="true"><Image src={`${assets}${layer.file}`} alt="" fill sizes={`${Math.ceil(layer.width / 1080 * 65)}vw`} /></div>)}
          </div>
          <button className="shop-window" type="button" aria-label="轻触二楼窗户，点亮窗灯" onClick={e => e.currentTarget.classList.toggle("window-awake")}><span aria-hidden="true" /></button>
          <div className="shop-door-light" aria-hidden="true" />
          <button className="shop-entry-door" aria-label={entering ? "正在推门进店" : "推开杂货店的门，进入店内"} disabled={entering || delivering} onPointerEnter={onPrepareEntry} onFocus={onPrepareEntry} onClick={onEnter} type="button"><span>{entering ? "正在开门…" : "推门进店"}<ArrowRight size={14} /></span></button>
        </div></div>
      </div>

      <div className="foreground-plant" data-depth="58" aria-hidden="true"><Image src={`${assets}foreground-grass.webp`} alt="" fill sizes="28vw" /></div>
      <div className="mailbox-position" data-depth="42">
        <button className={`watercolor-mailbox ${hasReply ? "mailbox-has-reply" : ""}`} ref={mailbox} id="scene-mailbox" aria-label={mailboxLabel} aria-busy={delivering} disabled={delivering} onClick={onOpenMailbox} type="button">
          <Image src={`${assets}mailbox.webp`} alt="" width={600} height={900} sizes="(max-width: 700px) 140px, 18vw" />
          <span className="mail-slot-flap" aria-hidden="true" />
          <span className="mailbox-state-label">{delivering ? "正在寄出" : ready ? "投递这封信" : hasReply ? "有回信了" : "取一张信纸"}</span>
          {hasReply ? <span className="reply-peeking" aria-hidden="true"><EnvelopeSimple size={25} /></span> : null}
        </button>
      </div>

      {ready ? <div className="ready-letter" role="status"><div className="held-envelope" aria-hidden="true"><span className="envelope-seal">解</span></div><div><p>信已经折好了。</p><span>点击红色邮箱，亲手寄出。</span>{error ? <p className="delivery-error" role="alert">{error}</p> : null}<button onClick={onEditLetter} type="button">展开修改</button></div></div> : null}
      {delivering ? <p className="scene-delivery-status" role="status">信已投入邮箱，正在等一封回信。</p> : null}

      <ExteriorCompanions />
      {entering || entryError ? <p className="scene-entry-status" role={entryError ? "alert" : "status"}>{entryError ?? "正在为你点亮店里的灯…"}</p> : null}
    </section>
  );
}
