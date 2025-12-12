/*
 * App Service Module
 * Creates F1 (Free) tier App Service for hosting the Blazor WASM app
 */

@description('Name of the App Service Plan')
param appServicePlanName string

@description('Name of the Web App')
param webAppName string

@description('Azure region')
param location string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Storage account connection string')
@secure()
param storageConnectionString string

// App Service Plan - F1 Free tier
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: false // Windows
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v10.0'
      http20Enabled: true
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
      ]
      connectionStrings: [
        {
          name: 'TableStorage'
          connectionString: storageConnectionString
          type: 'Custom'
        }
      ]
    }
  }
}

// Outputs
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
