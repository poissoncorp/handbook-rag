using Newtonsoft.Json;
using Raven.Client.Documents;

namespace RavenRag.Web;

public sealed record Source(string Id, string Title);

/// <summary>One embedded chunk: the context prefix RavenDB added and the text it came from.</summary>
public sealed record Chunk(string Prefix, string Text);

/// <summary>Reads handbook documents, limited to one department.</summary>
public sealed class DocumentService(IDocumentStore store)
{
    public async Task<HandbookDocument?> GetAsync(string id, string department, CancellationToken ct)
    {
        var documents = await LoadAsync([id], department, ct);
        return documents.SingleOrDefault();
    }

    /// <summary>Titles for the ids the agent cites.</summary>
    public async Task<List<Source>> GetSourcesAsync(IEnumerable<string> ids, string department, CancellationToken ct)
    {
        var documents = await LoadAsync(ids, department, ct);
        return [.. documents.Select(d => new Source(d.Id, d.Title))];
    }

    /// <summary>
    /// The chunks the embeddings task embedded for a document, in order. RavenDB keeps their text
    /// (StoreChunkText) in the document's entry in the @embeddings collection.
    /// </summary>
    public async Task<List<Chunk>?> GetChunksAsync(string id, string department, CancellationToken ct)
    {
        if (await GetAsync(id, department, ct) is not { } document)
            return null;

        using var session = store.OpenAsyncSession();
        var embeddings = await session.LoadAsync<StoredEmbeddings>($"embeddings/{id}", ct);
        if (embeddings?.Task is not { } task)
            return [];

        // The same prefix the embeddings script builds: title and summary, then a space.
        var prefix = $"{document.Title}. {document.Summary}";
        return [.. task.Chunks.Select(hash => task.Text[hash]).Select(text => text.StartsWith(prefix)
            ? new Chunk(prefix, text[prefix.Length..].TrimStart())
            : new Chunk("", text))];
    }

    private async Task<List<HandbookDocument>> LoadAsync(IEnumerable<string> ids, string department, CancellationToken ct)
    {
        using var session = store.OpenAsyncSession();
        var handbookIds = ids.Where(id => id.StartsWith($"{Names.Collection}/", StringComparison.OrdinalIgnoreCase)).Distinct();
        var documents = await session.LoadAsync<HandbookDocument>(handbookIds, ct);
        return [.. documents.Values.OfType<HandbookDocument>().Where(d => d.Department == department)];
    }

    private sealed class StoredEmbeddings
    {
        [JsonProperty(Names.EmbeddingsTask)]
        public StoredTask? Task { get; set; }
    }

    private sealed class StoredTask
    {
        /// <summary>Chunk hashes in document order.</summary>
        [JsonProperty(Names.EmbeddingsField)]
        public List<string> Chunks { get; set; } = [];

        [JsonProperty("@chunk-text")]
        public Dictionary<string, string> Text { get; set; } = [];
    }
}
