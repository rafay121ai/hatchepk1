#!/usr/bin/env node
// Run Lighthouse audit and check scores
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SITE_URL = process.env.SITE_URL || 'https://hatchepk.com';
const MIN_SCORE = 90;

async function runLighthouse() {
  console.log(`\n🚀 Running Lighthouse audit on ${SITE_URL}\n`);

  try {
    // Check if lighthouse is installed
    try {
      await execPromise('which lighthouse');
    } catch {
      console.log('⚠️  Lighthouse CLI not found. Installing...');
      console.log('Run: npm install -g lighthouse');
      process.exit(1);
    }

    const { stdout, stderr } = await execPromise(
      `lighthouse ${SITE_URL} --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-report.json --quiet`
    );

    if (stderr) {
      console.error('Lighthouse warnings:', stderr);
    }

    // Read and parse results
    const fs = require('fs');
    const report = JSON.parse(fs.readFileSync('./lighthouse-report.json', 'utf8'));

    const scores = {
      performance: Math.round(report.categories.performance.score * 100),
      accessibility: Math.round(report.categories.accessibility.score * 100),
      'best-practices': Math.round(report.categories['best-practices'].score * 100),
      seo: Math.round(report.categories.seo.score * 100),
    };

    console.log('\n📊 Lighthouse Scores:');
    console.log(`  Performance: ${scores.performance}/100 ${scores.performance >= MIN_SCORE ? '✅' : '❌'}`);
    console.log(`  Accessibility: ${scores.accessibility}/100 ${scores.accessibility >= MIN_SCORE ? '✅' : '❌'}`);
    console.log(`  Best Practices: ${scores['best-practices']}/100 ${scores['best-practices'] >= MIN_SCORE ? '✅' : '❌'}`);
    console.log(`  SEO: ${scores.seo}/100 ${scores.seo >= MIN_SCORE ? '✅' : '❌'}\n`);

    const allPass = Object.values(scores).every(score => score >= MIN_SCORE);

    if (allPass) {
      console.log('🎉 All Lighthouse scores meet the minimum requirement!');
      process.exit(0);
    } else {
      console.log('❌ Some scores are below the minimum requirement.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running Lighthouse:', error.message);
    console.log('\n💡 Alternative: Run Lighthouse manually in Chrome DevTools');
    process.exit(1);
  }
}

runLighthouse();

