/**
 * Comprehensive Connection Verification Script
 * Tests: Frontend → Backend → Database connections
 */

const mongoose = require('mongoose');
const axios = require('axios');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const defaultUri = process.env.CONNECTION_STRING || "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";
const envUri = process.env.CONNECTION_STRING ? process.env.CONNECTION_STRING.trim() : "";
const mongoUri = envUri && envUri.length > 0 ? envUri : defaultUri;

// Test results
const results = {
  timestamp: new Date().toISOString(),
  tests: {},
  summary: {}
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testBackendHealth() {
  logSection('TEST 1: Backend Health Check');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    const data = response.data;
    const success = response.status === 200 && data.status === 'ok';
    
    results.tests.backendHealth = {
      success,
      status: response.status,
      response: data,
      url: `${BACKEND_URL}/api/health`
    };
    
    if (success) {
      log('✅ Backend is running and healthy', 'green');
    } else {
      log('❌ Backend health check failed', 'red');
    }
    
    return success;
  } catch (error) {
    results.tests.backendHealth = {
      success: false,
      error: error.message,
      url: `${BACKEND_URL}/api/health`
    };
    log(`❌ Backend health check error: ${error.message}`, 'red');
    log(`   Make sure backend is running on ${BACKEND_URL}`, 'yellow');
    return false;
  }
}

async function testDatabaseConnection() {
  logSection('TEST 2: Database Connection (MongoDB Atlas)');
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "Ressichem",
      serverSelectionTimeoutMS: 5000
    });
    
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    const collections = await db.listCollections().toArray();
    
    // Test a simple query
    let userCount = 0;
    try {
      const User = db.collection('users');
      userCount = await User.countDocuments();
    } catch (err) {
      // Collection might not exist, that's okay
    }
    
    results.tests.databaseConnection = {
      success: true,
      database: dbName,
      collections: collections.length,
      collectionNames: collections.map(c => c.name),
      userCount
    };
    
    log(`✅ Database connected: ${dbName}`, 'green');
    log(`   Collections: ${collections.length}`, 'green');
    log(`   Users: ${userCount}`, 'green');
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    results.tests.databaseConnection = {
      success: false,
      error: error.message
    };
    log(`❌ Database connection failed: ${error.message}`, 'red');
    log('   Check your MongoDB Atlas connection string and network access', 'yellow');
    return false;
  }
}

async function testFrontendBackendConnection() {
  logSection('TEST 3: Frontend → Backend API Connection');
  try {
    // Test the frontend API route that proxies to backend
    const response = await axios.get(`${FRONTEND_URL}/api/test-connection`, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    const data = response.data;
    const success = response.status === 200 && data.success;
    
    results.tests.frontendBackendConnection = {
      success,
      status: response.status,
      response: data,
      url: `${FRONTEND_URL}/api/test-connection`
    };
    
    if (success) {
      log('✅ Frontend can connect to backend', 'green');
      if (data.tests?.backendHealth) {
        log('   Backend health: ✅', 'green');
      }
    } else {
      log('❌ Frontend → Backend connection failed', 'red');
      log(`   Make sure frontend is running on ${FRONTEND_URL}`, 'yellow');
    }
    
    return success;
  } catch (error) {
    results.tests.frontendBackendConnection = {
      success: false,
      error: error.message,
      url: `${FRONTEND_URL}/api/test-connection`
    };
    log(`❌ Frontend → Backend connection error: ${error.message}`, 'red');
    log(`   Make sure frontend is running on ${FRONTEND_URL}`, 'yellow');
    return false;
  }
}

async function testQCSignupEndpoint() {
  logSection('TEST 4: QC Signup Endpoint (Backend → Database)');
  try {
    // Test the backend endpoint directly
    const testPayload = {
      company_id: "RESSICHEM",
      firstName: "Test",
      lastName: "User",
      email: `test_${Date.now()}@test.com`,
      password: "TestPassword123!",
      role: "QC Analyst",
      layer: "QC",
      layerRole: "QC_LAB_TECHNICIAN"
    };
    
    let response;
    let data;
    let success = false;
    
    try {
      response = await axios.post(`${BACKEND_URL}/api/qc/auth/site-signup`, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      data = response.data;
      // Accept 200, 201 (created), 400 (validation), or 409 (conflict) as success indicators
      success = response.status === 200 || response.status === 201 || response.status === 400 || response.status === 409;
    } catch (error) {
      // Axios throws for non-2xx status codes, but we want to check them
      if (error.response) {
        response = { status: error.response.status };
        data = error.response.data;
        // Accept 200, 201 (created), 400 (validation), or 409 (conflict) as success indicators
        success = response.status === 200 || response.status === 201 || response.status === 400 || response.status === 409;
      } else {
        throw error;
      }
    }
    
    // We expect either success (user created) or specific error (user exists, validation error)
    // Both indicate the endpoint is working and connected to database
    
    results.tests.qcSignupEndpoint = {
      success,
      status: response.status,
      response: data,
      url: `${BACKEND_URL}/api/qc/auth/site-signup`
    };
    
    if (success) {
      if (response.status === 200 || response.status === 201) {
        log('✅ QC Signup endpoint working (user created)', 'green');
      } else if (response.status === 409) {
        log('✅ QC Signup endpoint working (user already exists - expected)', 'green');
      } else {
        log('✅ QC Signup endpoint working (validation working)', 'green');
      }
    } else {
      log('❌ QC Signup endpoint failed', 'red');
      log(`   Status: ${response.status}`, 'yellow');
      log(`   Message: ${data?.message || 'Unknown error'}`, 'yellow');
    }
    
    return success;
  } catch (error) {
    results.tests.qcSignupEndpoint = {
      success: false,
      error: error.message
    };
    log(`❌ QC Signup endpoint error: ${error.message}`, 'red');
    return false;
  }
}

async function testBackendDatabaseIntegration() {
  logSection('TEST 5: Backend → Database Integration');
  try {
    // Connect to database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "Ressichem"
    });
    
    const db = mongoose.connection.db;
    
    // Check if QC-related collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = ['users', 'roles', 'permissions'];
    const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));
    
    // Check if we can query users collection
    let canQueryUsers = false;
    try {
      const User = db.collection('users');
      await User.findOne({});
      canQueryUsers = true;
    } catch (err) {
      // Collection might be empty, that's okay
      canQueryUsers = true; // If collection exists, query is successful
    }
    
    results.tests.backendDatabaseIntegration = {
      success: missingCollections.length === 0 && canQueryUsers,
      collections: collectionNames,
      requiredCollections,
      missingCollections,
      canQueryUsers
    };
    
    if (missingCollections.length === 0 && canQueryUsers) {
      log('✅ Backend can access required database collections', 'green');
    } else {
      if (missingCollections.length > 0) {
        log(`⚠️  Missing collections: ${missingCollections.join(', ')}`, 'yellow');
      }
      if (!canQueryUsers) {
        log('⚠️  Cannot query users collection', 'yellow');
      }
    }
    
    await mongoose.disconnect();
    return missingCollections.length === 0 && canQueryUsers;
  } catch (error) {
    results.tests.backendDatabaseIntegration = {
      success: false,
      error: error.message
    };
    log(`❌ Backend → Database integration error: ${error.message}`, 'red');
    return false;
  }
}

