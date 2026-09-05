# Creative Dyes and Chemicals — Ledger

A ledger and accounts register for Creative Dyes and Chemicals: supplier and
customer accounts, purchase and sale entries, payments, and stock/inventory
tracking, built with Next.js (App Router) and PostgreSQL.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- PostgreSQL via Prisma ORM 6
- Single-admin login (hashed password, signed session cookie — no third-party
  auth provider)

## 1. Get a database

Any PostgreSQL database works. The free tier of [Neon](https://neon.tech) or
[Supabase](https://supabase.com) is enough for this app. Create a project
there and copy its connection string.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

- `DATABASE_URL` — your Postgres connection string
- `SESSION_SECRET` — a long random string (`openssl rand -base64 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — used once to create the
  admin login (see step 4)

## 3. Install dependencies & create the schema

```bash
npm install
npm run db:push
```

`db:push` creates all the tables (`Party`, `Product`, `PurchaseInvoice`,
`SaleInvoice`, `Payment`, `Admin`, …) in your database.

## 4. Create the admin login

```bash
npm run db:seed
```

This reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` and creates the admin
account you'll log in with. Re-run it any time to reset the password.

## 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Deploying (Vercel)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Add the same environment variables from `.env` in the Vercel project
   settings.
3. Deploy. Vercel runs `npm run build`, which also runs `prisma generate`.
4. Run the schema push and seed once against the production database — either
   locally with `DATABASE_URL` pointed at production, or via `vercel env pull`
   then `npm run db:push && npm run db:seed`.

## How the ledgers work

Every supplier and customer is a **Party** with a running balance, shown as
**Dr** (money owed *to* the business) or **Cr** (money the business owes),
exactly like a traditional ledger book:

- A **purchase** invoice credits the supplier's account and increases stock.
- A **sale** invoice debits the customer's account and decreases stock.
- A **payment** made to a supplier debits their account; a payment received
  from a customer credits theirs.

The Dashboard totals "Receivable" (customers in Dr) and "Payable" (suppliers
in Cr) across all accounts. Each party's page has a full statement with a
running balance and a print-friendly view.

## Useful scripts

| Command             | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`         | Start the dev server                          |
| `npm run build`       | Production build                              |
| `npm run db:push`     | Sync the Prisma schema to the database         |
| `npm run db:migrate`  | Create a versioned migration (for prod changes)|
| `npm run db:seed`     | Create/update the admin login                  |
| `npm run db:studio`   | Open Prisma Studio to browse data              |
