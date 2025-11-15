#!/usr/bin/env node
// Verify SEO elements are present
const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.SITE_URL || 'https://hatchepk.com';

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    client.get(url.href, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function checkSEO(html, url) {
  const checks = {
    title: /<title>([^<]+)<\/title>/i.test(html),
    description: /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i.test(html),
    ogTitle: /<meta\s+property=["']og:title["']/i.test(html),
    ogDescription: /<meta\s+property=["']og:description["']/i.test(html),
    ogImage: /<meta\s+property=["']og:image["']/i.test(html),
    canonical: /<link\s+rel=["']canonical["']/i.test(html),
    schema: /<script\s+type=["']application\/ld\+json["']/i.test(html),
  };

  return checks;
}

async function verifySEO() {
  console.log(`\n🔍 Verifying SEO elements on ${BASE_URL}\n`);

  try {
    const url = new URL('/', BASE_URL);
    const html = await fetchHTML(url);

    const checks = checkSEO(html, url);

    console.log('SEO Elements Check:');
    console.log(`  Title Tag: ${checks.title ? '✅' : '❌'}`);
    console.log(`  Meta Description: ${checks.description ? '✅' : '❌'}`);
    console.log(`  Open Graph Title: ${checks.ogTitle ? '✅' : '❌'}`);
    console.log(`  Open Graph Description: ${checks.ogDescription ? '✅' : '❌'}`);
    console.log(`  Open Graph Image: ${checks.ogImage ? '✅' : '❌'}`);
    console.log(`  Canonical URL: ${checks.canonical ? '✅' : '❌'}`);
    console.log(`  Schema Markup: ${checks.schema ? '✅' : '❌'}\n`);

    const allPass = Object.values(checks).every(check => check);

    if (allPass) {
      console.log('🎉 All SEO elements are present!');
      process.exit(0);
    } else {
      console.log('❌ Some SEO elements are missing.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error verifying SEO:', error.message);
    process.exit(1);
  }
}

verifySEO();

