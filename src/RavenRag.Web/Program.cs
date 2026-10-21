using Microsoft.Extensions.Options;
using Raven.Client.Documents;
using RavenRag.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<RavenSettings>().BindConfiguration("Raven").ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddOptions<AiSettings>().BindConfiguration("Ai").ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddOptions<SampleDataSettings>().BindConfiguration("SampleData").ValidateDataAnnotations().ValidateOnStart();

builder.Services.AddSingleton<IDocumentStore>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<RavenSettings>>().Value;
    return new DocumentStore { Urls = [settings.Url], Database = settings.Database }.Initialize();
});

builder.Services.AddSingleton<PipelineSetup>();
builder.Services.AddSingleton<SampleData>();
builder.Services.AddSingleton<UserService>();
builder.Services.AddSingleton<DocumentService>();
builder.Services.AddSingleton<SearchService>();
builder.Services.AddSingleton<AskService>();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.UseDefaultFiles();
// Revalidate on every load (ETag), so a rebuilt image is picked up without a hard refresh.
app.UseStaticFiles(new StaticFileOptions { OnPrepareResponse = c => c.Context.Response.Headers.CacheControl = "no-cache" });

await app.Services.GetRequiredService<PipelineSetup>().DeployAsync();
await app.Services.GetRequiredService<SampleData>().SeedAsync();

app.MapGet("/api/users", (UserService users, CancellationToken ct) => users.GetAllAsync(ct));

app.MapGet("/api/documents", async (string id, string user, UserService users, DocumentService documents, CancellationToken ct) =>
    await users.GetAsync(user, ct) is { } u && await documents.GetAsync(id, u.Department, ct) is { } document
        ? Results.Ok(document)
        : Results.NotFound());

app.MapGet("/api/documents/chunks", async (string id, string user, UserService users, DocumentService documents, CancellationToken ct) =>
    await users.GetAsync(user, ct) is { } u && await documents.GetChunksAsync(id, u.Department, ct) is { } chunks
        ? Results.Ok(chunks)
        : Results.NotFound());

app.MapGet("/api/search", async (string q, string user, UserService users, SearchService search, CancellationToken ct) =>
    await users.GetAsync(user, ct) is { } u
        ? Results.Ok(await search.SearchAsync(q, u.Department, ct))
        : Results.BadRequest());

app.MapGet("/api/agent/tools", (AskService ask, CancellationToken ct) => ask.GetToolsAsync(ct));

app.MapPost("/api/ask", async (AskRequest request, UserService users, AskService ask, CancellationToken ct) =>
    await users.GetAsync(request.UserId, ct) is { } user && !string.IsNullOrWhiteSpace(request.Prompt)
        ? TypedResults.ServerSentEvents(ask.AskAsync(request.Prompt, request.ConversationId, user, ct))
        : Results.BadRequest());

app.Run();
