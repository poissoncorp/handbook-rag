import { userMenu } from "./shared.js";
import { setupAsk } from "./ask.js";
import { setupSearch } from "./search.js";
import { startTour } from "./tour.js";

const user = await userMenu();
const ask = setupAsk(user);
const search = setupSearch(user);

// Ask and Search are two modes of one page; the switch changes the hash.
function showMode() {
    const mode = location.hash === "#search" ? "search" : "ask";
    document.querySelector("#ask-view").hidden = mode !== "ask";
    document.querySelector("#search-view").hidden = mode !== "search";
    for (const link of document.querySelectorAll(".switch a")) {
        if (link.hash === `#${mode}`) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }
    (mode === "ask" ? ask : search).focus();
}

addEventListener("hashchange", showMode);
showMode();

document.querySelector("#explain").addEventListener("click", () => startTour({ user, ask, search }));
