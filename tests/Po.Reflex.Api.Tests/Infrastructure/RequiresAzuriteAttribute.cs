using Xunit;

namespace Po.Reflex.Api.Tests.Infrastructure;

/// <summary>
/// Trait for tests that require Azurite (#3 - Skip attribute).
/// Tests with this trait will be skipped if Docker/Azurite is unavailable.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequiresAzuriteAttribute : Attribute
{
}

/// <summary>
/// Custom fact attribute that skips tests when Azurite is not available.
/// </summary>
public class AzuriteFactAttribute : FactAttribute
{
    public AzuriteFactAttribute()
    {
        if (!IsDockerAvailable())
        {
            Skip = "Docker/Azurite is not available";
        }
    }

    private static bool IsDockerAvailable()
    {
        try
        {
            // Quick check if Docker is running
            var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = "info",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            process.Start();
            process.WaitForExit(5000);
            return process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }
}
