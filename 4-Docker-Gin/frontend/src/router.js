import { getToken } from "./api.js";

export function currentPath() {
  let p = window.location.pathname || "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

export function navigate(to, { replace = false } = {}) {
  const fn = replace ? history.replaceState.bind(history) : history.pushState.bind(history);
  fn(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** @returns {'/login' | '/app'} */
export function resolveRoute() {
  let path = currentPath();

  if (!["/", "/login", "/app"].includes(path)) {
    history.replaceState(null, "", "/");
    path = "/";
  }

  if (path === "/") {
    const target = getToken() ? "/app" : "/login";
    history.replaceState(null, "", target);
    return target;
  }

  if (path === "/app" && !getToken()) {
    history.replaceState(null, "", "/login");
    return "/login";
  }

  if (path === "/login" && getToken()) {
    history.replaceState(null, "", "/app");
    return "/app";
  }

  return path;
}

export function startRouter(onRoute) {
  const run = () => onRoute(resolveRoute());
  window.addEventListener("popstate", run);
  run();
}
