import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  children,
  eyebrow,
  title,
  className,
  containerClassName,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section className={cn("py-16 sm:py-24", className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", containerClassName)}>
        {(eyebrow || title) && (
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
              {title && (
                <h2 className="max-w-2xl font-display text-3xl leading-[1.1] text-ink sm:text-4xl">
                  {title}
                </h2>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
