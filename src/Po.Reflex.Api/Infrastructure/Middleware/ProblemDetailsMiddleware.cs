using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Po.Reflex.Api.Infrastructure.Middleware;

/// <summary>
/// Middleware that converts exceptions to RFC 7807 Problem Details responses.
/// </summary>
public class ProblemDetailsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ProblemDetailsMiddleware> _logger;

    public ProblemDetailsMiddleware(RequestDelegate next, ILogger<ProblemDetailsMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, "Validation error occurred");
            await WriteProblemDetailsAsync(context, HttpStatusCode.BadRequest, "Validation Error", ex.Message);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Bad request error occurred");
            await WriteProblemDetailsAsync(context, HttpStatusCode.BadRequest, "Bad Request", ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access attempted");
            await WriteProblemDetailsAsync(context, HttpStatusCode.Unauthorized, "Unauthorized", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred");
            await WriteProblemDetailsAsync(context, HttpStatusCode.InternalServerError, "Server Error", "An unexpected error occurred.");
        }
    }

    private static async Task WriteProblemDetailsAsync(HttpContext context, HttpStatusCode statusCode, string title, string detail)
    {
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var problemDetails = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path,
            Type = $"https://httpstatuses.com/{(int)statusCode}"
        };

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails, options));
    }
}

/// <summary>
/// Custom validation exception for FluentValidation errors.
/// </summary>
public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
    public ValidationException(string message, Exception inner) : base(message, inner) { }
}
