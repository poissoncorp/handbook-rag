using Raven.Client.Documents;
using Raven.Client.Documents.Linq;

namespace RavenRag.Web;

public sealed record SearchHit(string Id, string Title, string? Summary);

public sealed record SearchResponse(string Rql, List<SearchHit> Hits);

public sealed class SearchService(IDocumentStore store)
{
    // On this corpus every real question still finds its documents at 0.65 and unrelated ones find none.
    private const float MinimumSimilarity = 0.65f;

    public async Task<SearchResponse> SearchAsync(string text, string department, CancellationToken ct)
    {
        using var session = store.OpenAsyncSession();

        var search = session.Query<HandbookDocument>()
            .Where(d => d.Department == department)
            .VectorSearch(field => field.WithText(Names.EmbeddingsField).UsingTask(Names.EmbeddingsTask),
                value => value.ByText(text),
                MinimumSimilarity)
            .Take(5);

        var documents = await search.ToListAsync(ct);
        return new SearchResponse(search.ToString()!, [.. documents.Select(d => new SearchHit(d.Id, d.Title, d.Summary))]);
    }
}
