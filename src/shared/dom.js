export const $ = (selector) => document.querySelector(selector);

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function emptyState(message) {
  return element("div", "empty-state", message);
}

export function apiUnavailableState() {
  const state = element("span", "api-unavailable-state");
  const image = element("img", "api-unavailable-image");
  image.src = "/assets/api-unavailable.png";
  image.alt = "Não foi possível carregar os dados. Verifique sua conexão com a internet ou tente novamente mais tarde.";
  state.append(image);
  return state;
}
