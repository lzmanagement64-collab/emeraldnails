import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Apparition douce des blocs marqués `data-apparait` lorsqu'ils entrent à l'écran.
 * Sans JavaScript (ou si l'animation est désactivée), tout reste visible.
 */
export function AnimationsDefilement() {
  const chemin = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const racine = document.documentElement;
    racine.classList.add("anim-pret");
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-apparait]").forEach((el) => el.classList.add("est-visible"));
      return;
    }
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) {
            e.target.classList.add("est-visible");
            observateur.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const observer = () =>
      document
        .querySelectorAll("[data-apparait]:not(.est-visible)")
        .forEach((el) => observateur.observe(el));
    observer();
    // Contenus chargés après coup (photos, prestations…)
    const mutations = new MutationObserver(observer);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observateur.disconnect();
      mutations.disconnect();
    };
  }, [chemin]);

  return null;
}
