import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.7/lib/marked.esm.js";
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.es.mjs";

export async function api(path) {
    const response = await fetch(path, { headers: { accept: "application/json" } });
    if (!response.ok) {
        const problem = await response.json().catch(() => null);
        const message = problem?.detail ?? problem?.title ?? `${response.status} ${response.statusText}`;
        throw Object.assign(new Error(message), { status: response.status });
    }
    return response.json();
}

/** Creates an element. Children are nodes or strings; strings become text, never HTML. */
export function el(tag, properties = {}, ...children) {
    const element = Object.assign(document.createElement(tag), properties);
    element.append(...children);
    return element;
}

// Answers come from a model and documents from the database, so the HTML is sanitized.
export const markdown = (text) => el("div", { innerHTML: DOMPurify.sanitize(marked.parse(text)) });

export const errorText = (message) => el("p", { className: "error" }, message);

export const documentUrl = (id) => `document.html?${new URLSearchParams({ id })}`;

const chip = (department) => el("span", { className: "chip" }, department);

// There is no sign-in: the page acts as the user picked in the menu, remembered in this browser.
const userKey = "handbook-user";

/** Fills the user menu and returns the current user. Picking another user reloads the page. */
export async function userMenu() {
    const users = await api("/api/users");
    const user = users.find((u) => u.id === readStorage(userKey)) ?? users[0];
    const menu = document.querySelector("#user");
    const summary = menu.querySelector("summary");

    summary.replaceChildren(user.name, " ", chip(user.department));
    summary.removeAttribute("aria-busy");
    menu.querySelector("ul").replaceChildren(...users.map((u) => el("li", {},
        el("a", { href: "#", onclick: (event) => switchTo(event, u) }, u.name, " ", chip(u.department)))));
    return user;
}

function switchTo(event, user) {
    event.preventDefault();
    try { localStorage.setItem(userKey, user.id); } catch { /* storage blocked: stay on the default user */ }
    location.reload();
}

function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}
