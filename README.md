# Team 3 Store

RBAC e-commerce mini-project (KLE Tech, Team 3). One Node/Express backend, one React + Vite frontend, one MySQL database. The backend is a modular monolith with one module per engine.

## Run it (Windows + XAMPP)

1. Start **MySQL** in the XAMPP control panel. Every time, before anything else.
2. `npm install` (first time only).
3. `npm run db:reset` creates the `team3_store` database and loads the demo data. Rerun it whenever you want fresh demo data.
4. `npm run dev` starts **both** the API (port 4000) and the website (port 5173) in one terminal. Open http://localhost:5173.

Press Ctrl+C to stop both. If the site says "It's not you, it's us", look at the `[api]` lines in that terminal: they say exactly what is wrong (MySQL down, port in use, and so on).

For production, run `npm run build` and then `npm start`. Everything is then served on http://localhost:4000.

To rebrand the store (this is an open-source project), edit `frontend/src/config.js`.

Every demo account uses the password `Password@123`.

| Page | URL | Accounts |
|---|---|---|
| Store / customer sign-in | `/`, `/login` | customer@team3.test, inactive@team3.test |
| Seller Central | `/seller/login` | seller1@team3.test, seller2@team3.test |
| Staff sign-in | `/staff/login` | finance@ (Finance), warehouse@ (Warehouse), ceo@ (Leadership) |
| Admin console | `/admin/login` | admin@team3.test |

To run the E1 tests, keep `npm run dev` (or `npm start`) running and run `npm test` in a second terminal. There are 11 test groups covering every authorization rule.

## Folders

```
db/schema.sql, db/seed.sql        E3 tables + demo data
server/engines/e3-data            the ONLY code that runs SQL
server/engines/e1-access          authorization engine (cache, authorize, sessions, routes)
server/engines/e1-search          typo-tolerant search (edit distance + trigram index)
server/engines/catalog            store API + guarded seller/ops/admin writes
frontend/src/engines/e1-access    sign-in pages, account, admin console pages
frontend/src/storefront           homepage, search, product, cart, Seller Central, Ops
tests/e1.test.js                  end-to-end tests for E1
```

## Settings and secrets

All settings come from environment variables, listed in `.env.example`.

- **Locally:** run `copy .env.example .env` (PowerShell) and edit `.env`. The `.gitignore` keeps `.env` off GitHub; only `.env.example` is committed.
- **On the host:** enter the same variables in the host's dashboard.
- **Production:** with `NODE_ENV=production`, the server refuses to start if `JWT_SECRET` is missing, too short or the development value, or if `DB_PASSWORD` is empty. To generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- **HTTPS-ready:** production also adds HSTS and a Content-Security-Policy header, and marks cookies `Secure` (only sent over HTTPS). Locally everything runs on plain HTTP; nothing in the code needs to change between the two.

## Sign-in protection

Two layers stop password guessing without letting an attacker lock real users out:

1. **Per-IP limit:** after 30 wrong passwords from one IP address in 15 minutes, that IP is blocked. Nobody's account is locked.
2. **Account lock for new devices only:** after 5 wrong passwords from browsers that have never signed in to an account, that account is locked for 15 minutes on new devices. A browser that signed in successfully before carries a signed, httpOnly "trusted device" cookie, so the real owner can still sign in. The password is still required every time.
