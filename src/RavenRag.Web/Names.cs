namespace RavenRag.Web;

/// <summary>Identifiers shared by the deployed tasks, the agent and the queries that refer to them.</summary>
public static class Names
{
    public const string Collection = "HandbookDocuments";

    public const string AgentConnection = "handbook-agent";
    public const string SummaryConnection = "handbook-summaries";
    public const string EmbeddingsConnection = "handbook-embeddings";

    public const string SummaryTask = "handbook-summaries";
    public const string EmbeddingsTask = "handbook-embeddings";

    /// <summary>The embedded field, named after the property its chunks come from.</summary>
    public const string EmbeddingsField = "Markdown";

    public const string Agent = "handbook-assistant";

    /// <summary>A conversation id ending in a bare prefix makes RavenDB start a new conversation.</summary>
    public const string NewConversation = "HandbookChats/";
}
