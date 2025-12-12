/*
 * PoReflex Infrastructure-as-Code
 * Main Bicep template that composes all Azure resources
 */

targetScope = 'resourceGroup'

@description('The base name for all resources')
param baseName string = 'poreflex'

@description('The environment (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('The Azure region for all resources')
param location string = resourceGroup().location

@description('Email address for budget alerts')
param alertEmail string

// Resource naming
var resourceSuffix = '${baseName}-${environment}'
var appServicePlanName = 'asp-${resourceSuffix}'
var webAppName = 'app-${resourceSuffix}'
var storageAccountName = replace('st${baseName}${environment}', '-', '')
var appInsightsName = 'appi-${resourceSuffix}'
var logAnalyticsName = 'log-${resourceSuffix}'

// Module: App Service
module appService 'modules/app-service.bicep' = {
  name: 'appService'
  params: {
    appServicePlanName: appServicePlanName
    webAppName: webAppName
    location: location
    appInsightsConnectionString: appInsights.outputs.connectionString
    storageConnectionString: storage.outputs.connectionString
  }
}

// Module: Storage Account
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    storageAccountName: storageAccountName
    location: location
  }
}

// Module: Application Insights
module appInsights 'modules/app-insights.bicep' = {
  name: 'appInsights'
  params: {
    appInsightsName: appInsightsName
    logAnalyticsName: logAnalyticsName
    location: location
  }
}

// Module: Budget
module budget 'modules/budget.bicep' = {
  name: 'budget'
  params: {
    budgetName: 'budget-${resourceSuffix}'
    amount: 5
    alertEmail: alertEmail
  }
}

// Outputs
output webAppUrl string = appService.outputs.webAppUrl
output storageAccountName string = storage.outputs.storageAccountName
output appInsightsName string = appInsights.outputs.appInsightsName
