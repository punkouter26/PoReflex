// #6 - Enable parallel test execution for Unit tests
// This file configures xUnit to run tests in parallel by default

using Xunit;

// Allow parallel execution within the same class
[assembly: CollectionBehavior(DisableTestParallelization = false, MaxParallelThreads = -1)]
