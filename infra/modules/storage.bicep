/*
 * Storage Account Module
 * Creates Azure Storage Account with Table Storage for leaderboard data
 */

@description('Name of the storage account')
param storageAccountName string

@description('Azure region')
param location string

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS' // Locally redundant for cost savings
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    publicNetworkAccess: 'Enabled'
  }
}

// Table Service
resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

// Leaderboard Table
resource leaderboardTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'leaderboard'
}

// Outputs
output storageAccountName string = storageAccount.name
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
output tableEndpoint string = storageAccount.properties.primaryEndpoints.table
