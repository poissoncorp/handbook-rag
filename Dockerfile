FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/RavenRag.Web/RavenRag.Web.csproj src/RavenRag.Web/
RUN dotnet restore src/RavenRag.Web/RavenRag.Web.csproj
COPY src/ src/
RUN dotnet publish src/RavenRag.Web/RavenRag.Web.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
COPY data/ /data/
ENV SampleData__Path=/data
USER $APP_UID
ENTRYPOINT ["dotnet", "RavenRag.Web.dll"]
