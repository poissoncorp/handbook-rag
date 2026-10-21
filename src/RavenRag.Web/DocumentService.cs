using Raven.Client.Documents;

namespace RavenRag.Web;

public sealed record Source(string Id, string Title);

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

    private async Task<List<HandbookDocument>> LoadAsync(IEnumerable<string> ids, string department, CancellationToken ct)
    {
        using var session = store.OpenAsyncSession();
        var handbookIds = ids.Where(id => id.StartsWith($"{Names.Collection}/", StringComparison.OrdinalIgnoreCase)).Distinct();
        var documents = await session.LoadAsync<HandbookDocument>(handbookIds, ct);
        return [.. documents.Values.OfType<HandbookDocument>().Where(d => d.Department == department)];
    }
}
