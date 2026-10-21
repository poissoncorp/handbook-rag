import { fetchEventSource } from "https://cdn.jsdelivr.net/npm/@microsoft/fetch-event-source@2.0.1/+esm";
import { el, markdown, errorText, documentUrl, userMenu } from "./shared.js";

const user = await userMenu();
const form = document.querySelector("#ask");
const fieldset = form.querySelector("fieldset");
const messages = document.querySelector("#messages");
const newConversation = document.querySelector("#new-conversation");
let conversationId = null;
let request = null;

newConversation.addEventListener("click", () => {
    request?.abort();
    conversationId = null;
    messages.replaceChildren();
    newConversation.hidden = true;
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = form.prompt.value.trim();
    const answer = el("article", { ariaBusy: "true" }, "Searching the documents...");
    messages.append(el("p", {}, el("strong", {}, prompt)), answer);
    form.prompt.value = "";
    fieldset.disabled = true;
    request = new AbortController();
    let text = "";

    try {
        await fetchEventSource("/api/ask", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ prompt, conversationId, userId: user.id }),
            signal: request.signal,
            openWhenHidden: true,
            async onopen(response) {
                if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            },
            onmessage({ event, data }) {
                const value = JSON.parse(data);
                if (event === "answer") {
                    text += value;
                    answer.removeAttribute("aria-busy");
                    keepAtBottom(() => answer.replaceChildren(markdown(text)));
                } else if (event === "done") {
                    conversationId = value.conversationId;
                    newConversation.hidden = false;
                    keepAtBottom(() => answer.append(details(value)));
                } else if (event === "error") {
                    answer.append(errorText(value));
                }
            },
            onerror(error) {
                throw error; // fetchEventSource retries unless the handler throws
            }
        });
    } catch (error) {
        answer.append(errorText(error.message));
    } finally {
        answer.removeAttribute("aria-busy");
        fieldset.disabled = false;
        form.prompt.focus();
    }
});

// Follow the answer as it grows, unless the reader has scrolled up.
function keepAtBottom(update) {
    const atBottom = innerHeight + scrollY >= document.body.scrollHeight - 50;
    update();
    if (atBottom) scrollTo(0, document.body.scrollHeight);
}

function details({ sources, searches, tokens, seconds }) {
    const links = sources.flatMap((source, i) => [
        i ? ", " : "",
        el("a", { href: documentUrl(source.id), target: "_blank" }, source.title)
    ]);
    return el("footer", {},
        sources.length ? el("p", {}, "Sources: ", ...links) : "",
        el("small", {},
            searches.length ? `Searched for ${searches.map((s) => `"${s}"`).join(", ")}. ` : "",
            `${tokens.toLocaleString()} tokens, ${seconds.toFixed(1)} s.`));
}
