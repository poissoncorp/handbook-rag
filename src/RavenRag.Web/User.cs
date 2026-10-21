using Raven.Client.Documents;

namespace RavenRag.Web;

public sealed class User
{
    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public string Department { get; set; } = "";
}

/// <summary>
/// There is no sign-in in this sample: the page says which user it acts as. In a real application
/// the user comes from authentication and everything downstream stays the same.
/// </summary>
public sealed class UserService(IDocumentStore store)
{
    public async Task<List<User>> GetAllAsync(CancellationToken ct)
    {
        using var session = store.OpenAsyncSession();
        var users = await session.Query<User>().ToListAsync(ct);
        return [.. users.OrderBy(u => u.Name)];
    }

    public async Task<User?> GetAsync(string? id, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(id))
            return null;

        using var session = store.OpenAsyncSession();
        return await session.LoadAsync<User>(id, ct);
    }
}
