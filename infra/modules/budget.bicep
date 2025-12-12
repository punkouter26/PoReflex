/*
 * Budget Module
 * Creates a monthly budget with email alerts at 80% threshold
 */

@description('Name of the budget')
param budgetName string

@description('Monthly budget amount in USD')
param amount int = 5

@description('Email address for budget alerts')
param alertEmail string

// Budget
resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: budgetName
  properties: {
    category: 'Cost'
    amount: amount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: '${substring(utcNow(), 0, 7)}-01' // First day of current month
    }
    notifications: {
      Actual_GreaterThan_80_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        contactEmails: [
          alertEmail
        ]
        thresholdType: 'Actual'
      }
      Forecasted_GreaterThan_100_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: [
          alertEmail
        ]
        thresholdType: 'Forecasted'
      }
    }
  }
}

// Output
output budgetName string = budget.name
