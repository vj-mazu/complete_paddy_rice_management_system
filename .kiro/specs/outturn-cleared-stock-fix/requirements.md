# Requirements Document

## Introduction

This feature addresses a critical bug in the outurn stock management system. When an outurn is cleared (meaning all remaining paddy bags are consumed and the outurn is closed), the system should reflect that no bags are available for that outurn. Currently, the system incorrectly continues to show available bags even after the outurn has been cleared, leading to confusion in stock reporting and potential data integrity issues.

## Glossary

- **Outurn**: A batch of paddy rice allocated for processing into rice products
- **Cleared Outurn**: An outurn that has been officially closed, with all remaining paddy bags consumed
- **Available Paddy Bags**: The number of paddy bags remaining in an outurn that can be used for rice production
- **Stock Management System**: The backend system that tracks paddy inventory and rice production
- **Outurn Report**: The display showing available paddy bags for each outurn

## Requirements

### Requirement 1

**User Story:** As a mill manager, I want cleared outturns to show zero available bags, so that I don't accidentally try to use bags from a closed outurn

#### Acceptance Criteria

1. WHEN an outurn is marked as cleared, THE Stock Management System SHALL return zero available paddy bags for that outurn
2. WHEN the available-paddy-bags endpoint is called for a cleared outurn, THE Stock Management System SHALL return availablePaddyBags value of zero
3. WHEN the available-paddy-bags endpoint is called for a cleared outurn, THE Stock Management System SHALL include the isCleared flag in the response
4. WHEN a user views the outurn report, THE Stock Management System SHALL display zero available bags for cleared outturns

### Requirement 2

**User Story:** As a data analyst, I want to see the cleared status in the available bags response, so that I can understand why an outurn shows zero bags

#### Acceptance Criteria

1. WHEN the available-paddy-bags endpoint returns data, THE Stock Management System SHALL include the isCleared boolean field
2. WHEN the available-paddy-bags endpoint returns data, THE Stock Management System SHALL include the clearedAt timestamp if the outurn is cleared
3. WHEN the available-paddy-bags endpoint returns data, THE Stock Management System SHALL include the remainingBags value that was recorded when the outurn was cleared

### Requirement 3

**User Story:** As a production operator, I want to be prevented from creating rice production entries for cleared outturns, so that I don't create invalid data

#### Acceptance Criteria

1. WHEN a user attempts to create a rice production entry for a cleared outurn, THE Stock Management System SHALL reject the request with an error
2. WHEN a user attempts to update a rice production entry to reference a cleared outurn, THE Stock Management System SHALL reject the request with an error
3. WHEN validation fails due to a cleared outurn, THE Stock Management System SHALL return an error message indicating the outurn is cleared
