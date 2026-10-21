using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Raven.Client.Documents;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace RavenRag.Web;

/// <summary>Loads the sample documents and users into an empty database.</summary>
public sealed partial class SampleData(IDocumentStore store, IOptions<SampleDataSettings> settings, IWebHostEnvironment env)
{
    private static readonly IDeserializer Yaml = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .IgnoreUnmatchedProperties()
        .Build();

    public async Task SeedAsync(CancellationToken ct = default)
    {
        using var session = store.OpenAsyncSession();
        if (await session.Query<HandbookDocument>().AnyAsync(ct))
            return;

        var directory = Path.Combine(env.ContentRootPath, settings.Value.Path);

        foreach (var path in Directory.GetFiles(Path.Combine(directory, "handbook"), "*.md"))
            await session.StoreAsync(ReadDocument(path), ct);

        var users = JsonSerializer.Deserialize<List<User>>(await File.ReadAllTextAsync(Path.Combine(directory, "users.json"), ct))!;
        foreach (var user in users)
            await session.StoreAsync(user, ct);

        await session.SaveChangesAsync(ct);
    }

    private static HandbookDocument ReadDocument(string path)
    {
        var match = FrontMatter().Match(File.ReadAllText(path));
        if (!match.Success)
            throw new InvalidDataException($"{path} does not start with YAML front matter.");

        var meta = Yaml.Deserialize<Meta>(match.Groups["yaml"].Value);
        return new HandbookDocument
        {
            Id = $"{Names.Collection}/{Path.GetFileNameWithoutExtension(path)}",
            Title = meta.Title,
            Department = meta.Department,
            Revised = meta.Revised,
            Markdown = match.Groups["body"].Value.Trim()
        };
    }

    [GeneratedRegex(@"\A---\r?\n(?<yaml>.*?)\r?\n---\r?\n(?<body>.*)\z", RegexOptions.Singleline)]
    private static partial Regex FrontMatter();

    private sealed class Meta
    {
        public string Title { get; set; } = "";
        public string Department { get; set; } = "";
        public DateTime Revised { get; set; }
    }
}