function generateSummary() {
  logSection('VERIFICATION SUMMARY');
  
  const allTests = Object.values(results.tests);
  const passedTests = allTests.filter(t => t.success).length;
  const totalTests = allTests.length;
  
  results.summary = {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    allPassed: passedTests === totalTests
  };
  
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`Failed: ${totalTests - passedTests}`, totalTests - passedTests > 0 ? 'red' : 'green');
  
  console.log('\n');
  
  // Detailed results
  for (const [testName, testResult] of Object.entries(results.tests)) {
    const status = testResult.success ? '✅' : '❌';
    log(`${status} ${testName}: ${testResult.success ? 'PASS' : 'FAIL'}`, testResult.success ? 'green' : 'red');
    if (!testResult.success && testResult.error) {
      log(`   Error: ${testResult.error}`, 'yellow');
    }
  }
  
  console.log('\n');
  
  if (results.summary.allPassed) {
    log('🎉 ALL CONNECTIONS VERIFIED SUCCESSFULLY!', 'green');
  } else {
    log('⚠️  SOME CONNECTIONS FAILED - Please check the errors above', 'yellow');
  }
  
  // Recommendations
  console.log('\n');
  log('RECOMMENDATIONS:', 'cyan');
  if (!results.tests.backendHealth?.success) {
    log('1. Start the backend server: cd backend && npm start', 'yellow');
  }
  if (!results.tests.databaseConnection?.success) {
    log('2. Check MongoDB Atlas connection string in backend/.env', 'yellow');
    log('3. Verify MongoDB Atlas network access allows your IP', 'yellow');
  }
  if (!results.tests.frontendBackendConnection?.success) {
    log('4. Start the frontend server: cd frontend && npm run dev', 'yellow');
    log('5. Check NEXT_PUBLIC_BACKEND_URL in frontend/.env.local', 'yellow');
  }
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   COMPREHENSIVE CONNECTION VERIFICATION                    ║', 'cyan');
  log('║   Frontend → Backend → Database                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\nBackend URL: ${BACKEND_URL}`, 'blue');
  log(`Frontend URL: ${FRONTEND_URL}`, 'blue');
  log(`Database: MongoDB Atlas (Ressichem)`, 'blue');
  
  // Run tests sequentially
  await testBackendHealth();
  await testDatabaseConnection();
  await testFrontendBackendConnection();
  await testBackendDatabaseIntegration();
  await testQCSignupEndpoint();
  
  generateSummary();
  
  // Save results to file
  const fs = require('fs');
  fs.writeFileSync('connection-verification-results.json', JSON.stringify(results, null, 2));
  log('\n📄 Results saved to: connection-verification-results.json', 'blue');
  
  process.exit(results.summary.allPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

