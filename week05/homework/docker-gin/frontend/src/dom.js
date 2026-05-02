export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

export function button(text, onClick, extraClass = "") {
  const cls = ["btn", extraClass].filter(Boolean).join(" ").trim();
  const b = el("button", { type: "button", class: cls, text });
  b.addEventListener("click", onClick);
  return b;
}

export function input(placeholder, type = "text") {
  return el("input", { placeholder, type, class: "input" });
}

export function card(title, bodyChildren, cardClass = "card") {
  return el("div", { class: cardClass }, [
    el("div", { class: "card-title", text: title }),
    el("div", { class: "card-body" }, bodyChildren)
  ]);
}
