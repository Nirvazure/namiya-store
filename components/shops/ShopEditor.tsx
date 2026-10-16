"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FloppyDisk, UploadSimple } from "@phosphor-icons/react";
import { musicTracks } from "@/domain/musicTracks";
import { systemShops, type MyShopResponse, type SceneAsset, type SessionResponse, type Shop, type ShopDraft, type SignStyle } from "@/domain/shops";
import { api as request } from "@/services/api/client";
import { prepareLogin } from "@/services/auth/login";
import { ScenePicture } from "./ScenePicture";
import { ShopDialog } from "./ShopDialog";

const emptyDraft: ShopDraft = { name: "", description: "", signStyle: "wood", musicTrackId: "rain-radio", acceptingLetters: true, scenes: { outdoor: null, indoor: null } };
const steps = ["小店资料", "室外与室内", "进店预览", "确认发布"];
type SceneSide = "outdoor" | "indoor";

export function ShopEditor({ onClose, onPublished }: { onClose: () => void; onPublished: (shop: Shop) => void }) {
  const [draft, setDraft] = useState<ShopDraft>(emptyDraft);
  const [published, setPublished] = useState<Shop | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<"saving" | "publishing" | SceneSide | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inside, setInside] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const operation = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    async function load() {
      try {
        const nextSession = await request<SessionResponse>("/api/me", { signal: controller.signal });
        if (!alive.current) return;
        setSession(nextSession);
        if (nextSession.user) {
          const data = await request<MyShopResponse>("/api/shops/mine", { signal: controller.signal });
          if (!alive.current) return;
          setPublished(data.shop);
          setDraft(data.draft ?? (data.shop ? { name: data.shop.name, description: data.shop.description, signStyle: data.shop.signStyle, musicTrackId: data.shop.musicTrackId, acceptingLetters: data.shop.acceptingLetters, scenes: data.shop.scenes } : emptyDraft));
        }
      } catch (failure) { if (alive.current && !controller.signal.aborted) { setLoadFailed(true); setError(failure instanceof Error ? failure.message : "小店资料暂时无法读取。"); } }
      finally { if (alive.current && !controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => { alive.current = false; controller.abort(); };
  }, [loadVersion]);

  const detailsReady = Boolean(draft.name.trim() && draft.description.trim());
  const scenesReady = Boolean(draft.scenes.outdoor && draft.scenes.indoor);
  const ready = detailsReady && scenesReady;

  function edit(patch: Partial<ShopDraft>) { setDraft(value => ({ ...value, ...patch })); setReviewed(false); setNotice(""); }
  function changeStep(next: number) { setStep(next); setError(""); requestAnimationFrame(() => heading.current?.focus()); }

  async function save(publish = false) {
    if (operation.current) return;
    operation.current = true;
    setBusy(publish ? "publishing" : "saving"); setError(""); setNotice("");
    try {
      await request<MyShopResponse>("/api/shops/mine", { method: "PUT", body: JSON.stringify(draft) });
      if (publish) {
        const result = await request<{ shop: Shop }>("/api/shops/mine/publish", { method: "POST" });
        if (alive.current) onPublished(result.shop);
      } else if (alive.current) setNotice("草稿已保存。确认发布后，访客才会看到这次布置。");
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "没有保存成功，请再试一次。"); }
    finally { operation.current = false; if (alive.current) setBusy(null); }
  }

  async function upload(side: SceneSide, file?: File) {
    if (!file || operation.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { setError("请选择不超过 10MB 的 JPG、PNG 或 WebP 图片。"); return; }
    operation.current = true; setBusy(side); setError(""); setNotice("");
    try {
      const data = new FormData(); data.append("file", file);
      const result = await request<{ asset: SceneAsset }>("/api/uploads", { method: "POST", body: data });
      if (alive.current) { setDraft(value => ({ ...value, scenes: { ...value.scenes, [side]: result.asset } })); setReviewed(false); }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "图片没有上传成功，原来的场景已保留。"); }
    finally { operation.current = false; if (alive.current) setBusy(null); }
  }

  function frame(side: SceneSide, key: "x" | "y" | "scale", value: number) {
    if (!Number.isFinite(value)) return;
    const bounded = key === "scale" ? Math.min(2, Math.max(1, value)) : Math.min(100, Math.max(0, value));
    setDraft(current => { const asset = current.scenes[side]; return asset ? { ...current, scenes: { ...current.scenes, [side]: { ...asset, framing: { ...asset.framing, [key]: bounded } } } } : current; });
    setReviewed(false); setNotice("");
  }

  const preview = draft.scenes[inside ? "indoor" : "outdoor"];
  return <ShopDialog title={published ? "照料我的小店" : "给自己，点一盏灯"} eyebrow="一人一家小店 · 门外与门内成对布置" onClose={onClose} dismissible={!busy} wide>
    {loading ? <p className="shop-empty" role="status">正在翻开你的小店手册…</p> : loadFailed ? <div className="shop-empty"><p role="alert">{error}</p><button className="shop-primary" type="button" onClick={() => { setLoading(true); setLoadFailed(false); setError(""); setLoadVersion(value => value + 1); }}>重新读取小店资料</button></div> : !session?.user ? <div className="shop-empty"><p>{session?.configured === false ? "账号服务尚未配置。配置完成后，就可以开设自己的小店。" : "登录共享账号后，就能拥有自己的小店。"}</p>{session?.configured && <button className="shop-primary" type="button" onClick={() => prepareLogin("/?open=shop")}>使用 GitHub 登录</button>}{error && <p role="alert">{error}</p>}</div> : <>
      <nav className="shop-editor-steps" aria-label="开店步骤">{steps.map((label, index) => <button key={label} type="button" aria-current={step === index ? "step" : undefined} disabled={Boolean(busy) || (index > 0 && !detailsReady) || (index > 1 && !scenesReady)} onClick={() => changeStep(index)}><span>{index + 1}</span>{label}</button>)}</nav>
      <div className="shop-editor-body" aria-busy={Boolean(busy)}>
        <h3 ref={heading} tabIndex={-1} className="shop-step-title">{steps[step]}</h3>
        {step === 0 && <div className="shop-details"><label>牌匾上的名字<input value={draft.name} onChange={event => edit({ name: event.target.value })} maxLength={30} placeholder="例如：等风来的小店" disabled={Boolean(busy)} /></label><label>写给来访者的一句话<textarea value={draft.description} onChange={event => edit({ description: event.target.value })} maxLength={240} rows={3} placeholder="告诉来访的人，这里是怎样一个地方。" disabled={Boolean(busy)} /></label><fieldset disabled={Boolean(busy)}><legend>牌匾样式</legend><div className="shop-sign-options">{([['wood', '旧木牌'], ['paper', '手写纸牌'], ['moss', '苔绿色']] as [SignStyle, string][]).map(([value, label]) => <button key={value} type="button" className={`sign-${value}`} aria-pressed={draft.signStyle === value} onClick={() => edit({ signStyle: value })}>{label}{draft.signStyle === value && <Check size={15} />}</button>)}</div></fieldset><label>默认音景<select value={draft.musicTrackId} onChange={event => edit({ musicTrackId: event.target.value })} disabled={Boolean(busy)}>{musicTracks.map(track => <option key={track.id} value={track.id}>{track.title}</option>)}</select><small>由来访者主动播放，保持安静地进入。</small></label><label className="shop-checkbox"><input type="checkbox" checked={draft.acceptingLetters} onChange={event => edit({ acceptingLetters: event.target.checked })} disabled={Boolean(busy)} /><span>欢迎新的来信<small>关闭后不接收新来信，已有通信仍可继续。</small></span></label></div>}
        {step === 1 && <><p className="shop-intro">选择一对喜欢的场景，或上传自己的门面与室内。两张图都会在发布前一起确认。</p><div className="shop-template-options">{systemShops.map(template => <button key={template.id} type="button" disabled={Boolean(busy)} onClick={() => edit({ scenes: structuredClone(template.scenes) })} aria-pressed={draft.scenes.indoor?.templateId === template.scenes.indoor.templateId && draft.scenes.outdoor?.src === template.scenes.outdoor.src && !draft.scenes.outdoor?.uploadId && !draft.scenes.indoor?.uploadId}><ScenePicture scene={template.scenes.outdoor} alt={`${template.name}模板`} /><span>{template.name}</span></button>)}</div><div className="shop-scene-editors">{(["outdoor", "indoor"] as SceneSide[]).map(side => { const scene = draft.scenes[side]; const label = side === "outdoor" ? "室外门面" : "室内场景"; return <fieldset key={side} disabled={Boolean(busy)} className="shop-scene-editor"><legend>{label}</legend><ScenePicture scene={scene} alt={label} /><label className="shop-upload-button"><UploadSimple size={16} />{busy === side ? "正在上传…" : `上传${label}`}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(side, event.target.files?.[0]); event.target.value = ""; }} /></label>{scene?.mode === "image" && <div className="shop-framing">{([['x', '左右位置', 0, 100, 1], ['y', '上下位置', 0, 100, 1], ['scale', '缩放', 1, 2, .05]] as const).map(([key, text, min, max, stepValue]) => <label key={key}><span>{text}<output>{key === "scale" ? `${Math.round(scene.framing[key] * 100)}%` : `${scene.framing[key]}%`}</output></span><input type="range" min={min} max={max} step={stepValue} value={scene.framing[key]} onChange={event => frame(side, key, Number(event.target.value))} /></label>)}</div>}</fieldset>; })}</div><p className="shop-fine-print">JPG、PNG、WebP，每张最多 10MB。图片按整图呈现；自动拆图与资源制作已列入后续计划。原图中已有的招牌文字会保留。</p></>}
        {step === 2 && <><p className="shop-intro">这就是来访者会看见的小店。推门看看，再回到门前。</p><div className="shop-live-preview"><ScenePicture scene={preview} alt={inside ? "室内场景预览" : "室外门面预览"} />{!inside && <span className={`shop-preview-sign sign-${draft.signStyle}`}>{draft.name || "我的小店"}</span>}<span className="shop-preview-side">{inside ? "门内" : "门外"}</span></div><div className="shop-preview-actions"><button type="button" className="shop-primary" onClick={() => setInside(!inside)}>{inside ? <ArrowLeft size={17} /> : null}{inside ? "返回店门前" : "推门进入"}{inside ? null : <ArrowRight size={17} />}</button><span>{draft.name} · {draft.acceptingLetters ? "欢迎来信" : "暂歇新信"}</span></div></>}
        {step === 3 && <><p className="shop-intro">{published ? "这次布置会在确认后，连同门面与室内一起替换当前版本。" : "准备好了，就让街角多一盏灯。你随时可以回来照料它。"}</p><div className="shop-confirm-pair"><div><ScenePicture scene={draft.scenes.outdoor} alt="室外门面" /><span>室外门面</span></div><div><ScenePicture scene={draft.scenes.indoor} alt="室内场景" /><span>室内场景</span></div></div><div className={`shop-confirm-sign sign-${draft.signStyle}`}>{draft.name}</div><p className="shop-confirm-description">{draft.description}</p><p className="shop-fine-print">默认音景：{musicTracks.find(track => track.id === draft.musicTrackId)?.title} · {draft.acceptingLetters ? "欢迎来信" : "暂歇新信"}</p><label className="shop-checkbox"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={Boolean(busy)} /><span>我已看过门外与门内，确认使用这对场景</span></label></>}
      </div>
      {error && <p className="shop-form-error" role="alert">{error}</p>}{notice && <p className="shop-form-notice" role="status">{notice}</p>}
      <footer className="shop-editor-footer"><button type="button" className="shop-secondary" disabled={Boolean(busy)} onClick={() => void save()}><FloppyDisk size={17} />{busy === "saving" ? "正在保存…" : "保存草稿"}</button><div>{step > 0 && <button type="button" className="shop-text-button" disabled={Boolean(busy)} onClick={() => changeStep(step - 1)}>上一步</button>}{step < 3 ? <button type="button" className="shop-primary" disabled={Boolean(busy) || !detailsReady || (step > 0 && !scenesReady)} onClick={() => changeStep(step + 1)}>下一步<ArrowRight size={16} /></button> : <button type="button" className="shop-primary" disabled={Boolean(busy) || !ready || !reviewed} onClick={() => void save(true)}>{busy === "publishing" ? "正在点亮店灯…" : published ? "确认更新小店" : "确认发布小店"}</button>}</div></footer>
    </>}
  </ShopDialog>;
}
