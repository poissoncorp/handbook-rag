import { api, el, errorText, documentUrl, userMenu } from "./shared.js";

const user = await userMenu();
const form = document.querySelector("form");
const results = document.querySelector("#results");
const rql = document.querySelector("#rql");
const q = new URLSearchParams(location.search).get("q") ?? "";

form.q.value = q;

if (q) {
    results.ariaBusy = "true";
    try {
        const response = await api(`/api/search?${new URLSearchParams({ q, user: user.id })}`);
        results.replaceChildren(...(response.hits.length ? response.hits.map(hit) : [el("p", {}, "No documents matched.")]));
        rql.querySelector("code").textContent = response.rql;
        rql.hidden = false;
    } catch (error) {
        results.replaceChildren(errorText(error.message));
    } finally {
        results.removeAttribute("aria-busy");
    }
}

function hit({ id, title, summary }) {
    return el("article", {},
        el("h4", {}, el("a", { href: documentUrl(id) }, title)),
        el("p", {}, summary ?? ""));
}
