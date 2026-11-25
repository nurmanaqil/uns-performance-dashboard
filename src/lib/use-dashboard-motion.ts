"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useDashboardMotion(ready: boolean) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const printMedia = window.matchMedia("print");
    let lenis: Lenis | null = null;
    let printing = false;
    const tick = (time: number) => lenis?.raf(time * 1000);
    const destroy = () => {
      gsap.ticker.remove(tick);
      lenis?.off("scroll", ScrollTrigger.update);
      lenis?.destroy();
      lenis = null;
    };
    const sync = () => {
      destroy();
      if (reducedMotion.matches || printMedia.matches || printing) return;
      lenis = new Lenis({
        autoRaf: false, lerp: 0.12, smoothWheel: true, syncTouch: false,
        // Native input and nested table scrolling must not be intercepted.
        prevent: (node) => Boolean(node.closest(".table-wrapper, input, select, textarea, [data-lenis-prevent]")),
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.add(tick);
    };
    const beforePrint = () => { printing = true; destroy(); };
    const afterPrint = () => { printing = false; sync(); };
    sync();
    reducedMotion.addEventListener("change", sync);
    printMedia.addEventListener("change", sync);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      reducedMotion.removeEventListener("change", sync);
      printMedia.removeEventListener("change", sync);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      destroy();
    };
  }, []);
  useEffect(() => {
    if (!ready || !root.current) return;
    const media = gsap.matchMedia();
    let disposed = false;
    const animations: gsap.core.Animation[] = [];
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = root.current!.querySelectorAll("[data-kpi]");
        animations.push(gsap.from(cards, {
          y: 12, opacity: 0.5, duration: 0.4, stagger: 0.035,
          ease: "power2.out", clearProps: "transform,opacity",
        }));
        root.current!.querySelectorAll<HTMLElement>("[data-reveal]").forEach((section) => {
          animations.push(gsap.from(section, {
            y: 16, opacity: 0.5, duration: 0.4, ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: { trigger: section, start: "top 90%", once: true },
          }));
        });
      });
    }, root);
    const finish = () => animations.forEach((animation) => animation.progress(1));
    window.addEventListener("beforeprint", finish);
    document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => {
      disposed = true;
      window.removeEventListener("beforeprint", finish);
      media.revert();
      context.revert();
    };
  }, [ready]);
  return root;
}
