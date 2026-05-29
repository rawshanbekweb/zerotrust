#!/usr/bin/env bash
# exit on error
set -o errexit

# Apply database migrations
npx prisma migrate deploy

# Seed the database (idempotent seed)
npm run db:seed

# Start the server
npm start
