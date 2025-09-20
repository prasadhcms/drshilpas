// Test for Patient Balance Calculation Logic

// Mock appointment data for testing
const mockAppointments = [
  { patient_id: 'patient1', balance: 500.00 },
  { patient_id: 'patient1', balance: 200.50 },
  { patient_id: 'patient1', balance: 0.00 },
  { patient_id: 'patient2', balance: 0.00 },
  { patient_id: 'patient2', balance: 0.00 },
  { patient_id: 'patient3', balance: 1500.75 },
  { patient_id: 'patient4', balance: -100.00 }, // overpaid
];

// Simulate the balance calculation logic from loadStats function
function calculatePatientBalances(appointments) {
  const map = {};
  for (const a of appointments) {
    const pid = a.patient_id;
    if (!pid) continue;
    const entry = map[pid] || { count: 0, lastAt: null, totalBalance: 0 };
    entry.count += 1;

    // Calculate total balance for the patient
    const balance = parseFloat(a.balance || 0);
    entry.totalBalance += balance;

    map[pid] = entry;
  }
  return map;
}

// Test the calculation
const results = calculatePatientBalances(mockAppointments);

console.log('Patient Balance Test Results:');
console.log('Patient 1 (has outstanding balance):', results.patient1?.totalBalance); // Should be 700.50
console.log('Patient 2 (fully paid):', results.patient2?.totalBalance); // Should be 0.00
console.log('Patient 3 (has outstanding balance):', results.patient3?.totalBalance); // Should be 1500.75
console.log('Patient 4 (overpaid):', results.patient4?.totalBalance); // Should be -100.00

// Verify expected results
const tests = [
  { patient: 'patient1', expected: 700.50, actual: results.patient1?.totalBalance },
  { patient: 'patient2', expected: 0.00, actual: results.patient2?.totalBalance },
  { patient: 'patient3', expected: 1500.75, actual: results.patient3?.totalBalance },
  { patient: 'patient4', expected: -100.00, actual: results.patient4?.totalBalance },
];

console.log('\nTest Results:');
tests.forEach(test => {
  const passed = Math.abs(test.actual - test.expected) < 0.01;
  console.log(`${test.patient}: ${passed ? 'PASS' : 'FAIL'} (Expected: ${test.expected}, Actual: ${test.actual})`);
});

// Test display logic
function getBalanceDisplay(totalBalance) {
  if (totalBalance === undefined) return '-';
  if (totalBalance === 0) return 'Fully PAID';
  if (totalBalance > 0) return `₹${totalBalance.toFixed(2)}`;
  return `₹${totalBalance.toFixed(2)}`;
}

console.log('\nDisplay Logic Test:');
console.log('Patient 1 display:', getBalanceDisplay(results.patient1?.totalBalance)); // Should show ₹700.50
console.log('Patient 2 display:', getBalanceDisplay(results.patient2?.totalBalance)); // Should show "Fully PAID"
console.log('Patient 3 display:', getBalanceDisplay(results.patient3?.totalBalance)); // Should show ₹1500.75
console.log('Patient 4 display:', getBalanceDisplay(results.patient4?.totalBalance)); // Should show ₹-100.00
console.log('Unknown patient display:', getBalanceDisplay(undefined)); // Should show "-"
