# Handbook RAG on RavenDB

Ask questions about 13 internal policy documents and get streamed answers with sources. RavenDB
runs the RAG pipeline: it summarises each document, chunks and embeds it, keeps both current when
a document changes, runs the vector search and hosts the agent that answers. This app deploys
that setup, loads the sample data and serves one page with two modes, Ask and Search.

The documents and users describe a made-up logistics company. Every name, rule and number is invented.

## Run it

You need Docker, an OpenAI API key and a RavenDB licence with the AI features. The free
[Developer licence](https://ravendb.net/license/request/dev) is enough.

```bash
cp .env.example .env    # add OPENAI_API_KEY and RAVEN_LICENSE
docker compose up --build
```

- App: <http://localhost:5199>
- RavenDB Studio: <http://localhost:8080>

On the first start the sample data is loaded and RavenDB summarises and embeds it within half a
minute. A question costs about 2 cents with `gpt-5.5`; the summaries and embeddings cost next to
nothing.

`docker compose down -v` deletes the data, so the next start begins from scratch.

## How it works

| Step | Runs in | Defined in |
|---|---|---|
| One-sentence summary of each document (`gpt-6-luna`) | RavenDB GenAI task | `Scripts.cs` |
| Chunk the markdown, prefix every chunk with title and summary, embed | RavenDB embeddings task | `Scripts.cs` |
| Vector search filtered to the user's department, in one query | RavenDB query | `SearchService.cs` |
| Streamed answer with sources, using two read-only query tools (`gpt-5.5`) | RavenDB AI agent | `PipelineSetup.cs`, `AskService.cs` |

`PipelineSetup` creates or updates all of it on every start. `SampleData` loads the documents and
users into an empty database. The rest is done by RavenDB.

## Things to try

- **Press *How it works*.** A short walkthrough that sends a real question and follows it through
  RavenDB: the answer, the agent's tool query as stored in RavenDB, the department scope, the
  chunks the source was embedded as, and the same question in Search as one RQL query.
- **Switch users.** The menu at the top right picks one of eight users, each in one department.
  Search, documents and the agent only see that department's documents. For the agent this is an
  agent parameter the app sets when a conversation starts: the model can't see or change it, so
  asking it to read another department's document gets nothing. There is no sign-in; in a real
  app the user would come from authentication.
- **Edit a document in Studio.** Change a rule in a `HandbookDocuments` document. Within seconds
  only that document is summarised and embedded again, and the agent quotes the new text.
  Restarting the app reprocesses nothing.
- **The chunks.** Open a document and turn on *Show chunks* to see where it was split and the
  prefix each chunk was embedded with. The embeddings task keeps the chunk text
  (`StoreChunkText`), so this is exactly what RavenDB embedded.
- **The query.** Search shows the RQL it ran: the department filter and the vector
  search are one query.
- **The agent's work.** Every answer shows what the agent searched for, the tokens it used and
  how long it took. The whole conversation, tool calls included, is a document in the
  `@conversations` collection in Studio.

## Why the chunks get a prefix

A chunk cut out of a document loses its context: "returns are accepted within 48 hours" doesn't
say which agreement it comes from. `withContextPrefix` adds the document's title and one-sentence
summary to every chunk before it is embedded. On 28 test questions the right document came first
27 times with that prefix, 26 times with the title alone and 24 times with no prefix. The summary
is one sentence because the prefix takes part of each chunk's token budget. More in
[Additional context in embedded chunks](https://docs.ravendb.net/guides/additional-context-in-embedded-chunks).

## Models

The models are set in `appsettings.json`. The agent uses `gpt-5.5` because the newer `gpt-5.6`
and `gpt-6` models reject tool calls on the chat completions API that RavenDB 7.2 uses for agents.
`gpt-5.4-mini` answers almost as well at about a fifth of the price.

## Running without Docker

Start RavenDB 7.2.3 or later with an AI-capable licence, then:

```bash
cd src/RavenRag.Web
Ai__ApiKey=sk-... dotnet run
```

The server URL and database name are in `appsettings.json`. The app serves on <http://localhost:5199>.

## Layout

```
data/
  handbook/             the documents, one markdown file each
  users.json            the sample users
src/RavenRag.Web/
  Program.cs            services and the six endpoints
  PipelineSetup.cs      deploys the connection strings, both tasks and the agent
  Scripts.cs            the prompts and JavaScript that run in RavenDB
  SampleData.cs         loads the documents and users into an empty database
  SearchService.cs      vector search
  AskService.cs         agent conversations, streamed as server-sent events
  DocumentService.cs    documents, their chunks and source titles
  User.cs               users
  wwwroot/              the page: Ask and Search modes, the document dialog, the walkthrough
```
