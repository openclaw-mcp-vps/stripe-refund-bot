# Build Task: stripe-refund-bot

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: stripe-refund-bot
HEADLINE: Stripe Refund Bot — AI assistant that handles refund requests in your inbox
WHAT: Connect Stripe + email. AI reads refund requests, verifies legit (purchase exists, within policy), issues refund, drafts reply. Human-in-loop for edge cases.
WHY: Processing refunds takes 10-15 min each. 30 refunds/month = 5 hours of founder time. This buys back weekends.
WHO PAYS: SaaS founders $5k+ MRR handling 20+ refunds/month
NICHE: fintech-automation
PRICE: $$25/mo for 100 refunds, $79/mo for 500/mo

ARCHITECTURE SPEC:
Email-first SaaS with webhook-driven architecture. IMAP/Gmail API monitors inbox for refund requests, OpenAI analyzes legitimacy against Stripe data, auto-processes valid refunds with human approval queue for edge cases.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/api/webhooks/stripe/route.ts
- app/api/webhooks/lemonsqueezy/route.ts
- app/api/email/process/route.ts
- app/api/refunds/approve/route.ts
- lib/email-monitor.ts
- lib/stripe-client.ts
- lib/openai-analyzer.ts
- lib/refund-processor.ts
- components/refund-queue.tsx
- components/email-setup.tsx
- prisma/schema.prisma

DEPENDENCIES: next, tailwindcss, @prisma/client, stripe, openai, imap, @lemonsqueezy/lemonsqueezy.js, nodemailer, zod, next-auth

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
