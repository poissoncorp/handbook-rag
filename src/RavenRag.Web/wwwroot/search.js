import { api, el, errorText, documentLink, sampleQuestion } from "./shared.js";

/** The Search mode: one vector search query, no model. */
export function setupSearch(user) {
    const form = document.querySelector("#search");
    const results = document.querySelector("#results");
    const rql = document.querySelector("#rql");

    form.q.value = sampleQuestion(user.department);
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        run(form.q.value.trim());
    });

    async function run(q) {
        form.q.value = q;
        results.ariaBusy = "true";
        try {
            const response = await api(`/api/search?${new URLSearchParams({ q, user: user.id })}`);
            results.replaceChildren(...(response.hits.length
                ? response.hits.map(hit)
                : [el("p", {}, `No ${user.department} document is close enough in meaning.`)]));
            rql.querySelector("code").textContent = response.rql;
            rql.hidden = false;
        } catch (error) {
            results.replaceChildren(errorText(error.message));
        } finally {
            results.removeAttribute("aria-busy");
        }
    }

    return { run, focus: () => form.q.focus() };
}

function hit({ id, title, summary }) {
    return el("article", {}, el("h4", {}, documentLink(id, title)), el("p", {}, summary ?? ""));
}
