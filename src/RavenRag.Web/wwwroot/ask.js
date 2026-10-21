import { fetchEventSource } from "https://cdn.jsdelivr.net/npm/@microsoft/fetch-event-source@2.0.1/+esm";
import { el, markdown, errorText, documentLink, sampleQuestion } from "./shared.js";

/** The Ask mode: a conversation with the agent, answers streamed as they are written. */
export function setupAsk(user) {
    const form = document.querySelector("#ask");
    const fieldset = form.querySelector("fieldset");
    const messages = document.querySelector("#messages");
    const newConversation = document.querySelector("#new-conversation");
    let conversationId = null;
    let request = null;

    // A new conversation starts with a sample question in the box, ready to send.
    const offerSampleQuestion = () => (form.prompt.value = sampleQuestion(user.department));
    offerSampleQuestion();

    newConversation.addEventListener("click", () => {
        request?.abort();
        conversationId = null;
        messages.replaceChildren();
        newConversation.hidden = true;
        offerSampleQuestion();
        form.prompt.focus();
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        send(form.prompt.value.trim());
    });

    /** Asks one question and streams the answer. Returns the finished turn, or null if it failed. */
    async function send(prompt) {
        let result = null;
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
                        result = value;
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
        return result;
    }

    return {
        send,
        question: () => form.prompt.value.trim() || sampleQuestion(user.department),
        focus: () => form.prompt.focus()
    };
}

// Follow the answer as it grows, unless the reader has scrolled up.
function keepAtBottom(update) {
    const atBottom = innerHeight + scrollY >= document.body.scrollHeight - 50;
    update();
    if (atBottom) scrollTo(0, document.body.scrollHeight);
}

function details({ sources, searches, tokens, seconds }) {
    const links = sources.flatMap((source, i) => [i ? ", " : "", documentLink(source.id, source.title)]);
    return el("footer", {},
        sources.length ? el("p", {}, "Sources: ", ...links) : "",
        el("small", {},
            searches.length ? `Searched for ${searches.map((s) => `"${s}"`).join(", ")}. ` : "",
            `${tokens.toLocaleString()} tokens, ${seconds.toFixed(1)} s.`));
}
