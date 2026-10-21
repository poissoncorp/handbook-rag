import { api, el, markdown, errorText, userMenu } from "./shared.js";

const user = await userMenu();
const article = document.querySelector("#document");
const id = new URLSearchParams(location.search).get("id") ?? "";

try {
    const doc = await api(`/api/documents?${new URLSearchParams({ id, user: user.id })}`);
    document.title = doc.title;
    article.replaceChildren(
        el("h1", {}, doc.title),
        el("p", {}, el("small", {}, `${doc.department}, revised ${doc.revised.slice(0, 10)}`)),
        markdown(doc.markdown));
} catch (error) {
    article.replaceChildren(errorText(error.status === 404
        ? `This document does not exist or is not available to ${user.name}.`
        : error.message));
} finally {
    article.removeAttribute("aria-busy");
}
