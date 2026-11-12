# POS — Sistem Point of Sale

Sistem Point of Sale (POS) untuk toko ritel: katalog produk, transaksi kasir, shift, retur, stok opname, pembelian, laporan, dan audit dalam satu monorepo.

Aplikasi terdiri dari REST API Express + Prisma/PostgreSQL dan SPA Vue 3 + Vite + TypeScript + Tailwind CSS. Cocok untuk pembelajaran, prototipe, maupun pengembangan bertahap menjadi sistem produksi.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.18-339933?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12.16.1-F69220?logo=pnpm&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-4.x-FFD859?logo=pinia&logoColor=black)

## Daftar Isi

- [Sorotan Fitur](#sorotan-fitur)
- [Galeri Aplikasi](#galeri-aplikasi)
- [Arsitektur](#arsitektur)
- [Teknologi](#teknologi)
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Akun Seed](#akun-seed)
- [Peran dan Hak Akses](#peran-dan-hak-akses)
- [Alur Penggunaan UI](#alur-penggunaan-ui)
- [Contoh Penggunaan API](#contoh-penggunaan-api)
- [Script](#script)
- [Pengujian](#pengujian)
- [Keamanan dan Operasional](#keamanan-dan-operasional)
- [Troubleshooting](#troubleshooting)
- [Kontribusi](#kontribusi)

## Sorotan Fitur

### Katalog dan Harga

- CRUD produk dan kategori dengan SKU, satuan, stok minimum, serta status aktif.
- Barcode manual 8–14 digit atau generate otomatis EAN-13 internal dengan prefix `200–299` dan check digit.
- Cetak label barcode; frontend memakai EAN13/UPC bila barcode valid, selain itu CODE128.
- Riwayat perubahan harga dan penyesuaian harga massal dengan mode `SET`, `PERCENT`, atau `NOMINAL`.
- Penyesuaian massal dapat menyasar `product_ids` atau `category_id`, maksimal 500 produk.
- Penjadwalan harga memerlukan `effective_date` di masa depan dan alasan minimal 3 karakter.

### Transaksi dan Shift

- Checkout POS: 1–100 item, produk tidak boleh duplikat, quantity bilangan bulat positif, diskon item/transaksi maksimal 2 desimal.
- Pembayaran `CASH`, `QRIS`, `DEBIT_CARD`, atau `BANK_TRANSFER`.
- Pembayaran tunai mensyaratkan `amount_paid >= total`; pembayaran non-tunai harus tepat sebesar total.
- `Idempotency-Key` (UUID v4) wajib pada checkout; request baru menghasilkan `201`, replay menghasilkan `200`.
- Invoice dan status transaksi (default `COMPLETED`), serta pencatatan kasir dan shift.
- Buka/tutup shift dan rekonsiliasi kas.
- Retur terhubung ke invoice asal, dengan akses buat untuk ADMIN/CASHIER dan baca untuk semua peran.

### Inventori

- Stok real-time, indikator stok rendah, riwayat pergerakan stok, dan penyesuaian stok.
- Stok opname dengan cakupan `ALL`, `CATEGORY`, atau `PRODUCT`.
- Alur opname: `DRAFT → IN_PROGRESS → SUBMITTED → APPROVED → COMPLETED`; penolakan mengembalikan sesi ke `IN_PROGRESS`.
- Pembatalan opname diizinkan dari status `DRAFT`, `IN_PROGRESS`, atau `REJECTED`.
- Self-approval ditolak; approval menerapkan stok fisik dan membuat pergerakan `ADJUSTMENT` (referensi `STOCK_OPNAME`) hanya untuk item yang stoknya berubah.

### Pengadaan

- Master supplier dan purchase order.
- Alur PO: `DRAFT → ORDERED → RECEIVED`; pembatalan diizinkan dari `DRAFT` atau `ORDERED`.
- Penerimaan barang memperbarui stok, menghitung ulang moving weighted average cost, dan mencatat riwayat harga.

### Laporan dan Audit

- Laporan penjualan, produk, kasir, valuasi inventori, dan COGS/laba kotor.
- Valuasi inventori membutuhkan `report:read` dan `cost-price:read`.
- Audit log untuk jejak perubahan data.
- Harga pokok (`cost_price`, `unit_cost`) hanya dikirim ke peran dengan `cost-price:read`.

### Operasional

- Manajemen pengguna dan reset password oleh ADMIN.
- Backup dan restore database melalui `pg_dump`/`pg_restore`.
- Backup terjadwal harian pukul 02.00 waktu lokal server.
- Health check di `GET /api/health`.

## Galeri Aplikasi

<table>
  <tr>
    <td width="50%" align="center">
      <img src="screenshots/01-login.png" alt="Halaman login POS dengan form email dan password" width="440" /><br />
      <sub><strong>01. Login</strong> — masuk dengan akun seed sesuai peran.</sub>
    </td>
    <td width="50%" align="center">
      <img src="screenshots/02-dashboard.png" alt="Dashboard POS dengan ringkasan operasional toko" width="440" /><br />
      <sub><strong>02. Dashboard</strong> — ringkasan operasional dan navigasi modul.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="screenshots/03-produk.png" alt="Daftar produk dengan stok, harga, dan kategori" width="440" /><br />
      <sub><strong>03. Produk</strong> — katalog, stok, harga jual, dan kategori.</sub>
    </td>
    <td width="50%" align="center">
      <img src="screenshots/04-label-barcode.png" alt="Pratinjau dan cetak label barcode produk" width="440" /><br />
      <sub><strong>04. Label barcode</strong> — pratinjau dan cetak label.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="screenshots/05-manajemen-harga.png" alt="Halaman manajemen harga dan riwayat perubahan harga" width="440" /><br />
      <sub><strong>05. Manajemen harga</strong> — perubahan satuan/massal dan riwayat.</sub>
    </td>
    <td width="50%" align="center">
      <img src="screenshots/06-pos.png" alt="Layar checkout POS dengan keranjang dan pembayaran" width="440" /><br />
      <sub><strong>06. POS</strong> — keranjang, diskon, dan pembayaran.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="screenshots/07-inventori.png" alt="Halaman inventori dengan stok dan pergerakan stok" width="440" /><br />
      <sub><strong>07. Inventori</strong> — stok, stok rendah, dan pergerakan.</sub>
    </td>
    <td width="50%" align="center">
      <img src="screenshots/08-stok-opname.png" alt="Daftar sesi stok opname beserta statusnya" width="440" /><br />
      <sub><strong>08. Stok opname</strong> — daftar sesi dan status alur kerja.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="screenshots/09-stok-opname-detail.png" alt="Detail stok opname dengan input stok fisik per produk" width="440" /><br />
      <sub><strong>09. Detail opname</strong> — hitung stok fisik dan selisih.</sub>
    </td>
    <td width="50%" align="center">
      <img src="screenshots/10-laporan-valuasi.png" alt="Laporan valuasi inventori per kategori" width="440" /><br />
      <sub><strong>10. Valuasi inventori</strong> — nilai stok per produk/kategori.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="screenshots/11-laporan-laba.png" alt="Laporan laba kotor dan COGS" width="440" /><br />
      <sub><strong>11. Laporan laba/COGS</strong> — pendapatan, HPP, dan laba kotor.</sub>
    </td>
    <td width="50%" align="center">
      <img src="screenshots/12-pembelian.png" alt="Halaman purchase order dan pembelian supplier" width="440" /><br />
      <sub><strong>12. Pembelian</strong> — purchase order dan penerimaan barang.</sub>
    </td>
  </tr>
</table>

## Arsitektur

```
Browser (Vue 3 SPA)
        │  HTTP/JSON (Axios)
        ▼
Express 5 REST API  ──►  Prisma Client  ──►  PostgreSQL 15+
        │
        └──►  Backup/restore via pg_dump & pg_restore
```

- **Backend** menyediakan REST API berlapis: route → controller → service → repository, dengan validasi Zod dan otorisasi berbasis permission.
- **Frontend** adalah SPA Vue 3 dengan Pinia untuk state, Vue Router untuk navigasi, dan Axios untuk komunikasi API.
- **Database** dikelola Prisma; seed menyediakan data awal dan akun pengembangan.
- Dokumentasi per paket: [`Backend/README.md`](Backend/README.md) dan [`Frontend/README.md`](Frontend/README.md).

### Struktur Folder

```
POS/
├─ Backend/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ seed.ts
│  ├─ src/
│  │  ├─ config/
│  │  ├─ constants/
│  │  ├─ controllers/
│  │  ├─ errors/
│  │  ├─ mappers/
│  │  ├─ middlewares/
│  │  ├─ repositories/
│  │  ├─ routes/
│  │  ├─ scheduler/
│  │  ├─ services/
│  │  ├─ types/
│  │  ├─ utils/
│  │  ├─ validators/
│  │  ├─ app.ts
│  │  ├─ container.ts
│  │  └─ server.ts
│  └─ package.json
├─ Frontend/
│  ├─ src/
│  │  ├─ assets/
│  │  ├─ components/
│  │  ├─ composables/
│  │  ├─ layouts/
│  │  ├─ pages/
│  │  ├─ router/
│  │  ├─ services/
│  │  ├─ stores/
│  │  ├─ types/
│  │  ├─ utils/
│  │  ├─ App.vue
│  │  └─ main.ts
│  └─ package.json
├─ screenshots/
├─ package.json
├─ pnpm-workspace.yaml
└─ pnpm-lock.yaml
```

## Teknologi

| Lapisan | Teknologi | Versi |
| --- | --- | --- |
| Runtime | Node.js | `>=22.18.0` |
| Package manager | pnpm | `12.16.1` |
| Backend | Express | `^5.3.0` |
| ORM | Prisma | `^6.19.3` |
| Database | PostgreSQL | `15+` |
| Validasi | Zod | `^4.6.7` |
| Autentikasi | jsonwebtoken + bcrypt | `^9.0.3` / `^6.0.0` |
| Frontend | Vue | `^3.5.42` |
| Build tool | Vite | `^8.2.2` |
| Bahasa | TypeScript | `~6.0` |
| Styling | Tailwind CSS | `^4.3.4` |
| State | Pinia | `^4.0.3` |
| Routing | Vue Router | `^5.3.1` |
| HTTP client | Axios | `^1.21.0` |
| Barcode | JsBarcode | `^3.12.3` |
| Unit test | Vitest | backend `^5.1.0`, frontend `^4.1.11` |
| E2E test | Playwright | `^1.63.0` |
| Lint/format | oxlint, ESLint, Prettier | sesuai `package.json` |

## Prasyarat

- **Node.js** `>=22.18.0` (frontend juga menerima `>=24.12.0`).
- **pnpm** `12.16.1` (aktifkan via Corepack bila perlu).
- **PostgreSQL** 15 atau lebih baru.
- **`pg_dump` dan `pg_restore`** tersedia di `PATH` untuk fitur backup/restore.
- Port `3000` (API) dan `5173` (frontend) tersedia.

```bash
corepack enable
pnpm --version   # harus 12.16.1 sesuai packageManager
```

## Instalasi

1. **Clone repositori dan install dependensi**

   ```bash
   git clone https://github.com/Ryunoo09/POS-System-Free.git
   cd POS-System-Free
   pnpm install
   ```

2. **Siapkan database**

   ```bash
   psql -U postgres -c "CREATE USER pos_user WITH PASSWORD 'change_me';"
   psql -U postgres -c "CREATE DATABASE pos_db OWNER pos_user;"
   ```

   Sesuaikan password dengan `DATABASE_URL` di `Backend/.env`. Jika user
   `pos_user` sudah ada, lewati perintah pertama.

3. **Salin konfigurasi environment**

   ```bash
   cp Backend/.env.example Backend/.env
   cp Frontend/.env.example Frontend/.env
   ```

   Di PowerShell:

   ```powershell
   Copy-Item Backend\.env.example Backend\.env
   Copy-Item Frontend\.env.example Frontend\.env
   ```

4. **Sesuaikan `DATABASE_URL` dan `JWT_SECRET`** di `Backend/.env`.

5. **Jalankan migrasi dan seed**

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   Bila Prisma Client belum terbentuk:

   ```bash
   pnpm --dir Backend prisma:generate
   ```

6. **Jalankan aplikasi**

   ```bash
   pnpm dev
   ```

   Atau jalankan terpisah di dua terminal:

   ```bash
   pnpm dev:backend
   pnpm dev:frontend
   ```

7. **Buka aplikasi**

   - Frontend: <http://localhost:5173>
   - API: <http://localhost:3000/api>
   - Health check: <http://localhost:3000/api/health>

## Konfigurasi Environment

### Backend (`Backend/.env`)

| Variabel | Default contoh | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `development` | Mode runtime. |
| `PORT` | `3000` | Port HTTP API. |
| `DATABASE_URL` | `postgresql://pos_user:change_me@localhost:5432/pos_db?schema=public` | Koneksi PostgreSQL. |
| `JWT_SECRET` | `change_me_to_at_least_32_random_characters` | Secret JWT; gunakan minimal 32 karakter acak. |
| `JWT_EXPIRES_IN` | `8h` | Masa berlaku token. |
| `BCRYPT_SALT_ROUNDS` | `12` | Jumlah salt round bcrypt. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin frontend yang diizinkan. |
| `TAX_RATE` | `0` | Tarif pajak; `0` berarti tanpa pajak. |

### Frontend (`Frontend/.env`)

| Variabel | Default contoh | Keterangan |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000/api` | Base URL API. |
| `VITE_TAX_RATE` | `0` | Tarif pajak untuk tampilan/transaksi di UI. |

> Jangan commit file `.env` atau nilai secret ke repositori.

## Akun Seed

Dibuat oleh `Backend/prisma/seed.ts`:

| Email | Password | Peran |
| --- | --- | --- |
| `admin@pos.local` | `Admin@12345` | `ADMIN` |
| `owner@pos.local` | `Owner@12345` | `OWNER` |
| `kasir1@pos.local` | `Kasir@12345` | `CASHIER` |
| `kasir2@pos.local` | `Kasir@12345` | `CASHIER` |

> Akun ini hanya untuk pengembangan. Ganti password dan secret sebelum deployment.

## Peran dan Hak Akses

| Kemampuan | ADMIN | OWNER | CASHIER |
| --- | :---: | :---: | :---: |
| Dashboard | ✅ | ✅ | — |
| Baca produk & kategori | ✅ | ✅ | ✅ |
| Tulis produk & kategori | ✅ | — | — |
| Baca inventori | ✅ | ✅ | — |
| Penyesuaian stok | ✅ | — | — |
| Checkout POS (`transaction:create`) | — | — | ✅ |
| Lihat semua transaksi | ✅ | ✅ | — |
| Lihat transaksi sendiri | — | — | ✅ |
| Shift | ✅ | baca | ✅ |
| Retur | ✅ | baca | ✅ |
| Supplier & purchase order | ✅ | baca | — |
| Laporan | ✅ | ✅ | — |
| Harga pokok (`cost-price:read`) | ✅ | ✅ | — |
| Audit log | ✅ | ✅ | — |
| Manajemen pengguna | ✅ | — | — |
| Backup/restore | ✅ | ✅ | — |
| Stok opname: buat/kelola | ✅ | — | — |
| Stok opname: baca | ✅ | ✅ | — |
| Stok opname: setujui | ✅ | ✅ | — |

Catatan penting:

- Hanya `CASHIER` yang memiliki `transaction:create`; ADMIN dan OWNER tidak dapat melakukan checkout POS.
- Approval opname tidak boleh dilakukan oleh pembuat sesi yang sama.
- ADMIN memiliki `stock_opname:approve`, tetapi self-approval tetap ditolak; dalam praktiknya OWNER yang menyetujui sesi buatan ADMIN.

## Alur Penggunaan UI

### 1. Login

Masuk dengan akun seed. Menu dan aksi yang tampil mengikuti permission peran. Token disimpan untuk sesi dan dikirim sebagai `Authorization: Bearer <token>`.

### 2. POS dan Shift

1. CASHIER membuka shift dan mencatat kas awal.
2. Tambahkan produk ke keranjang melalui pencarian atau scan barcode.
3. Atur quantity dan diskon transaksi bila diperlukan.
4. Pilih metode pembayaran; untuk tunai isi `amount_paid`.
5. Checkout membuat invoice dan mengurangi stok.
6. Tutup shift dengan kas aktual untuk melihat selisih.

### 3. Retur

Buka transaksi/invoice asal, buat retur, lalu pilih item yang dikembalikan. Retur tercatat dan terhubung ke invoice asal.

### 4. Stok Opname

1. ADMIN membuat sesi dengan scope `ALL`, `CATEGORY`, atau `PRODUCT`.
2. Mulai sesi (`IN_PROGRESS`), lalu isi stok fisik per item.
3. Submit sesi (`SUBMITTED`).
4. OWNER/ADMIN lain menyetujui (`APPROVED`); penolakan mengembalikan sesi ke `IN_PROGRESS` dengan alasan.
5. Selesaikan sesi (`COMPLETED`). Approval membuat pergerakan `ADJUSTMENT` dengan referensi `STOCK_OPNAME`.

### 5. Pembelian

1. Buat purchase order (`DRAFT`).
2. Kirim ke supplier (`ORDERED`).
3. Terima barang (`RECEIVED`); stok bertambah, moving weighted average cost dihitung ulang, dan riwayat harga tercatat.
4. PO dapat dibatalkan selama masih `DRAFT` atau `ORDERED`.

### 6. Barcode dan Label

- Isi barcode manual 8–14 digit, atau biarkan sistem membuat EAN-13 internal dengan prefix `200–299`.
- Halaman label menampilkan pratinjau dan opsi cetak.
- Barcode valid dirender sebagai EAN13/UPC; selain itu digunakan CODE128.

### 7. Manajemen Harga

- Ubah harga satuan atau lakukan perubahan massal.
- Mode: `SET` (harga baru), `PERCENT` (persentase), `NOMINAL` (selisih nominal).
- Target: daftar `product_ids` atau satu `category_id`, maksimal 500 produk.
- Perubahan terjadwal memerlukan tanggal efektif di masa depan dan alasan minimal 3 karakter.

### 8. Laporan

- Laporan penjualan, produk, dan kasir untuk periode tertentu.
- Laporan valuasi inventori menampilkan total nilai, total kuantitas, rincian per produk, dan agregasi per kategori.
- Laporan COGS menampilkan pendapatan, HPP, dan laba kotor.
- Harga pokok hanya terlihat bagi ADMIN dan OWNER.

## Contoh Penggunaan API

**Base URL:** `http://localhost:3000/api`

**Header autentikasi:**

```
Authorization: Bearer <token>
```

**Envelope respons sukses:**

```json
{
  "success": true,
  "message": "<pesan>",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total_items": 0,
    "total_pages": 0
  }
}
```

`meta` hanya muncul pada endpoint berpaginasi. **Envelope error:**

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "items[0].quantity",
      "message": "<pesan validasi>"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

### Grup Endpoint

| Grup | Base path | Fungsi utama |
| --- | --- | --- |
| Auth | `/api/auth` | Login dan profil sesi. |
| Dashboard | `/api/dashboard` | Ringkasan operasional. |
| Users | `/api/users` | Manajemen pengguna. |
| Categories | `/api/categories` | Kategori produk. |
| Products | `/api/products` | Produk, barcode, dan harga. |
| Inventory | `/api/inventory` | Stok dan pergerakan stok. |
| Reports | `/api/reports` | Penjualan, produk, kasir, valuasi, COGS. |
| Transactions | `/api/transactions` | Checkout dan riwayat transaksi. |
| Shifts | `/api/shifts` | Buka/tutup shift. |
| Audit logs | `/api/audit-logs` | Jejak audit. |
| Returns | `/api/returns` | Retur transaksi. |
| Suppliers | `/api/suppliers` | Master supplier. |
| Purchase orders | `/api/purchase-orders` | PO dan penerimaan barang. |
| Backup | `/api/backup` | Backup/restore database. |
| Stock opnames | `/api/stock-opnames` | Sesi stok opname. |
| Health | `/api/health` | Health check. |

### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kasir1@pos.local",
    "password": "Kasir@12345"
  }'
```

Contoh respons (diringkas):

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "<JWT>",
    "token_type": "Bearer",
    "expires_in": "8h",
    "user": {
      "id": "<UUID>",
      "name": "<nama pengguna>",
      "email": "kasir1@pos.local",
      "role": "CASHIER"
    }
  }
}
```

Simpan token sesuai peran yang dibutuhkan:

```bash
ADMIN_TOKEN="<JWT dari login admin@pos.local>"
CASHIER_TOKEN="<JWT dari login kasir1@pos.local>"
```

### 2. Daftar Produk

```bash
curl "http://localhost:3000/api/products?page=1&limit=2" \
  -H "Authorization: Bearer $CASHIER_TOKEN"
```

Contoh respons (diringkas):

```json
{
  "success": true,
  "message": "Request successful",
  "data": [
    {
      "id": "<UUID>",
      "sku": "<SKU>",
      "barcode": "2000000000015",
      "name": "<nama produk>",
      "description": null,
      "category": { "id": "<UUID>", "name": "<kategori>" },
      "unit": "pcs",
      "selling_price": "10000.00",
      "stock": 25,
      "min_stock": 5,
      "is_low_stock": false,
      "is_active": true,
      "created_at": "2026-11-12T08:00:00.000Z",
      "updated_at": "2026-11-12T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 2,
    "total_items": 1,
    "total_pages": 1
  }
}
```

> `cost_price` hanya muncul untuk ADMIN/OWNER (`cost-price:read`).

### 3. Laporan Valuasi Inventori

Gunakan token **ADMIN** atau **OWNER**.

```bash
curl "http://localhost:3000/api/reports/inventory-valuation?category_id=<CATEGORY_UUID>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Endpoint ini membutuhkan `report:read` **dan** `cost-price:read` (ADMIN/OWNER). `category_id` opsional.

Contoh respons (diringkas):

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "total_value": "250000.00",
    "total_quantity": 25,
    "items": [
      {
        "product_id": "<UUID>",
        "sku": "<SKU>",
        "name": "<nama produk>",
        "category": "<kategori>",
        "stock": 25,
        "average_cost": "10000.00",
        "inventory_value": "250000.00"
      }
    ],
    "by_category": [
      {
        "category_id": "<UUID>",
        "category": "<kategori>",
        "quantity": 25,
        "value": "250000.00"
      }
    ]
  }
}
```

### 4. Checkout POS

Gunakan token **CASHIER**. `Idempotency-Key` wajib berupa UUID v4.

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 8f14e45f-ea3a-4b1c-9a1e-2f6d4c8b7a10" \
  -d '{
    "items": [
      {
        "product_id": "<PRODUCT_UUID>",
        "quantity": 2,
        "discount_amount": 0
      }
    ],
    "discount_amount": 0,
    "payment": {
      "method": "CASH",
      "amount_paid": 50000
    }
  }'
```

Contoh respons `201 Created` (diringkas):

```json
{
  "success": true,
  "message": "Transaksi berhasil",
  "data": {
    "id": "<UUID>",
    "invoice_number": "INV-20261112-000001",
    "cashier": { "id": "<UUID>", "name": "<nama kasir>" },
    "status": "COMPLETED",
    "subtotal": "20000.00",
    "discount_amount": "0.00",
    "tax_amount": "0.00",
    "total_amount": "20000.00",
    "payment_method": "CASH",
    "item_count": 1,
    "created_at": "2026-11-12T10:00:00.000Z"
  }
}
```

- `201` untuk transaksi baru, `200` untuk replay dengan `Idempotency-Key` yang sama.
- Untuk non-tunai, `amount_paid` harus tepat sama dengan total.
- ADMIN/OWNER tidak memiliki `transaction:create` dan akan mendapat `403`.

### 5. Membuat Stok Opname

Gunakan token **ADMIN** (`stock_opname:manage`).

```bash
curl -X POST http://localhost:3000/api/stock-opnames \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Opname November 2026",
    "scope": "PRODUCT",
    "product_ids": ["<PRODUCT_UUID>"],
    "notes": "Cek fisik produk fast-moving"
  }'
```

Contoh respons `201 Created` (diringkas):

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "id": "<UUID>",
    "session_number": "OPN-20261112-1A2B3C4D",
    "name": "Opname November 2026",
    "status": "DRAFT",
    "scope": "PRODUCT",
    "total_items": 1,
    "counted_items": 0,
    "uncounted_items": 1,
    "created_by": { "id": "<UUID>", "name": "<nama admin>" }
  }
}
```

Respons lengkap juga memuat `notes`, `approved_by`, timestamp alur kerja, field ringkasan lainnya, dan array `items` berisi stok sistem/fisik per produk.

Aturan payload:

- `scope`: `ALL`, `CATEGORY`, atau `PRODUCT`.
- Scope `CATEGORY` wajib mengirim `category_ids` dan tidak boleh `product_ids`.
- Scope `PRODUCT` wajib mengirim `product_ids` dan tidak boleh `category_ids`.
- Scope `ALL` tidak boleh mengirim keduanya.
- `name` maksimal 150 karakter; `notes` maksimal 500 karakter.

## Script

### Root

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | Jalankan backend dan frontend paralel. |
| `pnpm dev:backend` | Backend development (`tsx watch`). |
| `pnpm dev:frontend` | Frontend development (Vite). |
| `pnpm build` | Build semua paket yang memiliki script build. |
| `pnpm type-check` | Type-check semua paket. |
| `pnpm lint` | Lint semua paket. |
| `pnpm format` | Format frontend dengan Prettier. |
| `pnpm test` | Test semua paket. |
| `pnpm test:unit` | Unit test frontend (Vitest). |
| `pnpm test:e2e` | E2E test frontend (Playwright). |
| `pnpm db:migrate` | `prisma migrate dev`. |
| `pnpm db:deploy` | `prisma migrate deploy`. |
| `pnpm db:reset` | Reset database dan migrasi. |
| `pnpm db:seed` | Seed database. |

### Backend

| Perintah | Fungsi |
| --- | --- |
| `pnpm --dir Backend dev` | Development dengan watch. |
| `pnpm --dir Backend build` | Compile TypeScript ke `dist/`. |
| `pnpm --dir Backend start` | Jalankan hasil build. |
| `pnpm --dir Backend type-check` | `tsc --noEmit`. |
| `pnpm --dir Backend lint` | ESLint. |
| `pnpm --dir Backend test` | Vitest sekali jalan. |
| `pnpm --dir Backend test:watch` | Vitest watch. |
| `pnpm --dir Backend prisma:generate` | Generate Prisma Client. |
| `pnpm --dir Backend prisma:migrate` | Migrasi development. |
| `pnpm --dir Backend prisma:deploy` | Migrasi production. |
| `pnpm --dir Backend prisma:reset` | Reset database. |
| `pnpm --dir Backend prisma:studio` | Prisma Studio. |
| `pnpm --dir Backend prisma:seed` | Seed database. |

### Frontend

| Perintah | Fungsi |
| --- | --- |
| `pnpm --dir Frontend dev` | Vite dev server. |
| `pnpm --dir Frontend build` | Type-check + build produksi. |
| `pnpm --dir Frontend preview` | Pratinjau hasil build. |
| `pnpm --dir Frontend type-check` | `vue-tsc --build`. |
| `pnpm --dir Frontend lint` | oxlint + ESLint. |
| `pnpm --dir Frontend format` | Prettier untuk `src/`. |
| `pnpm --dir Frontend test:unit` | Unit test Vitest. |
| `pnpm --dir Frontend test:e2e` | E2E Playwright. |

## Pengujian

### Backend

```bash
pnpm --dir Backend test
```

Konfigurasi Vitest backend memakai database terpisah:

```
postgresql://postgres@localhost:5433/pos_test?schema=public
```

- Pastikan PostgreSQL berjalan di port `5433` dan database `pos_test` tersedia.
- `fileParallelism: false` agar test tidak saling mengganggu.
- Test membersihkan tabel; **jangan arahkan ke database development**.

Contoh menyiapkan database test:

```bash
createdb -p 5433 pos_test
```

### Frontend

```bash
pnpm --dir Frontend test:unit
pnpm --dir Frontend test:e2e
```

Untuk E2E, pastikan API dan UI berjalan, database sudah dimigrasi dan di-seed, serta akun seed tersedia.

### Pemeriksaan sebelum commit

```bash
pnpm type-check
pnpm lint
pnpm test
```

## Keamanan dan Operasional

- **Autentikasi:** JWT bearer; default berlaku `8h` (`JWT_EXPIRES_IN`).
- **Password:** bcrypt dengan `BCRYPT_SALT_ROUNDS=12` secara default.
- **Otorisasi:** permission berbasis peran di backend; UI hanya menyembunyikan aksi, validasi tetap di API.
- **Data sensitif:** `cost_price` dan `unit_cost` tidak dikirim ke peran tanpa `cost-price:read`.
- **CORS:** batasi `CORS_ORIGIN` ke origin frontend yang benar.
- **Idempotensi checkout:** wajib `Idempotency-Key` UUID v4 untuk mencegah transaksi ganda.
- **Audit:** perubahan penting tercatat di audit log dan dapat dibaca ADMIN/OWNER.
- **Backup:** memerlukan `pg_dump`; restore memerlukan `pg_restore`, nama file, password akun, dan konfirmasi `RESTORE`.
- **Scheduler:** backup harian berjalan pukul **02.00 waktu lokal server**.
- **Pajak:** atur `TAX_RATE`/`VITE_TAX_RATE`; nilai `0` berarti tanpa pajak.

Checklist produksi:

- Ganti seluruh password akun seed.
- Gunakan `JWT_SECRET` acak minimal 32 karakter dan simpan di secret manager.
- Aktifkan HTTPS dan batasi akses database.
- Gunakan `prisma migrate deploy`, bukan `migrate dev`.
- Uji restore backup secara berkala, bukan hanya membuat backup.
- Jangan mengekspos file backup melalui web server.

## Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
| --- | --- | --- |
| `Can't reach database server` / `P1001` | PostgreSQL tidak berjalan atau `DATABASE_URL` salah | Nyalakan PostgreSQL, cek host/port/user/password/database. |
| Prisma Client error setelah install | Client belum di-generate | `pnpm --dir Backend prisma:generate`. |
| `prisma generate` gagal `EPERM` di Windows | Proses dev masih memegang `query_engine-windows.dll.node` | Hentikan `pnpm dev`, tutup proses Node, lalu ulangi generate. |
| API gagal start karena `JWT_SECRET` | Secret kosong atau terlalu pendek | Isi minimal 32 karakter acak di `Backend/.env`. |
| Frontend gagal memanggil API | `VITE_API_URL` salah | Set `VITE_API_URL=http://localhost:3000/api`, restart Vite. |
| Error CORS | `CORS_ORIGIN` tidak sama dengan origin frontend | Samakan origin, termasuk protokol dan port. |
| `401 Unauthorized` | Token tidak ada, kedaluwarsa, atau invalid | Login ulang dan kirim header `Authorization`. |
| `403 Forbidden` | Peran tidak memiliki permission | Cek matriks peran; contoh: ADMIN tidak bisa checkout. |
| Port 3000/5173 dipakai | Proses lain berjalan | Hentikan proses atau ubah port dan sesuaikan env. |
| Backup gagal | `pg_dump`/`pg_restore` tidak ada di `PATH` | Install PostgreSQL client tools dan pastikan dapat dipanggil dari terminal. |
| Test backend gagal konek | Database `pos_test` di port 5433 belum ada | `createdb -p 5433 pos_test`. |
| E2E gagal | API/UI belum berjalan atau seed belum dijalankan | Jalankan `pnpm dev`, migrasi, dan seed. |
| Data seed bentrok | Seed dijalankan berulang pada data yang sama | Reset database development dengan `pnpm db:reset`, lalu seed ulang. |

## Kontribusi

1. Buat branch dari branch utama.
2. Jalankan `pnpm install` bila dependensi berubah.
3. Terapkan perubahan kecil dan terfokus.
4. Jalankan `pnpm type-check`, `pnpm lint`, dan test yang relevan.
5. Perbarui dokumentasi bila perilaku API/UI berubah.
6. Ajukan pull request dengan deskripsi perubahan dan langkah verifikasi.

Repositori ini **belum memiliki file `LICENSE`**. Tambahkan lisensi yang sesuai sebelum mendistribusikan ulang proyek.
