using Microsoft.Extensions.Options;
using Raven.Client.Documents;
using Raven.Client.Documents.Operations.AI;
using Raven.Client.Documents.Operations.AI.Agents;
using Raven.Client.Documents.Operations.ConnectionStrings;
using Raven.Client.Documents.Operations.OngoingTasks;
using Raven.Client.ServerWide;
using Raven.Client.ServerWide.Operations;

namespace RavenRag.Web;

/// <summary>
/// Deploys the pipeline: the database, the AI connection strings, the GenAI task, the embeddings
/// task and the agent. Everything is created or updated, so it runs on every start.
/// </summary>
public sealed class PipelineSetup(IDocumentStore store, IOptions<AiSettings> ai)
{
    public async Task DeployAsync(CancellationToken ct = default)
    {
        await EnsureDatabaseAsync(ct);
        await PutConnectionStringsAsync(ct);
        await PutSummaryTaskAsync(ct);
        await PutEmbeddingsTaskAsync(ct);
        await PutAgentAsync(ct);
    }

    private async Task EnsureDatabaseAsync(CancellationToken ct)
    {
        var record = await store.Maintenance.Server.SendAsync(new GetDatabaseRecordOperation(store.Database), ct);
        if (record is null)
            await store.Maintenance.Server.SendAsync(new CreateDatabaseOperation(new DatabaseRecord(store.Database)), ct);
    }

    private async Task PutConnectionStringsAsync(CancellationToken ct)
    {
        var settings = ai.Value;
        await PutConnectionStringAsync(Names.AgentConnection, AiModelType.Chat, settings.AgentModel, ct);
        await PutConnectionStringAsync(Names.SummaryConnection, AiModelType.Chat, settings.SummaryModel, ct);
        await PutConnectionStringAsync(Names.EmbeddingsConnection, AiModelType.TextEmbeddings, settings.EmbeddingModel, ct);
    }

    private Task PutConnectionStringAsync(string name, AiModelType type, string model, CancellationToken ct) =>
        store.Maintenance.SendAsync(new PutConnectionStringOperation<AiConnectionString>(new AiConnectionString
        {
            Name = name,
            Identifier = name,
            ModelType = type,
            OpenAiSettings = new OpenAiSettings(ai.Value.ApiKey, ai.Value.Endpoint, model)
        }), ct);

    private async Task PutSummaryTaskAsync(CancellationToken ct)
    {
        var config = new GenAiConfiguration
        {
            Name = Names.SummaryTask,
            Identifier = Names.SummaryTask,
            ConnectionStringName = Names.SummaryConnection,
            Collection = Names.Collection,
            GenAiTransformation = new GenAiTransformation { Script = Scripts.SummaryContext },
            Prompt = Scripts.SummaryPrompt,
            SampleObject = Scripts.SummarySample,
            UpdateScript = Scripts.SummaryUpdate
        };

        if (await FindTaskIdAsync(Names.SummaryTask, OngoingTaskType.GenAi, ct) is { } taskId)
            await store.Maintenance.SendAsync(new UpdateGenAiOperation(taskId, config), ct);
        else
            await store.Maintenance.SendAsync(new AddGenAiOperation(config), ct);
    }

    private async Task PutEmbeddingsTaskAsync(CancellationToken ct)
    {
        var config = new EmbeddingsGenerationConfiguration
        {
            Name = Names.EmbeddingsTask,
            Identifier = Names.EmbeddingsTask,
            ConnectionStringName = Names.EmbeddingsConnection,
            Collection = Names.Collection,
            EmbeddingsTransformation = new EmbeddingsTransformation { Script = Scripts.Embeddings },
            // Required. How search terms are chunked before embedding; the defaults suit short queries.
            ChunkingOptionsForQuerying = new ChunkingOptions()
        };

        if (await FindTaskIdAsync(Names.EmbeddingsTask, OngoingTaskType.EmbeddingsGeneration, ct) is { } taskId)
            await store.Maintenance.SendAsync(new UpdateEmbeddingsGenerationOperation(taskId, config), ct);
        else
            await store.Maintenance.SendAsync(new AddEmbeddingsGenerationOperation(config), ct);
    }

    private async Task PutAgentAsync(CancellationToken ct)
    {
        var agent = new AiAgentConfiguration("Handbook assistant", Names.AgentConnection, Scripts.AgentPrompt)
        {
            Identifier = Names.Agent,
            Parameters =
            {
                // Set by the application from the user when a conversation starts. The model does
                // not see it and cannot supply it, and both tools filter on it.
                new AiAgentParameter("department", "The user's department.",
                    sendToModel: false, AiAgentParameterPolicy.ForbidModelGeneration, AiAgentParameterValueType.String)
            },
            Queries =
            [
                new AiAgentToolQuery
                {
                    Name = "search",
                    Description = "Search the documents by meaning. Returns the id, title and summary of the best matches.",
                    // A looser cut than the search page: the agent reads what it finds and judges
                    // relevance itself, and an empty result only makes it search again.
                    Query = $"""
                        from {Names.Collection}
                        where Department == $department
                          and vector.search(embedding.text({Names.EmbeddingsField}, ai.task('{Names.EmbeddingsTask}')), $query, 0.5)
                        select id() as Id, Title, Summary
                        limit 5
                        """,
                    ParametersSampleObject = """{ "query": "what to look for, worded the way a policy would put it" }"""
                },
                new AiAgentToolQuery
                {
                    Name = "read",
                    Description = "Read one document in full by its id.",
                    Query = $"""
                        from {Names.Collection}
                        where id() == $id and Department == $department
                        select Title, Markdown
                        """,
                    ParametersSampleObject = """{ "id": "a document id returned by search" }"""
                }
            ]
        };

        await store.AI.CreateAgentAsync(agent, new AgentAnswer
        {
            Answer = "The answer in Markdown, quoting the rule and naming the document",
            Sources = ["the id of a document you read"]
        }, ct);
    }

    private async Task<long?> FindTaskIdAsync(string name, OngoingTaskType type, CancellationToken ct) =>
        (await store.Maintenance.SendAsync(new GetOngoingTaskInfoOperation(name, type), ct))?.TaskId;
}
