import { useId } from "react";
import type { FocusDevice, MusicDevice } from "@/domain/companions";

type Props = { kind: MusicDevice | FocusDevice; playing?: boolean; progress?: number };

/** Scene furniture shares worn wood, muted pigments and a fine paper grain. */
export function CompanionObject({ kind, playing = false, progress = 0 }: Props) {
  const id = useId().replaceAll(":", "");
  const wood = `${id}-wood`;
  const grain = `${id}-grain`;
  const isClock = ["mantel", "kitchen", "alarm", "tea"].includes(kind);
  return <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={`companion-object-art object-${kind} ${playing ? "object-is-playing" : ""}`}>
    <defs>
      <linearGradient id={wood} x1="20" y1="30" x2="125" y2="120" gradientUnits="userSpaceOnUse"><stop stopColor="#aa8964" /><stop offset=".55" stopColor="#836345" /><stop offset="1" stopColor="#654e3b" /></linearGradient>
      <pattern id={grain} width="17" height="13" patternUnits="userSpaceOnUse"><path d="M0 3l17-1M3 9l9 1M13 12h4" stroke="#f4e3bf" strokeWidth=".7" opacity=".25" /><path d="M0 6l8 1M10 5l7-1" stroke="#463c32" strokeWidth=".5" opacity=".16" /></pattern>
    </defs>
    <ellipse cx="81" cy="119" rx="63" ry="6" fill="#3e342b" opacity=".16" />
    {kind === "cassette" && <>
      <path d="M44 41V25q0-5 6-5h58q7 0 7 6v15" stroke="#6b6556" strokeWidth="6" />
      <path d="M17 43l126-2 2 70-126 3z" fill="#888a77" stroke="#635d4a" strokeWidth="2" />
      <rect x="24" y="51" width="48" height="49" rx="4" fill="#525c53" />
      {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M28 ${57 + i * 6}h40`} stroke="#969780" strokeWidth="2" />)}
      <rect x="81" y="58" width="52" height="31" rx="3" fill="#c7bfa4" stroke="#675e4a" strokeWidth="2" />
      <path d="M87 73h39" stroke="#746b55" strokeWidth="2" /><circle cx="94" cy="73" r="7" fill="#6e6b5c" /><circle cx="120" cy="73" r="7" fill="#6e6b5c" />
      <path d="M83 99h8m5 0h8m5 0h8m5 0h8" stroke="#e2d8b9" strokeWidth="5" /><circle cx="133" cy="50" r="2.5" fill={playing ? "#e4bc69" : "#544d3b"} />
      <path d="M19 44h124v69H19z" fill={`url(#${grain})`} />
    </>}
    {kind === "television" && <>
      <path d="M64 35L44 13m24 21 28-22" stroke="#7d7561" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M23 39q0-6 7-6l104 1q7 0 7 7l-2 68q0 6-7 6H29q-7 0-7-7z" fill={`url(#${wood})`} stroke="#67533e" strokeWidth="2" />
      <rect x="31" y="43" width="79" height="59" rx="13" fill="#c1c4ae" stroke="#514d3f" strokeWidth="4" /><rect x="36" y="48" width="69" height="49" rx="10" fill={playing ? "#a8b7a1" : "#89988b"} />
      <path d="M41 56q27-13 58 0" stroke="#d8dfc6" opacity=".5" strokeWidth="3" /><path d="M43 81q15-13 27 0t27-2" stroke="#d8dfc6" opacity={playing ? ".7" : ".18"} strokeWidth="2" />
      <circle cx="125" cy="55" r="7" fill="#d1bea0" stroke="#594b3c" strokeWidth="2" /><path d="M125 50v10m-6 19h12m-12 5h12m-12 5h12" stroke="#61533f" strokeWidth="2" />
      <path d="M31 114l-4 7m103-7 4 7" stroke="#66513d" strokeWidth="4" /><path d="M24 36h114v76H24z" fill={`url(#${grain})`} />
    </>}
    {kind === "turntable" && <>
      <path d="M23 68L35 26l105 6-3 41" fill="#a89b85" fillOpacity=".4" stroke="#87735b" strokeWidth="2" />
      <path d="M24 70l113 1 9 36-124 4z" fill={`url(#${wood})`} stroke="#756046" strokeWidth="2" /><path d="M24 108l122-2v9L24 118z" fill="#785840" />
      <g transform="translate(75 85) scale(1 .36)"><g className="companion-record"><circle r="41" fill="#41473f" /><circle r="32" stroke="#748071" strokeWidth=".7" /><circle r="23" stroke="#748071" strokeWidth=".7" /><circle r="11" fill="#c09a75" /><path d="M-12-3l8-13" stroke="#e7d7b5" strokeWidth="2" opacity=".5" /></g></g>
      <path d="M127 75l-4 17-15 3" stroke="#c2baa3" strokeWidth="4" strokeLinecap="round" /><circle cx="127" cy="75" r="4" fill="#595b4e" /><path d="M27 109h115v6H27z" fill={`url(#${grain})`} />
    </>}
    {kind === "radio" && <>
      <path d="M28 111V54q0-22 23-23h65q20 0 20 22v58z" fill={`url(#${wood})`} stroke="#70583e" strokeWidth="2.5" /><path d="M39 104V59q0-14 14-14h29v59z" fill="#c6b38b" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${44 + i * 5} 54v46`} stroke="#71634b" strokeWidth="1.8" />)}
      <rect x="91" y="49" width="34" height="21" rx="3" fill="#c6bd97" /><path d="M96 54h24m-24 6h24m-11-9v16" stroke="#786a4c" strokeWidth="1.2" />
      <circle cx="100" cy="90" r="7" fill="#d5c19b" stroke="#5c503c" strokeWidth="2" /><circle cx="121" cy="90" r="7" fill="#d5c19b" stroke="#5c503c" strokeWidth="2" />
      <circle cx="120" cy="39" r="2.5" fill={playing ? "#e4bc69" : "#584a35"} /><path d="M28 34h108v78H28z" fill={`url(#${grain})`} /><path d="M24 114h116" stroke="#665039" strokeWidth="6" />
    </>}
    {isClock && <>
      {kind === "mantel" && <><path d="M40 109V64a40 40 0 0 1 80 0v45z" fill={`url(#${wood})`} stroke="#6d543b" strokeWidth="2" /><path d="M32 111h96v8H32z" fill="#785b3f" /><path d="M40 36h80v73H40z" fill={`url(#${grain})`} /></>}
      {kind === "kitchen" && <><path d="M43 103q-14-58 9-64h56q22 8 10 64l-7 11H50z" fill="#9ca99c" stroke="#657969" strokeWidth="2" /><path d="M67 29h27v11H67z" fill="#c1c6ad" stroke="#6b7868" strokeWidth="2" /></>}
      {kind === "alarm" && <><path d="M47 37Q29 17 49 15q18-2 15 16m33 0q-4-19 15-16t1 22" fill="#c99f8e" stroke="#947666" strokeWidth="2" /><path d="M48 104l-7 13m70-13 7 13M80 18v-6" stroke="#947666" strokeWidth="5" strokeLinecap="round" /><circle cx="80" cy="71" r="43" fill="#cda995" stroke="#947666" strokeWidth="2" /></>}
      {kind === "tea" && <><path d="M35 35l91 2 2 77-94 1z" fill={`url(#${wood})`} stroke="#715e43" strokeWidth="2" /><path d="M36 36h90v79H36z" fill={`url(#${grain})`} /><path d="M30 115h104" stroke="#65523a" strokeWidth="5" /></>}
      <circle cx="80" cy="72" r="32" fill="#ede3c8" stroke="#8f8063" strokeWidth="2" /><circle cx="80" cy="72" r="27" stroke="#b4a68b" strokeWidth=".6" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d="M80 44v4" transform={`rotate(${i * 30} 80 72)`} stroke="#8f8063" strokeWidth="1.5" />)}
      <path d="M80 72l-12-9" stroke="#6b634d" strokeWidth="3" strokeLinecap="round" /><path d="M80 72V51" transform={`rotate(${progress * 360} 80 72)`} stroke="#9f6c50" strokeWidth="2" strokeLinecap="round" /><circle cx="80" cy="72" r="3" fill="#776749" />
    </>}
  </svg>;
}
