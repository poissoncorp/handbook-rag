using System.ComponentModel.DataAnnotations;

namespace RavenRag.Web;

public sealed class RavenSettings
{
    [Required] public string Url { get; set; } = "";
    [Required] public string Database { get; set; } = "";
}

public sealed class AiSettings
{
    [Required(ErrorMessage = "Set Ai:ApiKey (environment variable Ai__ApiKey) to an OpenAI API key.")]
    public string ApiKey { get; set; } = "";

    [Required] public string Endpoint { get; set; } = "";
    [Required] public string AgentModel { get; set; } = "";
    [Required] public string SummaryModel { get; set; } = "";
    [Required] public string EmbeddingModel { get; set; } = "";
}

public sealed class SampleDataSettings
{
    /// <summary>Directory with handbook/*.md and users.json, absolute or relative to the content root.</summary>
    [Required] public string Path { get; set; } = "";
}
