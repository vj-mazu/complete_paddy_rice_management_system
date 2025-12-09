# Implementation Plan

- [x] 1. Fix available-paddy-bags endpoint to return zero for cleared outturns


  - Modify the GET `/outturn/:id/available-paddy-bags` endpoint in `server/routes/rice-productions.js`
  - Add query to fetch the outturn record using `Outturn.findByPk(outturnId)`
  - Add conditional check: if `outturn.isCleared` is true, return response with `availablePaddyBags: 0`
  - Include `isCleared`, `clearedAt`, and `remainingBags` fields in the response for cleared outturns
  - Ensure existing calculation logic continues to work for non-cleared outturns
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Add validation to prevent rice production creation for cleared outturns


  - Modify the POST `/` endpoint in `server/routes/rice-productions.js`
  - After resolving the outturn ID (around line 200-210), add validation to fetch the outturn record
  - Check if `outturn.isCleared` is true and return 400 error if so
  - Include error message with outturn code and cleared date
  - Include `isCleared` and `clearedAt` in error response
  - _Requirements: 3.1, 3.3_

- [x] 3. Add validation to prevent rice production updates to cleared outturns


  - Modify the PUT `/:id` endpoint in `server/routes/rice-productions.js`
  - Add validation when `outturnId` field is being changed
  - Fetch the new outturn record and check if `isCleared` is true
  - Return 400 error with appropriate message if attempting to change to a cleared outurn
  - Include `isCleared` and `clearedAt` in error response
  - _Requirements: 3.2, 3.3_

- [x] 4. Test the cleared outurn stock fix



  - Manually test the available-paddy-bags endpoint with a cleared outurn
  - Verify it returns zero available bags and includes cleared status
  - Attempt to create a rice production entry for a cleared outurn and verify it's rejected
  - Attempt to update an existing rice production to reference a cleared outurn and verify it's rejected
  - Verify non-cleared outturns continue to work normally
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_
