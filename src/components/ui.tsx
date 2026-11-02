import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Minus, Plus } from "lucide-react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  /** Below md, show only the icon (the label stays for screen readers). */
  collapse?: boolean;
};

export function Button({ variant = "primary", size = "md", icon: Icon, collapse, className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      title={collapse && typeof children === "string" ? children : rest.title}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 border-2 font-bold whitespace-nowrap select-none disabled:opacity-40",
        focus,
        variant !== "ghost" && "hard-sm pressable border-border",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "outline" && "bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        variant === "ghost" && "border-transparent hover:bg-muted",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        collapse && "max-md:w-10 max-md:px-0",
        className,
      )}
    >
      {Icon && <Icon size={size === "lg" ? 18 : size === "sm" ? 14 : 16} strokeWidth={2.25} />}
      {collapse ? <span className="max-md:sr-only">{children}</span> : children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  size?: "sm" | "md";
  bordered?: boolean;
};

export function IconButton({ icon: Icon, label, active, size = "md", bordered = true, className, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center border-2 disabled:opacity-40",
        focus,
        size === "md" ? "size-10" : "size-8",
        bordered ? "border-border" : "border-transparent",
        active ? "bg-secondary text-secondary-foreground" : "bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        bordered && !active && "hard-xs pressable",
        className,
      )}
    >
      <Icon size={size === "md" ? 18 : 16} strokeWidth={2.25} />
    </button>
  );
}

export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: "neutral" | "primary" | "highlight" | "success" | "inverse" }) {
  return (
    <span
      className={cx(
        "label-caps inline-flex items-center border px-2 py-0.5",
        variant === "neutral" && "bg-card text-foreground",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "highlight" && "bg-accent text-accent-foreground",
        variant === "success" && "bg-success text-white",
        variant === "inverse" && "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, tall }: { value: number; tall?: boolean }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cx("overflow-hidden border-2 bg-card", tall ? "h-5" : "h-3")}
    >
      <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

export function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx("flex flex-col gap-3 border-2 bg-card p-4 hard-sm", className)}>
      <h2 className="label-caps">{title}</h2>
      {children}
    </section>
  );
}

export function Stat({ value, label, big }: { value: ReactNode; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cx("font-mono font-bold tabular-nums", big ? "text-[28px] leading-none tracking-[-0.04em] md:text-[40px]" : "text-[22px]")}>{value}</span>
      <span className="label-caps text-muted-foreground">{label}</span>
    </div>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label-caps">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 border-2 bg-card px-3 text-[15px] outline-none focus:border-ring focus:hard-sm"
      />
    </label>
  );
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const commit = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.round(n))));
  };
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="label-caps">{label}</span>
      <div className="flex h-9 items-stretch border-2 bg-card">
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={cx("grid w-8 shrink-0 place-items-center border-r-2 hover:bg-accent disabled:opacity-30", focus)}>
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <input
          key={value}
          defaultValue={value}
          inputMode="numeric"
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit(e.currentTarget.value)}
          className="w-full min-w-0 bg-transparent text-center font-mono text-[13px] outline-none"
        />
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={cx("grid w-8 shrink-0 place-items-center border-l-2 hover:bg-accent disabled:opacity-30", focus)}>
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>
    </label>
  );
}
