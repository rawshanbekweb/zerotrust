#!/usr/bin/env bash
set -o errexit

npx prisma db push --accept-data-loss --force-reset
npm run db:seed
npm start