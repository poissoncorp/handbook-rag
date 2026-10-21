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

// A few questions each department's documents answer, offered as the default text of an empty box.
const sampleQuestions = {
    "People Operations": [
        "Can I work from another country for a few weeks?",
        "How many days of paid sick leave do I get?",
        "How many vacation days can I carry over to next year?"
    ],
    "Finance": [
        "What is the hotel budget per night on a business trip?",
        "How do I submit a travel expense claim?",
        "Can I take a customer out to dinner on expenses?"
    ],
    "Procurement": [
        "How long do we have to reject a damaged pallet delivery?",
        "A supplier emailed asking us to change their bank details. What do we do?",
        "Who is allowed to sign a large contract?"
    ],
    "IT Security": [
        "Who leads the response during a severity one incident?",
        "Can I use my personal laptop for work?",
        "What should I do with a suspicious email attachment?"
    ],
    "Legal": [
        "How quickly must we report a personal data breach?",
        "How long do we keep CVs of rejected candidates?"
    ],
    "Compliance": [
        "How long do we keep customs paperwork?",
        "Can a customs declaration be corrected after it is submitted?"
    ],
    "Customer Operations": [
        "A customer says their shipment never arrived. What do I do?",
        "How quickly do we have to answer a customer?"
    ],
    "Operations": [
        "A forklift nearly hit someone in the warehouse. What now?",
        "What do I do if something spills in the warehouse?"
    ]
};

export function sampleQuestion(department) {
    const questions = sampleQuestions[department] ?? [];
    return questions[Math.floor(Math.random() * questions.length)] ?? "";
}

const chip = (department) => el("span", { className: "chip" }, department);

const departmentIcons = {
    "People Operations": "👥",
    "Finance": "💶",
    "Procurement": "📦",
    "IT Security": "🔐",
    "Legal": "⚖️",
    "Compliance": "🛃",
    "Customer Operations": "🎧",
    "Operations": "🚚"
};

const avatar = (user) => el("span", { className: "avatar", ariaHidden: "true" }, departmentIcons[user.department] ?? "👤");

const person = (user) => [avatar(user), el("span", {}, user.name)];

// ---- the user ----
// There is no sign-in: the page acts as the user picked in the menu, remembered in this browser.

const userKey = "handbook-user";
let currentUser = null;

/** Fills the user menu and returns the current user. Picking another user reloads the page. */
export async function userMenu() {
    const users = await api("/api/users");
    currentUser = users.find((u) => u.id === readStorage(userKey))
        ?? users.find((u) => u.department === "Finance") // the default user
        ?? users[0];

    const menu = document.querySelector("#user");
    const summary = menu.querySelector("summary");
    summary.replaceChildren(...person(currentUser));
    summary.removeAttribute("aria-busy");
    menu.querySelector("ul").replaceChildren(...users.map((u) => el("li", {},
        el("a", { href: "#", onclick: (event) => switchTo(event, u) }, ...person(u), chip(u.department)))));
    return currentUser;
}

function switchTo(event, user) {
    event.preventDefault();
    try { localStorage.setItem(userKey, user.id); } catch { /* storage blocked: stay on the default user */ }
    location.reload();
}

function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

// ---- documents open in a dialog ----

const dialog = document.body.appendChild(el("dialog", { id: "document" }));
dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close(); // a click on the backdrop
});

export function documentLink(id, title) {
    return el("a", { href: "#", onclick: (event) => { event.preventDefault(); openDocument(id); } }, title);
}

export const closeDocument = () => dialog.close();

/**
 * Opens a document in the dialog. The walkthrough opens it with the chunks shown and without the
 * modal top layer, so its own popovers can still point inside the dialog.
 */
export async function openDocument(id, { chunks: showChunksFirst = false, modal = true } = {}) {
    const close = el("button", { ariaLabel: "Close", onclick: closeDocument });
    close.setAttribute("rel", "prev");
    const title = el("h2", {}, "");
    const meta = el("small", {}, "");
    const showChunks = el("input", { type: "checkbox", role: "switch", checked: showChunksFirst });
    const body = el("div", { ariaBusy: "true" });
    dialog.replaceChildren(el("article", {},
        el("header", {}, close, title),
        el("div", { className: "doc-meta" }, meta, el("label", { className: "chunk-switch" }, showChunks, "Show chunks")),
        body));
    if (modal) dialog.showModal();
    else dialog.show();

    const query = new URLSearchParams({ id, user: currentUser.id });
    try {
        const doc = await api(`/api/documents?${query}`);
        title.textContent = doc.title;
        meta.textContent = `${doc.department}, revised ${doc.revised.slice(0, 10)}`;
        const text = markdown(doc.markdown);
        let chunks = null;

        // The chunks as the embeddings task embedded them, each with the prefix it was given.
        async function render() {
            try {
                if (!showChunks.checked) return body.replaceChildren(text);
                chunks ??= await api(`/api/documents/chunks?${query}`);
                body.replaceChildren(...chunks.map((chunk, i) => el("section", { className: "chunk" },
                    el("small", {}, `Chunk ${i + 1} of ${chunks.length}`),
                    chunk.prefix ? el("p", { className: "prefix" }, el("strong", {}, "Prefix "), chunk.prefix) : "",
                    markdown(chunk.text))));
            } catch (error) {
                body.replaceChildren(errorText(error.message));
            }
        }

        showChunks.addEventListener("change", render);
        await render();
    } catch (error) {
        body.replaceChildren(errorText(error.status === 404 ? `This document is not available to ${currentUser.name}.` : error.message));
    } finally {
        body.removeAttribute("aria-busy");
    }
}
