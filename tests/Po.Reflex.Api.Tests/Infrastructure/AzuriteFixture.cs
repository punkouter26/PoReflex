using DotNet.Testcontainers.Builders;
using Testcontainers.Azurite;
using Xunit;

namespace Po.Reflex.Api.Tests.Infrastructure;

/// <summary>
/// Shared Azurite container fixture for integration tests (#1 - Testcontainers).
/// Spins up an ephemeral Azure Table Storage instance.
/// </summary>
public class AzuriteFixture : IAsyncLifetime
{
    private AzuriteContainer? _container;

    public string ConnectionString => _container?.GetConnectionString()
        ?? "UseDevelopmentStorage=true";

    public bool IsRunning => _container?.State == DotNet.Testcontainers.Containers.TestcontainersStates.Running;

    public async Task InitializeAsync()
    {
        try
        {
            _container = new AzuriteBuilder()
                .WithImage("mcr.microsoft.com/azure-storage/azurite:latest")
                .WithWaitStrategy(Wait.ForUnixContainer().UntilPortIsAvailable(10002))
                .Build();

            await _container.StartAsync();
        }
        catch (Exception)
        {
            // Docker may not be available - tests will be skipped
            _container = null;
        }
    }

    public async Task DisposeAsync()
    {
        if (_container is not null)
        {
            await _container.DisposeAsync();
        }
    }
}

/// <summary>
/// Collection definition for tests requiring Azurite.
/// Tests in this collection share the same Azurite instance.
/// </summary>
[CollectionDefinition(nameof(AzuriteCollection))]
public class AzuriteCollection : ICollectionFixture<AzuriteFixture>
{
}
