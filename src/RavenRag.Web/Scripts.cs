namespace RavenRag.Web;

/// <summary>The JavaScript and prompts that run inside RavenDB.</summary>
public static class Scripts
{
    public const string SummaryContext = "ai.genContext({ Title: this.Title, Content: this.Markdown });";

    // The summary becomes part of every chunk's context prefix, and the prefix shares the chunk's
    // token budget, so it has to stay short.
    public const string SummaryPrompt = """
        Write one sentence of at most 25 words that says what this document is, what it covers
        and who it applies to. Do not list individual rules, amounts or deadlines.
        """;

    public const string SummarySample = """{ "Summary": "One sentence of at most 25 words: what the document is and who it applies to." }""";

    public const string SummaryUpdate = "this.Summary = $output.Summary;";

    // Waits for the summary, so each document is embedded once and with its context.
    public const string Embeddings = $$"""
        if (this.Summary) {
            embeddings.generate({
                {{Names.EmbeddingsField}}: markdown.splitParagraphs(this.Markdown, 512)
                    .withContextPrefix(this.Title + '. ' + this.Summary)
            });
        }
        """;

    public const string AgentPrompt = """
        You answer questions about the company's internal documents.
        Search first, then read the documents whose title and summary fit the question, each one once.
        Search again with other words only if nothing fits.
        Answer only from what you read: quote the specific rule, amount or deadline and name the document.
        If several documents have a rule for it, give each one.
        If the documents do not cover the question, say so.
        Write the answer in Markdown. Put the ids of the documents you used in Sources.
        """;
}
