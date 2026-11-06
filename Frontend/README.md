# Frontend — POS System

SPA Vue 3 + Vite + TypeScript + Tailwind CSS, dengan Pinia dan Vue Router.

## Prasyarat

- Node.js >= 22.18
- pnpm 12
- Backend POS berjalan (lihat `Backend/README.md`)

## Setup

Dari root repositori:

```bash
pnpm install
```

Salin environment lalu sesuaikan bila perlu:

```bash
cp Frontend/.env.example Frontend/.env
```

| Variabel | Keterangan |
|---|---|
| `VITE_API_URL` | Base URL API (default `http://localhost:3000/api`) |
| `VITE_TAX_RATE` | Pajak untuk estimasi tampilan (samakan dengan `TAX_RATE` backend) |

## Menjalankan

```bash
pnpm dev:frontend        # dari root, http://localhost:5173
```

## Script

```bash
pnpm --dir Frontend build        # type-check + vite build
pnpm --dir Frontend type-check   # vue-tsc --build
pnpm --dir Frontend lint         # oxlint + eslint
pnpm --dir Frontend format       # prettier
pnpm --dir Frontend test:unit    # vitest
pnpm --dir Frontend test:e2e     # playwright
```

## Akun Development

Sama dengan backend (jalankan `pnpm db:seed` lebih dulu). Hanya untuk lokal.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@pos.local` | `Admin@12345` |
| Owner | `owner@pos.local` | `Owner@12345` |
| Cashier | `kasir1@pos.local` | `Kasir@12345` |
| Cashier | `kasir2@pos.local` | `Kasir@12345` |

## E2E

Test Playwright memerlukan backend berjalan dan database development yang sudah di-seed.

```bash
pnpm dev:backend     # terminal 1
pnpm test:e2e        # terminal 2
```

Konfigurasi Playwright menjalankan Vite dev server secara otomatis.
