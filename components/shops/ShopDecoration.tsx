"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { decorationPreview, decorationSettings, decorationThemes, type DecorationResponse, type DecorationSettings, type DecorationThemeId } from "@/domain/decoration";
import { musicTracks } from "@/domain/musicTracks";
import type { Shop } from "@/domain/shops";
import { api, ApiError, errorMessage } from "@/services/api/client";
import { preloadIndoorEntry } from "@/services/scene/preloadIndoor";
import { prepareLogin } from "@/services/auth/login";
import { decorationPath } from "@/services/shops/navigation";
import { registerNavigationGuard } from "@/services/shops/navigationGuard";
import { ScenePicture } from "./ScenePicture";
import "./decoration.css";

type Props = { shopId: string; userId: string | null; sessionReady: boolean; onDone: (shop: Shop) => void; onLeave: () => void };
export function ShopDecoration({ shopId, userId, sessionReady, onDone, onLeave }: Props) {
  const [data, setData] = useState<DecorationResponse>();
  const [settings, setSettings] = useState<DecorationSettings>();
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [inside, setInside] = useState(true);
  const [loadFinished, setLoadFinished] = useState(false);
  const dirty = Boolean(data && settings && JSON.stringify(settings) !== JSON.stringify(decorationSettings(data.shop)));
  const leaveState = useRef({ dirty, busy, onLeave });
  useEffect(() => { leaveState.current = { dirty, busy, onLeave }; }, [dirty, busy, onLeave]);
  const saved = useRef(false);
  const alive = useRef(true);
  const operation = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    alive.current = true; heading.current?.focus();
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (!sessionReady || !userId) return;
    const controller = new AbortController();
    void api<DecorationResponse>(`/api/shops/mine/decoration?shopId=${encodeURIComponent(shopId)}`, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setData(result); setSettings(decorationSettings(result.shop)); setError(""); setConflict(false); setLoadFinished(true);
    }).catch(failure => {
      if (!controller.signal.aborted) { setError(errorMessage(failure)); setLoadFinished(true); }
    });
    return () => controller.abort();
  }, [shopId, userId, sessionReady, loadVersion]);

  useEffect(() => {
    const path = decorationPath(shopId);
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!saved.current && (leaveState.current.dirty || leaveState.current.busy)) { event.preventDefault(); event.returnValue = ""; }
    }
    const unregister = registerNavigationGuard({ path, canLeave: () => saved.current ||
      !leaveState.current.busy && (!leaveState.current.dirty || window.confirm("装饰还没有保存，确定离开吗？")) });
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("beforeunload", beforeUnload); unregister(); };
  }, [shopId]);

  function leave() {
    if (busy || dirty && !window.confirm("装饰还没有保存，确定离开吗？")) return;
    onLeave();
  }
  function reload() {
    if (busy || dirty && !window.confirm("重新读取会放弃当前未保存的选择，确定继续吗？")) return;
    setLoadFinished(false); setLoadVersion(value => value + 1);
  }
  function edit(patch: Partial<DecorationSettings>) { setSettings(current => current ? { ...current, ...patch } : current); }
  async function submit(action: "save" | "skip") {
    if (!settings || !data || operation.current) return;
    if (action === "skip" && dirty && !window.confirm("跳过会放弃未保存的装饰，确定继续吗？")) return;
    operation.current = true; setBusy(true); setError(""); setConflict(false);
    try {
      // Keep the editor available on image failure; the server has not been changed yet.
      await preloadIndoorEntry(action === "save" ? decorationPreview(data.shop, settings) : data.shop);
      const result = await api<DecorationResponse>("/api/shops/mine/decoration", { method: "PATCH", body: JSON.stringify(action === "skip"
        ? { action, shopId } : { action, shopId, revision: data.revision, settings }) });
      if (!alive.current) return;
      saved.current = true; onDone(result.shop);
    } catch (failure) {
      if (alive.current) { setError(errorMessage(failure)); setConflict(failure instanceof ApiError && failure.status === 409); }
    } finally { operation.current = false; if (alive.current) setBusy(false); }
  }
  const preview = data && settings ? decorationPreview(data.shop, settings) : undefined;
  const selectedTheme = settings?.themeId ?? data?.shop.scenes.indoor.templateId;
  return <main className="decoration-page" aria-busy={busy}>
    <header className="decoration-header"><button className="decoration-back" type="button" onClick={leave} disabled={busy}><ArrowLeft size={18} />返回小店</button><span>我的小店 / 装饰</span></header>
    <div className="decoration-heading"><p>留住你喜欢的模样</p><h1 ref={heading} tabIndex={-1}>装饰我的小店</h1><span>选择店主与室内，换一块牌匾，留一段喜欢的声音。</span></div>
    {!sessionReady ? <p role="status">正在确认登录状态…</p> : !userId ? <div className="decoration-empty"><p>登录后才能装饰自己的小店。</p><button className="shop-primary" type="button" onClick={() => prepareLogin(decorationPath(shopId))}>登录</button></div> : !loadFinished ? <p role="status">正在读取小店布置…</p> : preview && settings && data ? <>
      <div className="decoration-layout">
        <section className="decoration-preview" aria-label="装饰预览">
          <div className="decoration-preview-tabs" role="group" aria-label="预览位置"><button type="button" aria-pressed={inside} onClick={() => setInside(true)}>店内</button><button type="button" aria-pressed={!inside} onClick={() => setInside(false)}>门前</button></div>
          <div className="decoration-preview-art">
            {inside && preview.scenes.indoor.mode === "layers" ? <div className="decoration-layered-preview">{["background", "keeper", "counter", "decor"].map(layer => <Image key={layer} src={`/indoor/optimized/${preview.scenes.indoor.templateId}/${layer}.webp`} alt={layer === "keeper" ? "店主与室内预览" : ""} fill unoptimized sizes="(max-width: 760px) 90vw, 55vw" />)}</div> : <ScenePicture scene={preview.scenes[inside ? "indoor" : "outdoor"]} alt={inside ? "当前室内预览" : "当前门面预览"} />}
            {!inside && <><div className={`decoration-preview-sign sign-${settings.signStyle}`}>{settings.name || "小店牌匾"}</div>{settings.showForegroundPlants && <Image className="decoration-preview-plants" src="/joy_store_parallax/optimized/foreground-grass.webp" alt="门前草丛" width={300} height={120} />}</>}
          </div>
          <p>{inside ? "店主、柜台与室内装饰整套搭配。" : "门面保持原样，牌匾和草丛随你的选择更新。"}</p><small>预览不会改变访客正在看到的小店。</small>
        </section>
        <form id="decoration-form" className="decoration-options" onSubmit={event => { event.preventDefault(); void submit("save"); }}>
          <fieldset disabled={busy}><legend>01 / 店主与室内</legend><div className="decoration-themes">{decorationThemes.map(theme => <button key={theme.id} type="button" aria-label={`选择${theme.name}主题`} aria-pressed={selectedTheme === theme.id} onClick={() => edit({ themeId: theme.id as DecorationThemeId })}><ScenePicture scene={theme.scenes.indoor} alt={theme.name} /><span>{theme.name}{selectedTheme === theme.id && <Check size={16} />}</span></button>)}</div>{!decorationThemes.some(theme => theme.id === selectedTheme) && <p className="decoration-hint">当前布置会保留，选择新主题后才替换。</p>}</fieldset>
          <fieldset disabled={busy}><legend>02 / 牌匾与介绍</legend><label>店名<input value={settings.name} onChange={event => edit({ name: event.target.value })} maxLength={30} required /></label><div className="decoration-signs" role="group" aria-label="牌匾样式">{([['wood', '旧木牌'], ['paper', '手写纸牌'], ['moss', '苔绿色']] as const).map(([value, label]) => <button key={value} className={`sign-${value}`} type="button" aria-pressed={settings.signStyle === value} onClick={() => edit({ signStyle: value })}>{label}{settings.signStyle === value && <Check size={14} />}</button>)}</div><label>小店介绍<textarea aria-label="小店介绍" value={settings.description} onChange={event => edit({ description: event.target.value })} maxLength={240} rows={3} /></label></fieldset>
          <fieldset disabled={busy}><legend>03 / 声音与门前</legend><label>默认音乐<select aria-label="默认音乐" value={settings.musicTrackId} onChange={event => edit({ musicTrackId: event.target.value })}>{musicTracks.map(track => <option key={track.id} value={track.id}>{track.title}</option>)}</select></label><p className="decoration-hint">选择默认音景，来访者主动播放时才会响起。</p><label className="decoration-toggle"><input type="checkbox" checked={settings.showForegroundPlants} onChange={event => edit({ showForegroundPlants: event.target.checked })} />显示门前草丛</label></fieldset>
        </form>
      </div>
      <footer className="decoration-footer"><div>{!data.onboardedAt && <button className="shop-text-button" type="button" disabled={busy} onClick={() => void submit("skip")}>暂时跳过</button>}<span>{dirty ? "有未保存的装饰" : "保存后，来访者就能看见"}</span></div><button className="shop-primary" type="submit" form="decoration-form" disabled={busy || !settings.name.trim()}>{busy ? "正在保存…" : "保存装饰"}</button></footer>
    </> : null}
    {error && <div className="decoration-error" role="alert"><p>{error}</p>{userId && <button className="shop-secondary" type="button" onClick={reload} disabled={busy}>{conflict ? "重新读取最新布置" : "重新读取"}</button>}</div>}
  </main>;
}
