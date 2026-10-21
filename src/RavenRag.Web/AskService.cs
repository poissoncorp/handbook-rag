using System.Net.ServerSentEvents;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading.Channels;
using Newtonsoft.Json;
using Raven.Client.Documents;
using Raven.Client.Documents.AI;

namespace RavenRag.Web;

public sealed record AskRequest(string Prompt, string? ConversationId, string UserId);

public sealed record AskResult(string ConversationId, List<Source> Sources, List<string> Searches, long Tokens, double Seconds);

/// <summary>The shape the agent answers in.</summary>
public sealed class AgentAnswer
{
    public string Answer { get; set; } = "";
    public List<string> Sources { get; set; } = [];
}

/// <summary>
/// Runs one turn of a conversation and streams it as server-sent events: "answer" events carry
/// the text as the model writes it, then a single "done" or "error" event ends the turn.
/// </summary>
public sealed class AskService(IDocumentStore store, DocumentService documents, ILogger<AskService> log)
{
    public async IAsyncEnumerable<SseItem<object>> AskAsync(
        string prompt, string? conversationId, User user, [EnumeratorCancellation] CancellationToken ct)
    {
        var chat = store.AI.Conversation(
            Names.Agent,
            conversationId ?? Names.NewConversation,
            new AiConversationCreationOptions().AddParameter("department", user.Department));
        chat.SetUserPrompt(prompt);

        var chunks = Channel.CreateUnbounded<string>();
        var run = RunAsync(chat, chunks.Writer, ct);

        await foreach (var chunk in chunks.Reader.ReadAllAsync(ct))
            yield return new SseItem<object>(chunk, "answer");

        var (result, error) = await run;
        if (result is null)
        {
            yield return new SseItem<object>(error!, "error");
            yield break;
        }

        yield return new SseItem<object>(new AskResult(
            chat.Id,
            await documents.GetSourcesAsync(result.Answer.Sources, user.Department, ct),
            await GetLastSearchesAsync(chat.Id, ct),
            result.Usage.TotalTokens,
            result.Elapsed.TotalSeconds), "done");
    }

    private async Task<(AiAnswer<AgentAnswer>? Result, string? Error)> RunAsync(
        IAiConversationOperations chat, ChannelWriter<string> chunks, CancellationToken ct)
    {
        try
        {
            var result = await chat.StreamAsync<AgentAnswer>(a => a.Answer, chunk => chunks.WriteAsync(chunk, ct).AsTask(), ct);
            return (result, null);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogError(e, "The agent failed to answer.");
            return (null, "The agent failed to answer. The application log has the details.");
        }
        finally
        {
            chunks.Complete();
        }
    }

    /// <summary>What the model searched for in the last turn, read from the conversation document.</summary>
    private async Task<List<string>> GetLastSearchesAsync(string conversationId, CancellationToken ct)
    {
        using var session = store.OpenAsyncSession();
        var conversation = await session.LoadAsync<StoredConversation>(conversationId, ct);

        return [.. conversation.Messages
            .AsEnumerable()
            .Reverse()
            .TakeWhile(m => m.Role != "user")
            .Reverse()
            .SelectMany(m => m.ToolCalls ?? [])
            .Where(c => c.Function.Name == "search")
            .Select(c => JsonDocument.Parse(c.Function.Arguments).RootElement.GetProperty("query").GetString() ?? "")];
    }

    private sealed class StoredConversation
    {
        public List<Message> Messages { get; set; } = [];
    }

    private sealed class Message
    {
        public string Role { get; set; } = "";

        [JsonProperty("tool_calls")]
        public List<ToolCall>? ToolCalls { get; set; }
    }

    private sealed class ToolCall
    {
        public ToolFunction Function { get; set; } = new();
    }

    private sealed class ToolFunction
    {
        public string Name { get; set; } = "";
        public string Arguments { get; set; } = "{}";
    }
}
