#!/usr/bin/env node
// Test all internal links for 404 errors
const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.SITE_URL || 'https://hatchepk.com';
const INTERNAL_LINKS = [
  '/',
  '/our-guides',
  '/your-guides',
  '/affiliate-program',
  '/about-us',
  '/return-policy',
  '/privacy-policy',
  '/refund-policy',
  '/terms-conditions',
];

const brokenLinks = [];
const workingLinks = [];

function testLink(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(url.href, (res) => {
      const statusCode = res.statusCode;
      
      if (statusCode >= 200 && statusCode < 400) {
        workingLinks.push({ path, status: statusCode });
        console.log(`✅ ${path} - ${statusCode}`);
      } else {
        brokenLinks.push({ path, status: statusCode });
        console.log(`❌ ${path} - ${statusCode}`);
      }
      resolve();
    });

    req.on('error', (error) => {
      brokenLinks.push({ path, error: error.message });
      console.log(`❌ ${path} - Error: ${error.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      req.destroy();
      brokenLinks.push({ path, error: 'Timeout' });
      console.log(`❌ ${path} - Timeout`);
      resolve();
    });
  });
}

async function runTests() {
  console.log(`\n🔍 Testing ${INTERNAL_LINKS.length} internal links on ${BASE_URL}\n`);

  for (const link of INTERNAL_LINKS) {
    await testLink(link);
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Results:`);
  console.log(`✅ Working: ${workingLinks.length}`);
  console.log(`❌ Broken: ${brokenLinks.length}\n`);

  if (brokenLinks.length > 0) {
    console.log('Broken Links:');
    brokenLinks.forEach(({ path, status, error }) => {
      console.log(`  - ${path}: ${status || error}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 All links are working!');
    process.exit(0);
  }
}

runTests();

