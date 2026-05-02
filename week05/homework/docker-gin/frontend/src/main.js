import "./styles.css";
import { startRouter } from "./router.js";
import { renderAuth } from "./views/auth.js";
import { renderWorkspace } from "./views/workspace.js";

const root = document.querySelector("#app");

startRouter((path) => {
  if (!root) return;
  if (path === "/login") {
    renderAuth(root);
  } else {
    renderWorkspace(root);
  }
});
