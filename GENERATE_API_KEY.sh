#!/bin/bash
# Generate EMAIL_QUEUE_API_KEY
# Run this script to generate a secure API key

echo "Generating secure EMAIL_QUEUE_API_KEY..."
echo ""
echo "Your API Key:"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo ""
echo "Copy this key and:"
echo "1. Add it to Vercel environment variables as EMAIL_QUEUE_API_KEY"
echo "2. Keep it secret - never commit to public repositories"
echo ""

