"use client";

import { musicTracks } from "@/domain/musicTracks";
import { MusicControls } from "@/components/music/MusicControls";
import { useMusicStore } from "@/store/useMusicStore";
import styles from "./CassettePlayer.module.css";

/** Cassette structure adapted from Praashoo7's Uiverse design (public/demo/section2). */
export function CassetteArtwork({ playing, title }: { playing: boolean; title: string }) {
  return <div className={styles.cassette} data-playing={playing} aria-hidden="true">
    <span className={`${styles.screw} ${styles.topLeft}`}>+</span><span className={`${styles.screw} ${styles.topRight}`}>+</span>
    <div className={styles.label}>
      <div className={styles.handwritten}><span>A</span><span className={styles.trackTitle}>{title}</span></div>
      <div className={styles.yellow}>
        <div className={styles.window}><span className={styles.wheel} /><span className={styles.tape} /><span className={styles.wheel} /></div>
        <span className={styles.number}>90</span>
      </div>
      <div className={styles.rust}><span>NAMIYA</span><span>SIDE A</span></div>
    </div>
    <div className={styles.base}><i /><i /><span className={styles.screw}>+</span><i /><i /></div>
    <span className={`${styles.screw} ${styles.bottomLeft}`}>+</span><span className={`${styles.screw} ${styles.bottomRight}`}>+</span>
  </div>;
}

export function CassettePlayer() {
  const playing = useMusicStore(state => state.isPlaying);
  const trackId = useMusicStore(state => state.trackId);
  const title = musicTracks.find(track => track.id === trackId)?.title ?? "柜台的声音";
  return <div className={styles.player} aria-label="旧录音机播放器">
    <CassetteArtwork playing={playing} title={title} />
    <p className={styles.status}>{playing ? "正在听" : "已选"} · {title}</p>
    <MusicControls />
  </div>;
}
