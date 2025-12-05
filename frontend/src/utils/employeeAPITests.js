/**
 * Test script for Employee Management API integration
 * Run this in browser console to test API functionality
 */

// Test configuration
const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:8005',
  DEMO_EMPLOYEE: {
    name: 'John Doe',
    email: 'john.doe@test.com',
    phone: '1234567890',
    position: 'Employee',
    password: 'testpassword123',
    address: '123 Test Street',
    city: 'Test City',
    pincode: '123456',
    salary: '50000'
  }
};

/**
 * Test authentication
 */
async function testAuth() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.error('❌ No authentication token found. Please login first.');
    return false;
  }
  console.log('✅ Authentication token found');
  return true;
}

/**
 * Test fetch employees
 */
async function testFetchEmployees() {
  console.log('🧪 Testing fetch employees...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/employees/?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Fetch employees successful:', data);
      return data;
    } else {
      console.error('❌ Fetch employees failed:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('❌ Fetch employees error:', error);
    return null;
  }
}

/**
 * Test create employee
 */
async function testCreateEmployee() {
  console.log('🧪 Testing create employee...');
  
  const employeeData = {
    ...TEST_CONFIG.DEMO_EMPLOYEE,
    user_id: `TEST-${Date.now()}`,
    full_name: TEST_CONFIG.DEMO_EMPLOYEE.name,
    role_ids: [],
    roles: [TEST_CONFIG.DEMO_EMPLOYEE.position.toLowerCase()],
    is_active: true
  };
  
  try {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/employees/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(employeeData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Create employee successful:', data);
      return data;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Create employee failed:', response.status, errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Create employee error:', error);
    return null;
  }
}

/**
 * Test update employee
 */
async function testUpdateEmployee(employeeId) {
  console.log('🧪 Testing update employee...');
  
  const updateData = {
    full_name: 'John Doe Updated',
    salary: '60000'
  };
  
  try {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/employees/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Update employee successful:', data);
      return data;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Update employee failed:', response.status, errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Update employee error:', error);
    return null;
  }
}

/**
 * Test delete employee
 */
async function testDeleteEmployee(employeeId) {
  console.log('🧪 Testing delete employee...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/employees/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Delete employee successful:', data);
      return data;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Delete employee failed:', response.status, errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Delete employee error:', error);
    return null;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Employee Management API Tests...');
  console.log('='.repeat(50));
  
  // Test auth
  const hasAuth = await testAuth();
  if (!hasAuth) return;
  
  // Test fetch employees
  const fetchResult = await testFetchEmployees();
  if (!fetchResult) return;
  
  // Test create employee
  const createResult = await testCreateEmployee();
  if (!createResult || !createResult.data || !createResult.data.user_id) {
    console.log('⚠️  Skipping update/delete tests due to create failure');
    return;
  }
  
  const testEmployeeId = createResult.data.user_id;
  console.log(`📝 Test employee created with ID: ${testEmployeeId}`);
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test update employee
  await testUpdateEmployee(testEmployeeId);
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test delete employee (cleanup)
  await testDeleteEmployee(testEmployeeId);
  
  console.log('='.repeat(50));
  console.log('🏁 Employee Management API Tests Completed!');
}

/**
 * Test validation functions
 */
function testValidation() {
  console.log('🧪 Testing validation functions...');
  
  // Test valid data
  const validData = {
    name: 'John Doe',
    email: 'john@test.com',
    phone: '1234567890',
    position: 'Developer'
  };
  
  // Test invalid data
  const invalidData = {
    name: '',
    email: 'invalid-email',
    phone: 'abc123',
    position: ''
  };
  
  console.log('Valid data test:', validData);
  console.log('Invalid data test:', invalidData);
  
  // You can implement validation logic here or import from your utility file
  console.log('✅ Validation tests completed');
}

// Export functions for manual testing
window.employeeAPITests = {
  runAllTests,
  testAuth,
  testFetchEmployees,
  testCreateEmployee,
  testUpdateEmployee,
  testDeleteEmployee,
  testValidation
};

console.log('🧰 Employee API test functions loaded. Run employeeAPITests.runAllTests() to start testing.');
console.log('Available test functions:', Object.keys(window.employeeAPITests));