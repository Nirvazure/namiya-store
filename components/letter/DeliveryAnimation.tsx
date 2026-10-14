"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export type MailFlight = { from: { x: number; y: number }; to: { x: number; y: number }; slotWidth: number };

export function DeliveryAnimation({ flight }: { flight: MailFlight }) {
  const envelope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = gsap.matchMedia();
    media.add({ motion: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (context) => {
      const ctx = gsap.context(() => {
        if (context.conditions?.reduced) {
          gsap.set(envelope.current, { x: flight.to.x - 72, y: flight.to.y - 45 });
          gsap.to(envelope.current, { opacity: 0, duration: .15 });
          return;
        }
        const flap = document.querySelector(".mail-slot-flap");
        const scale = Math.min(.8, flight.slotWidth / 145);
        const timeline = gsap.timeline();
        gsap.set(envelope.current, { x: flight.from.x - 72, y: flight.from.y - 45, rotation: -8 });
        timeline.to(envelope.current, { y: flight.from.y - 95, rotation: 3, duration: .3, ease: "power2.out" })
          .to(envelope.current, { x: flight.to.x - 72, y: flight.to.y - 45, rotation: 0, scale, duration: .9, ease: "power2.inOut" })
          .to(envelope.current, { scaleY: .03, opacity: 0, duration: .3, ease: "power2.in" });
        if (flap) {
          timeline.to(flap, { rotationX: -75, duration: .25, transformOrigin: "50% 0%", ease: "power2.out" }, .65)
            .to(flap, { rotationX: 0, duration: .3, ease: "power2.out" }, 1.45);
        }
      });
      return () => ctx.revert();
    });
    return () => media.revert();
  }, [flight]);

  return <div className="post-flight-layer" aria-hidden="true"><div className="post-flight-envelope held-envelope" ref={envelope}><span className="envelope-seal">解</span></div></div>;
}
