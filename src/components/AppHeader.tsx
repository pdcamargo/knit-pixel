import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import { IconButton } from "./ui";

export function Logo() {
  return (
    <a href="#/" className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-ring" aria-label="Knit Pixel — library">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="size-9 dark:bg-white" />
      <span className="text-[17px] font-black tracking-[-0.03em] uppercase max-sm:sr-only">
        Knit <span className="text-primary">Pixel</span>
      </span>
    </a>
  );
}

export function AppHeader({ crumb, children }: { crumb?: ReactNode; children?: ReactNode }) {
  const [dark, setDark] = useTheme();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-2 bg-card px-3 md:h-[68px] md:gap-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <Logo />
        {crumb && (
          <>
            <span className="text-[17px] font-bold text-muted-foreground">/</span>
            <div className="min-w-0 truncate font-semibold">{crumb}</div>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {children}
        <IconButton icon={dark ? Sun : Moon} label={dark ? "Light mode" : "Dark mode"} bordered={false} onClick={() => setDark(!dark)} />
      </div>
    </header>
  );
}
