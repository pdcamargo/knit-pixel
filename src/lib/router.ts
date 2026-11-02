import { useSyncExternalStore } from "react";

export type Route = { name: "library" } | { name: "edit"; id: string } | { name: "track"; id: string };

function parse(hash: string): Route {
  const [, view, id] = hash.replace(/^#/, "").split("/");
  if (view === "edit" && id) return { name: "edit", id };
  if (view === "track" && id) return { name: "track", id };
  return { name: "library" };
}

const subscribe = (l: () => void) => {
  window.addEventListener("hashchange", l);
  return () => window.removeEventListener("hashchange", l);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parse(hash);
}

export function navigate(route: Route) {
  window.location.hash = route.name === "library" ? "/" : `/${route.name}/${route.id}`;
}
