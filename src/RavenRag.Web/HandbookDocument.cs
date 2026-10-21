namespace RavenRag.Web;

public sealed class HandbookDocument
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Department { get; set; } = "";
    public DateTime Revised { get; set; }
    public string Markdown { get; set; } = "";

    /// <summary>Written by the GenAI task. Used as context for every embedded chunk.</summary>
    public string? Summary { get; set; }
}
