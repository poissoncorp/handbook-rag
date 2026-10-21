import { driver } from "https://cdn.jsdelivr.net/npm/driver.js@1.10.2/+esm";
import { api, openDocument, closeDocument } from "./shared.js";

// The "How it works" walkthrough: one question, followed one layer deeper at each step, so the
// reader sees what RavenDB did to answer it. One idea per step; the highlight shows what the
// sentence is about, and the strip at the top shows where in the pipeline we are.

const escape = (text) => Object.assign(document.createElement("span"), { textContent: text }).innerHTML;

/** Resolves once an element matching the selector is on the page, or after a few seconds. */
function appears(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const started = Date.now();
        const check = () => document.querySelector(selector) || Date.now() - started > timeout
            ? resolve()
            : setTimeout(check, 100);
        check();
    });
}

const stages = [
    { id: "markdown", label: "Markdown", kind: "app" },
    { id: "documents", label: "Documents", kind: "data" },
    { id: "chunks", label: "Chunks", kind: "ai" },
    { id: "search", label: "Vector search", kind: "data" },
    { id: "agent", label: "AI agent", kind: "ai" }
];

/** The pipeline as a row of chips; the step's stage is lit, or all of them for "all". */
function strip(stage) {
    const chips = stages.map((s) =>
        `<span class="stage ${s.kind}${stage === "all" || stage === s.id ? " lit" : ""}">${s.label}</span>`);
    return `<div class="pipeline">${chips.join("")}</div>`;
}

export function startTour({ user, ask, search }) {
    const tools = api("/api/agent/tools");
    const question = ask.question();
    const lastAnswer = () => [...document.querySelectorAll("#messages article")].at(-1);
    let turn = null;
    let result = null;
    let resizes = null;

    location.hash = "#ask";

    const steps = [
        {
            data: { stage: "all" },
            popover: {
                title: "Welcome to the handbook assistant",
                description: "It answers questions about company policies, and the whole AI pipeline behind it "
                    + "runs inside RavenDB. Let's follow one question through it.",
                nextBtnText: "Let's go"
            }
        },
        {
            element: "#ask",
            data: { stage: "agent" },
            popover: {
                title: "Ask a question",
                description: "Here is one about your department's policies.",
                nextBtnText: "Send it",
                onNextClick: () => {
                    turn = ask.send(question);
                    tour.moveNext();
                }
            }
        },
        {
            element: lastAnswer,
            // The answer grows while it streams; keep the highlight around it.
            onHighlighted: (element) => {
                resizes = new ResizeObserver(() => tour.refresh());
                resizes.observe(element);
            },
            onDeselected: () => resizes?.disconnect(),
            data: {
                stage: "agent",
                render: (popover) => {
                    popover.nextButton.disabled = true;
                    turn.then(() => { popover.nextButton.disabled = false; });
                }
            },
            popover: {
                title: "An answer, with its sources",
                description: "It is written from the company's documents, not from the model's memory.",
                onNextClick: async () => {
                    result = await turn;
                    if (!result?.sources.length) return tour.moveTo(searchStep);
                    tour.moveNext();
                }
            }
        },
        {
            element: () => lastAnswer().querySelector("footer small") ?? lastAnswer(),
            data: {
                stage: "search",
                render: async (popover) => {
                    const search = (await tools).find((tool) => tool.name === "search");
                    const query = escape(search?.query ?? "").replace("$query", "<mark>$query</mark>");
                    popover.description.innerHTML = "To find it, the agent called a query tool: in RavenDB, a tool "
                        + "can be just an RQL query. The model only fills in <mark>$query</mark>:"
                        + `<pre><code>${query}</code></pre>`;
                    tour.refresh();
                }
            },
            popover: {
                title: "The agent queried the database",
                description: "...",
                side: "top"
            }
        },
        {
            element: "#user",
            data: { stage: "search" },
            popover: {
                title: `It only sees ${escape(user.department)}`,
                description: "The application sets <code>$department</code> from the signed-in account; neither "
                    + "the user nor the model can change it. The agent's tools only search that department, so it "
                    + "can't reach anyone else's documents.<br><small>In this demo, this menu switches accounts.</small>"
            }
        },
        {
            element: () => lastAnswer().querySelector("footer a") ?? lastAnswer(),
            data: { stage: "documents" },
            popover: {
                title: "Where the answer came from",
                description: "Let's open the source and see what RavenDB made of it.",
                nextBtnText: "Open it",
                onNextClick: async () => {
                    await openDocument(result.sources[0].id, { modal: false });
                    tour.moveNext();
                }
            }
        },
        {
            element: "#document header",
            data: { stage: "documents" },
            popover: {
                title: "The source document",
                description: "Exactly as it is stored in RavenDB."
            }
        },
        {
            element: "#document .chunk-switch",
            data: { stage: "chunks" },
            popover: {
                title: "Now look at it the way RavenDB does",
                description: "Turn on <strong>Show chunks</strong>.",
                nextBtnText: "Turn it on",
                onNextClick: async () => {
                    document.querySelector("#document .chunk-switch input").click();
                    await appears("#document .prefix");
                    tour.moveNext();
                }
            }
        },
        {
            element: "#document .prefix",
            data: { stage: "chunks" },
            popover: {
                title: "This is what RavenDB embedded",
                description: "It cut the document into chunks and embedded each one with this line of context, "
                    + "written by an AI task. There is no chunking or embedding code in the app.",
                side: "bottom"
            }
        },
        {
            element: ".switch",
            onHighlightStarted: closeDocument,
            data: { stage: "search" },
            popover: {
                title: "Now search without the AI",
                description: "Same question, no model: just the retrieval.",
                nextBtnText: "Search it",
                onNextClick: async () => {
                    location.hash = "#search";
                    await search.run(question);
                    tour.moveNext();
                }
            }
        },
        {
            element: "#rql",
            onHighlightStarted: () => { document.querySelector("#rql").open = true; },
            data: { stage: "search" },
            popover: {
                title: "This is semantic search",
                description: "Normally the agent runs it for you; here you can see it at work yourself. The results "
                    + "above come from one RQL query: the department filter and the vector search together."
            }
        },
        {
            data: { stage: "all" },
            popover: {
                title: "Now it's your turn",
                description: "The app loads the markdown. RavenDB does everything else and keeps it current."
                    + "<ul>"
                    + "<li>Switch accounts and ask the same question.</li>"
                    + "<li>Ask something the documents don't cover.</li>"
                    + "<li>Change a document in RavenDB Studio (localhost:8080), then ask again.</li>"
                    + "</ul>",
                doneBtnText: "Start exploring"
            }
        }
    ];
    // Without an answer or a source there is nothing to open, so the walkthrough goes on to Search.
    const searchStep = steps.findIndex((step) => step.element === ".switch");

    const tour = driver({
        steps,
        showProgress: true,
        showButtons: ["next", "close"],
        popoverClass: "tour",
        overlayOpacity: 0.35,
        stagePadding: 6,
        stageRadius: 8,
        onPopoverRender: (popover, { state }) => {
            const step = state.activeStep;
            popover.wrapper.insertAdjacentHTML("afterbegin", strip(step.data?.stage));
            step.data?.render?.(popover);
        },
        onDestroyed: closeDocument
    });

    tour.drive();
}
