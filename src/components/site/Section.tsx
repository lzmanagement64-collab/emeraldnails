import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  children,
  eyebrow,
  title,
  description,
  as = "h2",
  className,
  containerClassName,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  as?: "h1" | "h2";
  className?: string;
  containerClassName?: string;
}) {
  const Heading = as;
  return (
    <section className={cn("py-16 sm:py-24", className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", containerClassName)}>
        {(eyebrow || title || description) && (
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
              {title && (
                <Heading className="max-w-2xl font-display text-3xl leading-[1.1] text-ink sm:text-4xl">
                  {title}
                </Heading>
              )}
              {description && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-taupe">{description}</p>
              )}
            </div>
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
