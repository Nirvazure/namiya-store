"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { gsap } from "gsap";
import type { LetterFlowState } from "@/domain/letterTypes";
import { defaultShop, sceneImageStyle, type Shop } from "@/domain/shops";
import layers from "@/public/joy_store_parallax/optimized/layers.json";
import { useSceneEnvironment } from "@/components/scene/useSceneEnvironment";
import { StreetCalendar } from "@/components/scene/StreetCalendar";
import "@/components/shops/shops.css";

const assets = "/joy_store_parallax/optimized/";
const partDepths: Record<string, number> = { roof_antenna: .9, roof_tiles: .2, upper_window: .2, sign_cola: .35, sign_shop: .3, awning: .6, ground_floor: 0, bicycle: .75, air_conditioner: .3, poster: .2, plants: .8 };

type Props = {
  shop?: Shop;
  flowState: LetterFlowState;
  hasReply: boolean;
  error?: string;
  onOpenMailbox: () => void;
  onEditLetter: () => void;
  onEnter: () => void;
  onPrepareEntry: () => void;
  entering: boolean;
  entryError?: string;
};

export function ExteriorScene(props: Props) {
  const shop = props.shop ?? defaultShop;
  return shop.scenes.outdoor.mode === "layers" ? <LayeredExteriorScene {...props} shop={shop} /> : <ImageExteriorScene {...props} shop={shop} />;
}

