import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Section de page : intitulé, grand titre éditorial, texte, contenu. */
export function Section({
  children,
  eyebrow,
  title,
  description,
  as = "h2",
  action,
  className,
  containerClassName,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  as?: "h1" | "h2";
  /** Lien ou bouton aligné à droite du titre (ex. « Tout voir »). */
  action?: ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  const Heading = as;
  return (
    <section className={cn("py-14 sm:py-24", className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", containerClassName)}>
        {(eyebrow || title || description) && (
          <div
            data-apparait
            className="mb-9 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-12"
          >
            <div>
              {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
              {title && (
                <Heading className="max-w-3xl font-display text-[2.6rem] leading-[1] text-ink sm:text-6xl">
                  {title}
                </Heading>
              )}
              {description && (
                <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-taupe">
                  {description}
                </p>
              )}
            </div>
            {action}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
