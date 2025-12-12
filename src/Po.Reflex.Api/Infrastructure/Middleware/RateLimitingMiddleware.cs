using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Po.Reflex.Api.Infrastructure.Middleware;

/// <summary>
/// Rate limiting middleware using device fingerprint + IP address.
/// Implements FR-021: 10 attempts per minute per source.
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly IConfiguration _configuration;

    // In-memory store for rate limiting (use distributed cache in production)
    private static readonly ConcurrentDictionary<string, RateLimitEntry> _rateLimitStore = new();

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger, IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only rate limit score submission endpoint
        if (!context.Request.Path.StartsWithSegments("/api/game/submit"))
        {
            await _next(context);
            return;
        }

        var requestsPerMinute = _configuration.GetValue<int>("RateLimiting:RequestsPerMinute", 10);
        var windowSizeMinutes = _configuration.GetValue<int>("RateLimiting:WindowSizeMinutes", 1);

        var clientIdentifier = GetClientIdentifier(context);

        if (IsRateLimited(clientIdentifier, requestsPerMinute, windowSizeMinutes))
        {
            _logger.LogWarning("Rate limit exceeded for client: {ClientId}", HashIdentifier(clientIdentifier));

            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.ContentType = "application/problem+json";

            var problemDetails = new ProblemDetails
            {
                Status = 429,
                Title = "Too Many Requests",
                Detail = $"Rate limit exceeded. Maximum {requestsPerMinute} requests per {windowSizeMinutes} minute(s).",
                Instance = context.Request.Path,
                Type = "https://httpstatuses.com/429"
            };

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails, options));
            return;
        }

        await _next(context);
    }

    private string GetClientIdentifier(HttpContext context)
    {
        // Extract IP address from request
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Check for forwarded IP (behind proxy/load balancer)
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            ipAddress = forwardedFor.ToString().Split(',').FirstOrDefault()?.Trim() ?? ipAddress;
        }

        // Extract device fingerprint from header (set by client)
        var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault() ?? "no-fingerprint";

        // Combine for unique identifier
        return $"{ipAddress}:{deviceFingerprint}";
    }

    private bool IsRateLimited(string clientIdentifier, int maxRequests, int windowMinutes)
    {
        var now = DateTime.UtcNow;
        var windowStart = now.AddMinutes(-windowMinutes);

        // Clean up old entries
        CleanupExpiredEntries(windowStart);

        var entry = _rateLimitStore.GetOrAdd(clientIdentifier, _ => new RateLimitEntry());

        lock (entry)
        {
            // Remove timestamps outside the window
            while (entry.Timestamps.Count > 0 && entry.Timestamps.Peek() < windowStart)
            {
                entry.Timestamps.Dequeue();
            }

            // Check if rate limited
            if (entry.Timestamps.Count >= maxRequests)
            {
                return true;
            }

            // Add current request timestamp
            entry.Timestamps.Enqueue(now);
            return false;
        }
    }

    private void CleanupExpiredEntries(DateTime windowStart)
    {
        foreach (var key in _rateLimitStore.Keys.ToList())
        {
            if (_rateLimitStore.TryGetValue(key, out var entry))
            {
                lock (entry)
                {
                    if (entry.Timestamps.Count == 0 || entry.Timestamps.All(t => t < windowStart))
                    {
                        _rateLimitStore.TryRemove(key, out _);
                    }
                }
            }
        }
    }

    private static string HashIdentifier(string identifier)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(identifier));
        return Convert.ToBase64String(hash)[..8]; // Short hash for logging
    }

    private class RateLimitEntry
    {
        public Queue<DateTime> Timestamps { get; } = new();
    }
}
