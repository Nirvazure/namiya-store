"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { Pause } from "@phosphor-icons/react/dist/csr/Pause";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import type { ThreadDetail, ThreadListResponse, ThreadMessage, ThreadSummary } from "@/domain/threads";
import { ShopDialog } from "@/components/shops/ShopDialog";
import { api, errorMessage } from "@/services/api/client";
import { readLocalValue, writeLocalValue } from "@/services/storage/localStorageService";
import { useMusicStore } from "@/store/useMusicStore";
import "./mailbox.css";

export function ThreadMailbox({ userId, initialThreadId, onClose, onRead }: { userId: string; initialThreadId?: string; onClose: () => void; onRead: () => void }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selected, setSelected] = useState(initialThreadId);
  const [box, setBox] = useState("all");
  const [detail, setDetail] = useState<ThreadDetail>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const activeId = useRef(selected);
  const activeBox = useRef(box);
  const versions = useRef(new Map<string, number>());
  const alive = useRef(true);
  const onReadRef = useRef(onRead);
  useEffect(() => { onReadRef.current = onRead; }, [onRead]);
  useEffect(() => { activeId.current = selected; }, [selected]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = useCallback(async () => {
    try { const result = await api<ThreadListResponse>(`/api/threads?box=${box}`); if (alive.current && activeBox.current === box) setThreads(result.threads); }
    catch (error) { if (alive.current) setError(errorMessage(error)); }
    finally { if (alive.current) setLoading(false); }
  }, [box]);
  useEffect(() => {
    const controller = new AbortController();
    void api<ThreadListResponse>(`/api/threads?box=${box}`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted && activeBox.current === box) setThreads(result.threads); }).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [box]);

  const showDetail = useCallback((value: ThreadDetail) => {
    if (!alive.current || activeId.current !== value.thread.id) return;
    const version = Date.parse(value.thread.updatedAt);
    if (version < (versions.current.get(value.thread.id) ?? 0)) return;
    versions.current.set(value.thread.id, version);
    setDetail(value);
    if (!document.hidden) void api(`/api/threads/${value.thread.id}/read`, { method: "POST", body: JSON.stringify({ throughMessageId: value.messages.at(-1)?.id }) }).then(() => { onReadRef.current(); void refresh(); }).catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void api<ThreadDetail>(`/api/threads/${selected}`, { signal: controller.signal }).then(showDetail).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    return () => controller.abort();
  }, [selected, showDetail]);

  const generate = useCallback(async (id: string) => {
    setBusy(true); setError("");
    try { showDetail(await api<ThreadDetail>(`/api/threads/${id}/generate`, { method: "POST", signal: AbortSignal.timeout(110_000) })); }
    catch (error) { if (alive.current && activeId.current === id) setError(errorMessage(error)); }
    finally { if (alive.current) setBusy(false); }
  }, [showDetail]);
  useEffect(() => {
    if (!selected) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) void api<ThreadDetail>(`/api/threads/${selected}`).then(showDetail).catch(() => {});
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [selected, showDetail]);

  async function send(body: string, clientRequestId: string) {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const value = await api<ThreadDetail>(`/api/threads/${selected}/messages`, { method: "POST", body: JSON.stringify({ body, clientRequestId }), signal: AbortSignal.timeout(30_000) });
      showDetail(value);
      return true;
    } catch (error) { setError(errorMessage(error)); return false; }
    finally { if (alive.current) setBusy(false); }
  }
  async function toggleBlock() {
    if (!detail) return;
    setBusy(true); setError("");
    try { showDetail(await api<ThreadDetail>(`/api/threads/${detail.thread.id}/block`, { method: "POST", body: JSON.stringify({ blocked: !detail.thread.blocked }) })); }
    catch (error) { setError(errorMessage(error)); }
    finally { if (alive.current) setBusy(false); }
  }
  const visibleDetail = detail?.thread.id === selected ? detail : undefined;
  return <ShopDialog title={selected ? visibleDetail?.thread.title || "一段往来" : "自己的信箱"} eyebrow="一封一封，慢慢读" onClose={onClose} wide>
    {error && <p className="mail-error" role="alert">{error}<button type="button" onClick={() => { setError(""); void refresh(); }}>重新连接</button></p>}
    {selected ? <>
      <div className="mail-toolbar"><button type="button" onClick={() => { setSelected(undefined); setDetail(undefined); setError(""); void refresh(); }}><ArrowLeft size={16} />返回信箱</button><span>{visibleDetail?.thread.shopName} · {visibleDetail?.thread.signature || "匿名来信"}</span></div>
      {visibleDetail ? <>
        <div className="mail-messages">{visibleDetail.messages.map(message => <article className={`mail-message mail-message-${message.role}`} key={message.id}><header><strong>{message.role === "visitor" ? visibleDetail.thread.viewerRole === "visitor" ? "我的来信" : visibleDetail.thread.signature || "匿名来信" : message.source === "openai" ? "爷爷的 AI 回信" : "店主回信"}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("zh-CN")}</time></header><p>{message.body}</p>{message.source === "openai" && <VoicePlayer key={message.id} message={message} />}</article>)}</div>
        {visibleDetail.thread.generationStatus !== "idle" && <div className="mail-wait" role="status"><p>{busy || visibleDetail.thread.generationStatus === "generating" || visibleDetail.thread.generationStatus === "pending" ? "爷爷正在灯下读信。你可以先收起信箱，去专注一会儿。" : "文字回信暂时没有完成，来信已经保存。"}</p><button type="button" disabled={busy || visibleDetail.thread.blocked || visibleDetail.thread.generationStatus === "generating" || visibleDetail.thread.generationStatus === "pending"} onClick={() => void generate(selected)}>重试回信</button></div>}
        {!visibleDetail.thread.isAi && visibleDetail.messages.at(-1)?.role === "visitor" && <p className="mail-note">信已经送达。真人店主会在有空时回信，不必一直等在这里。</p>}
        <ReplyComposer key={selected} userId={userId} detail={visibleDetail} busy={busy} onSend={send} />
        <div className="mail-block"><p>通信只对双方可见。屏蔽后双方都不能继续寄信。</p><button type="button" disabled={busy} onClick={() => void toggleBlock()}>{visibleDetail.thread.blocked ? "尝试解除我的屏蔽" : "屏蔽这段通信"}</button></div>
      </> : <p className="shop-empty" role="status">正在取出信件…</p>}
    </> : <>
      <div className="mail-tabs" aria-label="筛选信箱">{[["all", "全部往来"], ["inbox", "店主收件箱"], ["sent", "我寄出的信"]].map(([value, label]) => <button type="button" aria-pressed={box === value} onClick={() => { activeBox.current = value; setBox(value); setError(""); }} key={value}>{label}</button>)}</div>
      {loading ? <p className="shop-empty" role="status">正在翻找信件…</p> : threads.length ? <div className="mail-list">{threads.map(thread => <button type="button" className="mail-thread" key={thread.id} onClick={() => { activeId.current = thread.id; setSelected(thread.id); setError(""); }}><EnvelopeSimple size={23} /><span><strong>{thread.title || "一封没有标题的信"}{thread.unread && <i aria-label="未读" />}</strong><small>{thread.shopName} · {thread.viewerRole === "owner" ? thread.signature || "匿名来信" : "我寄出的信"}{thread.blocked ? " · 已屏蔽" : ""}</small></span><time>{new Date(thread.updatedAt).toLocaleDateString("zh-CN")}</time></button>)}</div> : <p className="shop-empty">这里还没有信。去一家喜欢的小店，写下第一句话吧。</p>}
    </>}
  </ShopDialog>;
}

