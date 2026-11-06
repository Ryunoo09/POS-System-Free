# POS System

Sistem Point of Sale (monorepo pnpm): API Express + TypeScript dan SPA Vue 3.

## Struktur

- `Backend/` — REST API Express (ESM) + Prisma/PostgreSQL. Lihat `Backend/README.md`.
- `Frontend/` — SPA Vue 3 + Vite + Tailwind + Pinia. Lihat `Frontend/README.md`.

## Prasyarat

- Node.js >= 22.18
- pnpm 12
- PostgreSQL 15+

## Mulai Cepat

```bash
pnpm install

cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env

pnpm db:migrate
pnpm db:seed

pnpm dev:backend     # http://localhost:3000/api
pnpm dev:frontend    # http://localhost:5173
```

## Script Root

```bash
pnpm dev             # backend + frontend paralel
pnpm build           # build semua paket
pnpm type-check
pnpm lint
pnpm test            # unit/integration backend
pnpm test:unit       # unit frontend
pnpm test:e2e        # e2e frontend (butuh backend berjalan)
pnpm db:migrate      # prisma migrate dev
pnpm db:seed         # data development
pnpm db:reset        # reset database + seed ulang
```

## Akun Development

Jalankan `pnpm db:seed` lalu gunakan akun berikut (hanya untuk lokal):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@pos.local` | `Admin@12345` |
| Owner | `owner@pos.local` | `Owner@12345` |
| Cashier | `kasir1@pos.local` | `Kasir@12345` |
| Cashier | `kasir2@pos.local` | `Kasir@12345` |

Peringatan: akun dan password tersebut hanya untuk development. Ganti
`JWT_SECRET` dan kredensial sebelum deployment.
