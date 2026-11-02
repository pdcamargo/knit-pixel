import { Library } from "./screens/Library";
import { Editor } from "./screens/Editor";
import { Tracker } from "./screens/Tracker";
import { useRoute } from "./lib/router";
import { usePatterns } from "./lib/store";
import { useToasts } from "./lib/toast";
import { useTheme } from "./lib/theme";
import { Button } from "./components/ui";
import { AppHeader } from "./components/AppHeader";

export function App() {
  useTheme();
  const route = useRoute();
  const patterns = usePatterns();
  const pattern = route.name === "library" ? undefined : patterns.find((p) => p.id === route.id);

  let screen;
  if (route.name === "library") screen = <Library />;
  else if (!pattern) screen = <NotFound />;
  // Keyed so switching patterns resets editor history and tool state.
  else if (route.name === "edit") screen = <Editor key={pattern.id} pattern={pattern} />;
  else screen = <Tracker key={pattern.id} pattern={pattern} />;

  return (
    <>
      {screen}
      <Toasts />
    </>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grid flex-1 place-items-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-[22px] font-extrabold">That pattern isn't here.</p>
          <Button onClick={() => (window.location.hash = "/")}>Back to library</Button>
        </div>
      </main>
    </div>
  );
}

function Toasts() {
  const toasts = useToasts();
  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={"max-w-sm border-2 px-4 py-3 text-[13px] font-semibold hard-sm " + (t.kind === "error" ? "bg-destructive text-destructive-foreground" : "bg-card")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
