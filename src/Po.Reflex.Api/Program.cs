using Azure.Identity;
using FluentValidation;
using MediatR;
using Po.Reflex.Api.Infrastructure.Metrics;
using Po.Reflex.Api.Infrastructure.Middleware;
using Po.Reflex.Api.Infrastructure.Pipeline;
using Po.Reflex.Api.Infrastructure.TableStorage;
using Serilog;
using Serilog.Sinks.ApplicationInsights.TelemetryConverters;

var builder = WebApplication.CreateBuilder(args);

// #5 - Configure Azure Key Vault (PoShared resource group per copilot-instructions.md)
// Production: Use Key Vault with Managed Identity
// Development: Falls back to user-secrets or appsettings
var keyVaultUri = builder.Configuration["KeyVault:Uri"];
if (!string.IsNullOrEmpty(keyVaultUri))
{
    try
    {
        builder.Configuration.AddAzureKeyVault(
            new Uri(keyVaultUri),
            new DefaultAzureCredential(new DefaultAzureCredentialOptions
            {
                // Use Managed Identity in Azure, fall back to Azure CLI/VS for local dev
                ExcludeEnvironmentCredential = false,
                ExcludeManagedIdentityCredential = false,
                ExcludeAzureCliCredential = false,
                ExcludeVisualStudioCredential = false
            }));
        Log.Information("Azure Key Vault configured: {KeyVaultUri}", keyVaultUri);
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Failed to configure Key Vault, using local configuration");
    }
}

// Configure Serilog with optional Application Insights
var loggerConfig = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext();

// Add Application Insights sink if connection string is available (from Key Vault or env)
var appInsightsConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"]
    ?? builder.Configuration["PoReflex-AppInsightsConnectionString"];
if (!string.IsNullOrEmpty(appInsightsConnectionString))
{
    loggerConfig = loggerConfig.WriteTo.ApplicationInsights(
        appInsightsConnectionString,
        new TraceTelemetryConverter());
    Log.Information("Application Insights configured for Serilog");
}

Log.Logger = loggerConfig.CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PoReflex API", Version = "v1" });
});

// MediatR with validation pipeline
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddValidatorsFromAssemblyContaining<Po.Reflex.Shared.Validation.NicknameValidator>();

// Azure Table Storage
builder.Services.AddSingleton<ILeaderboardRepository, LeaderboardRepository>();

// OpenTelemetry Metrics
builder.Services.AddMetrics();
builder.Services.AddSingleton<GameMetrics>();

// CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:3000"];
        
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PoReflex API v1"));
    
    // #3 - Skip HTTPS redirect in development to avoid port warning
    Log.Information("Development mode: HTTPS redirect disabled");
}
else
{
    // #3 - Only use HTTPS redirect in production
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseCors();

// Custom middleware (only for API routes)
app.UseMiddleware<ProblemDetailsMiddleware>();
app.UseMiddleware<RateLimitingMiddleware>();

// Root-level health endpoint (for standard health checks)
app.MapGet("/health", async (ILeaderboardRepository repo) =>
{
    try
    {
        var isConnected = await repo.IsConnectedAsync();
        return Results.Ok(new Po.Reflex.Shared.DTOs.HealthStatusDto(
            IsHealthy: isConnected,
            StorageConnected: isConnected,
            ErrorMessage: isConnected ? null : "Storage connection failed"
        ));
    }
    catch (Exception ex)
    {
        return Results.Ok(new Po.Reflex.Shared.DTOs.HealthStatusDto(
            IsHealthy: false,
            StorageConnected: false,
            ErrorMessage: ex.Message
        ));
    }
}).WithTags("Health").ExcludeFromDescription();

// Map API endpoints
app.MapGet("/api/health", async (ILeaderboardRepository repo) =>
{
    try
    {
        var isConnected = await repo.IsConnectedAsync();
        return Results.Ok(new Po.Reflex.Shared.DTOs.HealthStatusDto(
            IsHealthy: isConnected,
            StorageConnected: isConnected,
            ErrorMessage: isConnected ? null : "Storage connection failed"
        ));
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Health check failed");
        return Results.Ok(new Po.Reflex.Shared.DTOs.HealthStatusDto(
            IsHealthy: false,
            StorageConnected: false,
            ErrorMessage: ex.Message
        ));
    }
})
.WithName("GetHealth");

// Leaderboard endpoint
app.MapGet("/api/leaderboard", async (IMediator mediator, int? top) =>
{
    var query = new Po.Reflex.Api.Features.Leaderboard.GetLeaderboard.Query(top ?? 100);
    var result = await mediator.Send(query);
    return Results.Ok(result);
})
.WithName("GetLeaderboard");

// Daily leaderboard endpoint
app.MapGet("/api/leaderboard/daily", async (IMediator mediator, int? top) =>
{
    var query = new Po.Reflex.Api.Features.Leaderboard.GetDailyTop10.Query();
    var result = await mediator.Send(query);
    return Results.Ok(result);
})
.WithName("GetDailyLeaderboard");

// All-time leaderboard endpoint
app.MapGet("/api/leaderboard/alltime", async (IMediator mediator, int? top) =>
{
    var query = new Po.Reflex.Api.Features.Leaderboard.GetAllTimeTop10.Query(top ?? 10);
    var result = await mediator.Send(query);
    return Results.Ok(result);
})
.WithName("GetAllTimeLeaderboard");

// Score submission endpoint
app.MapPost("/api/game/score", async (
    HttpContext httpContext,
    IMediator mediator,
    GameMetrics metrics,
    Po.Reflex.Shared.DTOs.ScoreSubmissionRequest request) =>
{
    var deviceFingerprint = httpContext.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();
    var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();

    var command = new Po.Reflex.Api.Features.Game.SubmitScore.Command(
        Nickname: request.Nickname,
        AverageMs: request.AverageMs,
        ReactionTimes: request.ReactionTimes,
        DeviceFingerprint: deviceFingerprint,
        IpAddress: ipAddress
    );

    var result = await mediator.Send(command);

    if (result.Success)
    {
        // Record successful submission metrics
        metrics.RecordGameCompleted(request.AverageMs, request.ReactionTimes);
        metrics.RecordScoreSubmitted(result.Rank ?? 0);

        return Results.Ok(new Po.Reflex.Shared.DTOs.ScoreSubmissionResponse(
            Success: true,
            Rank: result.Rank
        ));
    }

    // Record rejection metrics
    metrics.RecordScoreRejected(result.ErrorMessage ?? "unknown");

    return Results.BadRequest(new Po.Reflex.Shared.DTOs.ScoreSubmissionResponse(
        Success: false,
        ErrorMessage: result.ErrorMessage
    ));
})
.WithName("SubmitScore")
.WithTags("Game");

Log.Information("PoReflex API starting...");
app.Run();

// Make Program accessible for integration tests
public partial class Program { }
