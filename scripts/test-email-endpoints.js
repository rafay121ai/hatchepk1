#!/usr/bin/env node
// Test email API endpoints
const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.SITE_URL || 'https://hatchepk.com';
const EMAIL_ENDPOINTS = [
  '/api/emails/send', // Unified email endpoint
];

const testResults = [];

function testEndpoint(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;

    const postData = JSON.stringify({
      emailType: 'welcome',
      email: 'test@example.com',
      firstName: 'Test',
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = client.request(url.href, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const statusCode = res.statusCode;
        if (statusCode === 200 || statusCode === 400) {
          // 400 is OK - means endpoint exists (validation error expected)
          testResults.push({ path, status: statusCode, working: true });
          console.log(`✅ ${path} - ${statusCode} (endpoint exists)`);
        } else {
          testResults.push({ path, status: statusCode, working: false });
          console.log(`❌ ${path} - ${statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      testResults.push({ path, error: error.message, working: false });
      console.log(`❌ ${path} - Error: ${error.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log(`\n📧 Testing ${EMAIL_ENDPOINTS.length} email endpoints on ${BASE_URL}\n`);

  for (const endpoint of EMAIL_ENDPOINTS) {
    await testEndpoint(endpoint);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const working = testResults.filter(r => r.working).length;
  const broken = testResults.filter(r => !r.working).length;

  console.log(`\n📊 Results:`);
  console.log(`✅ Working: ${working}`);
  console.log(`❌ Broken: ${broken}\n`);

  if (broken > 0) {
    console.log('Broken Endpoints:');
    testResults.filter(r => !r.working).forEach(({ path, status, error }) => {
      console.log(`  - ${path}: ${status || error}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 All email endpoints are accessible!');
    process.exit(0);
  }
}

runTests();

