#!/usr/bin/env node
// Check for console errors in production build
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '../build');
const JS_FILES = [];

function findJSFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findJSFiles(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.map')) {
      JS_FILES.push(filePath);
    }
  });
}

function checkForErrors() {
  console.log('\n🔍 Checking production build for console errors...\n');

  if (!fs.existsSync(BUILD_DIR)) {
    console.log('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  findJSFiles(BUILD_DIR);

  const errors = [];
  const warnings = [];

  JS_FILES.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for console.error
    if (content.includes('console.error')) {
      errors.push(file);
    }
    
    // Check for console.warn (optional - might be OK)
    if (content.includes('console.warn')) {
      warnings.push(file);
    }
  });

  console.log(`📁 Scanned ${JS_FILES.length} JavaScript files\n`);

  if (errors.length > 0) {
    console.log('❌ Found console.error calls:');
    errors.forEach(file => {
      console.log(`  - ${path.relative(BUILD_DIR, file)}`);
    });
    console.log('\n⚠️  Consider removing console.error calls in production.');
  } else {
    console.log('✅ No console.error calls found.');
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} files with console.warn (usually OK).`);
  }

  console.log('\n✅ Build check complete!');
  process.exit(errors.length > 0 ? 1 : 0);
}

checkForErrors();