function LayeredExteriorScene({ shop = defaultShop, flowState, hasReply, error, onOpenMailbox, onEditLetter, onEnter, onPrepareEntry, entering, entryError }: Props) {
  const root = useRef<HTMLElement>(null);
  const mailbox = useRef<HTMLButtonElement>(null);
  const moveScene = useRef<(x: number, y: number) => void>(() => {});
  const environment = useSceneEnvironment(shop);
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

  const mailboxLabel = shop.isOwner ? hasReply ? "自己的信箱有未读来信，点击取信" : "打开自己的信箱" : delivering ? "信件投递中" : ready ? "点击邮箱，投递这封信" : "点击邮箱，取一张信纸";

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
        <a className="store-brand" href="#street" aria-label="解忧杂货店"><Image className="store-brand-icon" src="/site-logo.png" alt="" width={48} height={56} preload /><span>解忧杂货店<small lang="en">Namiya General Store</small></span></a>
      </header>

      <div className="scene-introduction">
        <p className="scene-salutation">此地，此刻</p>
        <h1 className="scene-place-name" title={environment?.placeName}>{environment?.placeName ?? (environment?.live ? "所在地天气" : "本地时间")}</h1>
        <p className="scene-weather-reading"><span>{environment?.weatherLabel ?? "感受此刻…"}</span>{environment?.temperature !== undefined && <span className="scene-temperature">{Math.round(environment.temperature)}<small>°C</small></span>}</p>
        <p className="scene-local-time">{environment ? <>{environment.phaseLabel} · {environment.timeSource} <time>{environment.localTime}</time></> : "正在感受此刻的光线"}</p>
        <div className="scene-calendar-placement"><StreetCalendar date={environment?.localDate} /></div>
        {hasReply && <p className="scene-reply-reminder">邮箱里，多了一封回信。</p>}
        <button className="scene-write-link" onClick={onEnter} onPointerEnter={onPrepareEntry} onFocus={onPrepareEntry} disabled={delivering || entering || (!shop.isOpen && !shop.isOwner)} type="button">{!shop.isOpen && !shop.isOwner ? "暂时关店" : entering ? "正在开门…" : "推门进店"}<ArrowRight size={17} /></button>
        {(environment?.live || environment?.placeName) && <p className="scene-data-credit">{environment.live && <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">天气 · Open-Meteo</a>}{environment.placeName && shop.id !== "grandpa" && <a href="https://www.bigdatacloud.com/" target="_blank" rel="noreferrer">地点 · BigDataCloud</a>}</p>}
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
          <button className="shop-window" type="button" disabled={!shop.isOpen} aria-label="轻触二楼窗户，点亮窗灯" onClick={e => e.currentTarget.classList.toggle("window-awake")}><span aria-hidden="true" /></button>
          <div className="shop-door-light" aria-hidden="true" />
          {shop.id !== "grandpa" && <div className={`personal-shop-sign sign-${shop.signStyle}`}>{shop.name}</div>}
          <button className="shop-entry-door" aria-label={entering ? "正在推门进店" : "推开杂货店的门，进入店内"} disabled={entering || delivering || (!shop.isOpen && !shop.isOwner)} onPointerEnter={onPrepareEntry} onFocus={onPrepareEntry} onClick={onEnter} type="button"><span>{!shop.isOpen && !shop.isOwner ? "暂时关店" : entering ? "正在开门…" : "推门进店"}<ArrowRight size={14} /></span></button>
        </div></div>
      </div>

      {(shop.appearance?.showForegroundPlants ?? true) && <div className="foreground-plant" data-depth="58" aria-hidden="true"><Image src={`${assets}foreground-grass.webp`} alt="" fill sizes="28vw" /></div>}
      <div className="mailbox-position" data-depth="42">
        <button className={`watercolor-mailbox ${hasReply ? "mailbox-has-reply" : ""}`} ref={mailbox} id="scene-mailbox" aria-label={mailboxLabel} aria-busy={delivering} disabled={delivering} onClick={onOpenMailbox} type="button">
          <Image src={`${assets}mailbox.webp`} alt="" width={600} height={900} sizes="(max-width: 700px) 140px, 18vw" />
          <span className="mail-slot-flap" aria-hidden="true" />
          <span className="mailbox-state-label">{shop.isOwner ? hasReply ? "有未读来信" : "自己的信箱" : !shop.isOpen || !shop.acceptingLetters ? "暂不接收新信" : delivering ? "正在寄出" : ready ? "投递这封信" : "取一张信纸"}</span>
          {hasReply ? <span className="reply-peeking" aria-hidden="true"><EnvelopeSimple size={25} /></span> : null}
        </button>
      </div>

      {ready ? <div className="ready-letter" role="status"><div className="held-envelope" aria-hidden="true"><span className="envelope-seal">解</span></div><div><p>信已经折好了。</p><span>点击红色邮箱，亲手寄出。</span>{error ? <p className="delivery-error" role="alert">{error}</p> : null}<button onClick={onEditLetter} type="button">展开修改</button></div></div> : null}
      {delivering ? <p className="scene-delivery-status" role="status">信已投入邮箱，正在等一封回信。</p> : null}

      {entering || entryError ? <p className="scene-entry-status" role={entryError ? "alert" : "status"}>{entryError ?? "正在为你点亮店里的灯…"}</p> : null}
    </section>
  );
}

function ImageExteriorScene({ shop = defaultShop, flowState, hasReply, error, onOpenMailbox, onEditLetter, onEnter, onPrepareEntry, entering, entryError }: Props) {
  const environment = useSceneEnvironment(shop);
  const mailbox = useRef<HTMLButtonElement>(null);
  const ready = flowState === "envelopeReady";
  const delivering = flowState === "delivering";

  useEffect(() => { if (ready) mailbox.current?.focus({ preventScroll: true }); }, [ready]);

  return <section className={`interactive-street shop-image-street ${delivering ? "is-delivering" : ""}`} data-phase={environment?.phase ?? "pending"} data-weather={environment?.condition ?? "unknown"} aria-label={`${shop.name}的门面`}>
    <div className="street-sky sky-dusk" aria-hidden="true" /><div className="street-sky sky-morning" aria-hidden="true" /><div className="street-sky sky-day" aria-hidden="true" />
    <div className="scene-paper-grain" aria-hidden="true" /><div className="ambient-haze" aria-hidden="true" /><div className="watercolor-cloud cloud-left" aria-hidden="true" /><div className="watercolor-cloud cloud-right" aria-hidden="true" /><div className="ambient-moon" aria-hidden="true" /><div className="ambient-stars" aria-hidden="true" />
    <div className="weather-wash" aria-hidden="true" /><div className="weather-mist" aria-hidden="true" /><div className="weather-precipitation" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <span key={index} style={{ "--particle-x": `${(index * 43 + 7) % 100}%`, "--particle-delay": `${-(index * .73)}s`, "--particle-speed": `${.85 + (index % 5) * .18}`, "--particle-opacity": .2 + (index % 4) * .1 } as CSSProperties} />)}</div>
    <header className="scene-header"><a className="store-brand" href="#street" aria-label="解忧杂货店"><Image className="store-brand-icon" src="/site-logo.png" alt="" width={48} height={56} preload /><span>解忧杂货店<small lang="en">Namiya General Store</small></span></a></header>
    <div className="scene-introduction">
      <p className="scene-salutation">{shop.name} · 此地，此刻</p>
      <h1 className="scene-place-name" title={environment?.placeName}>{environment?.placeName ?? (environment?.live ? "所在地天气" : "本地时间")}</h1>
      <p className="scene-weather-reading"><span>{environment?.weatherLabel ?? "感受此刻…"}</span>{environment?.temperature !== undefined && <span className="scene-temperature">{Math.round(environment.temperature)}<small>°C</small></span>}</p>
      <p className="scene-local-time">{environment ? <>{environment.phaseLabel} · {environment.timeSource} <time>{environment.localTime}</time></> : "正在感受此刻的光线"}</p>
      <div className="scene-calendar-placement"><StreetCalendar date={environment?.localDate} /></div>
      {hasReply && <p className="scene-reply-reminder">邮箱里，多了一封回信。</p>}
      <button className="scene-write-link shop-entry-door" type="button" disabled={entering || delivering || (!shop.isOpen && !shop.isOwner)} onPointerEnter={onPrepareEntry} onFocus={onPrepareEntry} onClick={onEnter}>{!shop.isOpen && !shop.isOwner ? "暂时关店" : entering ? "正在开门…" : "推门进店"}<ArrowRight size={17} /></button>
      {(environment?.live || environment?.placeName) && <p className="scene-data-credit">{environment.live && <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">天气 · Open-Meteo</a>}{environment.placeName && shop.id !== "grandpa" && <a href="https://www.bigdatacloud.com/" target="_blank" rel="noreferrer">地点 · BigDataCloud</a>}</p>}
    </div>
    <div className="whole-shop-picture"><Image src={shop.scenes.outdoor.src} alt={`${shop.name}的室外门面`} fill unoptimized sizes="(max-width: 700px) 94vw, 65vw" style={sceneImageStyle(shop.scenes.outdoor)} preload /><div className={`personal-shop-sign sign-${shop.signStyle}`}>{shop.name}</div></div>
    {(shop.appearance?.showForegroundPlants ?? true) && <div className="foreground-plant" aria-hidden="true"><Image src={`${assets}foreground-grass.webp`} alt="" fill sizes="28vw" /></div>}
    <div className="whole-shop-actions"><button ref={mailbox} id="scene-mailbox" type="button" aria-label={shop.isOwner ? "打开自己的信箱" : undefined} onClick={onOpenMailbox} disabled={delivering}><EnvelopeSimple size={19} />{shop.isOwner ? hasReply ? "有未读来信" : "自己的信箱" : !shop.isOpen || !shop.acceptingLetters ? "暂不接收新信" : delivering ? "正在投递…" : ready ? "投递这封信" : "取一张信纸"}</button>{ready && <button type="button" onClick={onEditLetter}>展开修改</button>}</div>
    {error && <p className="whole-shop-status" role="alert">{error}</p>}
    {(entering || entryError) && <p className="scene-entry-status" role={entryError ? "alert" : "status"}>{entryError ?? "正在为你点亮店里的灯…"}</p>}
    <div className="scene-corner-note"><span>门外与门内，是同一家小店</span></div>
  </section>;
}
