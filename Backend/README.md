# Backend — POS System API

REST API Express + TypeScript (ESM) dengan Prisma/PostgreSQL.

## Prasyarat

- Node.js >= 22.18
- pnpm 12
- PostgreSQL 15+

## Setup

Dari root repositori:

```bash
pnpm install
```

Salin environment lalu sesuaikan nilainya:

```bash
cp Backend/.env.example Backend/.env
```

| Variabel | Keterangan |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` |
| `PORT` | Port API (default `3000`) |
| `DATABASE_URL` | Koneksi PostgreSQL, mis. `postgresql://postgres:postgres@localhost:5432/pos_db?schema=public` |
| `JWT_SECRET` | Minimal 32 karakter |
| `JWT_EXPIRES_IN` | Masa berlaku token (default `8h`) |
| `BCRYPT_SALT_ROUNDS` | 4–15 (default `12`) |
| `CORS_ORIGIN` | Origin frontend (default `http://localhost:5173`) |
| `TAX_RATE` | Pajak checkout, mis. `0.11` untuk 11% (`0` = tanpa pajak) |

## Database

```bash
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # prisma db seed (data development)
```

Seed menolak berjalan bila `NODE_ENV=production`, berjalan atomik, lalu memverifikasi
konsistensi stok/transaksi (`verifyConsistency`). Bila tidak konsisten, seed gagal dan
rollback.

Reset database (hapus semua data, migrasi ulang, seed ulang):

```bash
pnpm db:reset
```

## Menjalankan

```bash
pnpm dev:backend      # dari root, tsx watch
pnpm --dir Backend start   # production: node dist/server.js
pnpm --dir Backend build   # tsc -p tsconfig.build.json
```

Health check: `GET http://localhost:3000/api/health`.

## Akun Development

Hanya untuk development lokal — jangan dipakai di production.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@pos.local` | `Admin@12345` |
| Owner | `owner@pos.local` | `Owner@12345` |
| Cashier | `kasir1@pos.local` | `Kasir@12345` |
| Cashier | `kasir2@pos.local` | `Kasir@12345` |

## Test

Integration test memakai database PostgreSQL terpisah (`pos_test`) pada port `5432`.

```bash
pnpm --dir Backend test          # semua test
pnpm --dir Backend type-check    # tsc --noEmit
pnpm --dir Backend lint          # eslint
```

## Seeding Data

- 4 user, 5 kategori, 30 produk, 20 transaksi `COMPLETED`.
- Movement lengkap: `INITIAL_STOCK`, `PURCHASE`, `SALE`, `ADJUSTMENT`
  (lihat `prisma/seed-data/`).
- 3 produk sengaja dibuat stok rendah lewat `ADJUSTMENT` untuk demo.