function ReplyComposer({ userId, detail, busy, onSend }: { userId: string; detail: ThreadDetail; busy: boolean; onSend: (body: string, id: string) => Promise<boolean | undefined> }) {
  const key = `namiya.continuation:${userId}:${detail.thread.id}`;
  const [saved] = useState(() => readLocalValue<{ body?: string; id?: string }>(key, {}));
  const [body, setBody] = useState(typeof saved.body === "string" ? saved.body : "");
  const requestId = useRef(typeof saved.id === "string" ? saved.id : "");
  const disabled = busy || detail.thread.blocked || (detail.thread.isAi && detail.thread.generationStatus !== "idle");
  return <form className="mail-composer" onSubmit={event => { event.preventDefault(); if (disabled || !body.trim()) return; requestId.current ||= crypto.randomUUID(); writeLocalValue(key, { body, id: requestId.current }); void onSend(body.trim(), requestId.current).then(ok => { if (ok) { setBody(""); requestId.current = ""; writeLocalValue(key, {}); } }); }}>
    <label htmlFor="mail-continuation">{detail.thread.viewerRole === "owner" ? "给来信的人回一封信" : "再写几句"}</label><textarea id="mail-continuation" maxLength={10000} value={body} disabled={disabled} onChange={event => { setBody(event.target.value); requestId.current = ""; writeLocalValue(key, { body: event.target.value, id: "" }); }} placeholder={detail.thread.blocked ? "这段通信已被屏蔽" : "不用急，想到什么就写什么。"} /><button className="shop-primary" type="submit" disabled={disabled || !body.trim()}>{busy ? "信正在路上…" : "寄出这封信"}</button>
  </form>;
}

function VoicePlayer({ message }: { message: ThreadMessage }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  const alive = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stop = useCallback(() => { setPlaying(false); useMusicStore.getState().setDucked(false, message.id); }, [message.id]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; audio.current?.pause(); audio.current = null; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); useMusicStore.getState().setDucked(false, message.id); }; }, [message.id]);
  async function toggle() {
    if (loading) return;
    if (playing) { audio.current?.pause(); stop(); return; }
    setLoading(true); setError("");
    try {
      if (!audio.current) {
        const response = await fetch(`/api/messages/${message.id}/audio`, { method: "POST", signal: AbortSignal.timeout(110_000), cache: "no-store" });
        if (!response.ok) { const failure = await response.json().catch(() => null); throw new Error(failure?.error || "朗读暂时没有准备好，请稍后重试。"); }
        const blob = await response.blob();
        if (!alive.current) return;
        objectUrl.current = URL.createObjectURL(blob);
        audio.current = new Audio(objectUrl.current);
        audio.current.onended = stop;
        audio.current.onpause = stop;
        audio.current.onerror = () => { stop(); setError("声音暂时无法播放，请重试。"); };
      }
      if (!alive.current) return;
      // Only one letter is read aloud at a time.
      document.dispatchEvent(new CustomEvent("namiya:voice", { detail: message.id }));
      useMusicStore.getState().setDucked(true, message.id);
      await audio.current.play();
      if (alive.current) setPlaying(true);
    } catch (error) { if (alive.current) { stop(); setError(errorMessage(error)); } }
    finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => {
    function otherVoice(event: Event) { if ((event as CustomEvent).detail !== message.id) audio.current?.pause(); }
    document.addEventListener("namiya:voice", otherVoice);
    return () => document.removeEventListener("namiya:voice", otherVoice);
  }, [message.id]);
  return <div className="mail-voice"><button type="button" disabled={loading} onClick={() => void toggle()}>{playing ? <Pause size={16} /> : <Play size={16} />}{loading ? "正在准备声音…" : playing ? "暂停朗读" : "听爷爷读信"}</button><small>AI 合成语音</small>{error && <p role="alert">{error}</p>}</div>;
}
