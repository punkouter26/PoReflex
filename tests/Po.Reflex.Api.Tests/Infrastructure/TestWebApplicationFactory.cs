using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Po.Reflex.Api.Tests.Infrastructure;

/// <summary>
/// Custom WebApplicationFactory for integration tests.
/// Configures reduced retry policy (#2) and test-specific settings.
/// </summary>
public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _tableStorageConnectionString;

    /// <summary>
    /// Default constructor for xUnit IClassFixture usage.
    /// Uses Azurite development storage connection string.
    /// </summary>
    public TestWebApplicationFactory()
    {
        _tableStorageConnectionString = "UseDevelopmentStorage=true";
    }

    /// <summary>
    /// Internal constructor with custom connection string for Azurite container.
    /// Used by AzuriteWebApplicationFactory.
    /// </summary>
    internal TestWebApplicationFactory(string tableStorageConnectionString)
    {
        _tableStorageConnectionString = tableStorageConnectionString ?? "UseDevelopmentStorage=true";
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Override configuration for tests
            var testConfig = new Dictionary<string, string?>
            {
                // #2 - Reduce retry policy to 1 attempt in test environment
                ["Azure:Retry:MaxRetries"] = "1",
                ["Azure:Retry:Delay"] = "00:00:01",
                ["Azure:Retry:MaxDelay"] = "00:00:02",
            };

            // Use provided connection string or Azurite default
            testConfig["ConnectionStrings:TableStorage"] = _tableStorageConnectionString;

            config.AddInMemoryCollection(testConfig);
        });

        builder.UseEnvironment("Testing");
    }
}

/// <summary>
/// Factory that uses Azurite container for storage.
/// </summary>
public class AzuriteWebApplicationFactory : TestWebApplicationFactory
{
    public AzuriteWebApplicationFactory(AzuriteFixture azurite) 
        : base(azurite.ConnectionString)
    {
    }
}
