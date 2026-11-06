/**
 * Data master seed (PRD §16.4–16.5). Angka turunan (stok, movement, total)
 * dihitung oleh `seed.ts`, bukan ditulis di sini.
 */

export interface SeedCategory {
  key: string
  name: string
  description: string
}

export interface SeedProduct {
  sku: string
  barcode: string
  name: string
  categoryKey: string
  unit: string
  costPrice: number
  sellingPrice: number
  initialStock: number
  minStock: number
}

export const categories: SeedCategory[] = [
  {
    key: 'MKN',
    name: 'Makanan',
    description: 'Bahan makanan pokok dan makanan kemasan',
  },
  { key: 'MNM', name: 'Minuman', description: 'Minuman kemasan dan seduh' },
  { key: 'SNK', name: 'Snack', description: 'Camilan dan makanan ringan' },
  {
    key: 'RTG',
    name: 'Kebutuhan Rumah Tangga',
    description: 'Perlengkapan kebersihan dan rumah',
  },
  { key: 'PCR', name: 'Personal Care', description: 'Perawatan diri' },
]

export const products: SeedProduct[] = [
  { sku: 'MKN-001', barcode: '8991000000011', name: 'Beras Premium 5 kg', categoryKey: 'MKN', unit: 'pak', costPrice: 66_000, sellingPrice: 72_000, initialStock: 40, minStock: 10 },
  { sku: 'MKN-002', barcode: '8991000000028', name: 'Mie Instan Goreng', categoryKey: 'MKN', unit: 'bungkus', costPrice: 2_800, sellingPrice: 3_500, initialStock: 200, minStock: 40 },
  { sku: 'MKN-003', barcode: '8991000000035', name: 'Telur Ayam 1 kg', categoryKey: 'MKN', unit: 'kg', costPrice: 26_000, sellingPrice: 29_000, initialStock: 30, minStock: 8 },
  { sku: 'MKN-004', barcode: '8991000000042', name: 'Minyak Goreng 1 L', categoryKey: 'MKN', unit: 'pouch', costPrice: 15_500, sellingPrice: 17_500, initialStock: 60, minStock: 15 },
  { sku: 'MKN-005', barcode: '8991000000059', name: 'Gula Pasir 1 kg', categoryKey: 'MKN', unit: 'kg', costPrice: 15_000, sellingPrice: 17_000, initialStock: 50, minStock: 12 },
  { sku: 'MKN-006', barcode: '8991000000066', name: 'Sarden Kaleng 155 g', categoryKey: 'MKN', unit: 'kaleng', costPrice: 9_500, sellingPrice: 11_500, initialStock: 36, minStock: 10 },

  { sku: 'MNM-001', barcode: '8992000000018', name: 'Air Mineral 600 ml', categoryKey: 'MNM', unit: 'botol', costPrice: 2_200, sellingPrice: 3_500, initialStock: 144, minStock: 36 },
  { sku: 'MNM-002', barcode: '8992000000025', name: 'Teh Botol 450 ml', categoryKey: 'MNM', unit: 'botol', costPrice: 3_800, sellingPrice: 5_500, initialStock: 96, minStock: 24 },
  { sku: 'MNM-003', barcode: '8992000000032', name: 'Kopi Instan Sachet', categoryKey: 'MNM', unit: 'sachet', costPrice: 1_100, sellingPrice: 1_500, initialStock: 300, minStock: 60 },
  { sku: 'MNM-004', barcode: '8992000000049', name: 'Susu UHT Cokelat 200 ml', categoryKey: 'MNM', unit: 'kotak', costPrice: 4_200, sellingPrice: 5_500, initialStock: 72, minStock: 18 },
  { sku: 'MNM-005', barcode: '8992000000056', name: 'Minuman Isotonik 500 ml', categoryKey: 'MNM', unit: 'botol', costPrice: 5_500, sellingPrice: 7_500, initialStock: 48, minStock: 12 },
  { sku: 'MNM-006', barcode: '8992000000063', name: 'Air Mineral Galon 19 L', categoryKey: 'MNM', unit: 'galon', costPrice: 17_000, sellingPrice: 22_000, initialStock: 20, minStock: 5 },

  { sku: 'SNK-001', barcode: '8993000000017', name: 'Keripik Kentang 68 g', categoryKey: 'SNK', unit: 'bungkus', costPrice: 8_500, sellingPrice: 11_000, initialStock: 48, minStock: 12 },
  { sku: 'SNK-002', barcode: '8993000000024', name: 'Biskuit Cokelat 130 g', categoryKey: 'SNK', unit: 'bungkus', costPrice: 7_000, sellingPrice: 9_500, initialStock: 60, minStock: 15 },
  { sku: 'SNK-003', barcode: '8993000000031', name: 'Wafer Krim 150 g', categoryKey: 'SNK', unit: 'bungkus', costPrice: 6_500, sellingPrice: 8_500, initialStock: 50, minStock: 12 },
  { sku: 'SNK-004', barcode: '8993000000048', name: 'Kacang Asin 100 g', categoryKey: 'SNK', unit: 'bungkus', costPrice: 5_000, sellingPrice: 7_000, initialStock: 40, minStock: 10 },
  { sku: 'SNK-005', barcode: '8993000000055', name: 'Cokelat Batangan 40 g', categoryKey: 'SNK', unit: 'batang', costPrice: 6_000, sellingPrice: 8_500, initialStock: 60, minStock: 15 },
  { sku: 'SNK-006', barcode: '8993000000062', name: 'Permen Mint', categoryKey: 'SNK', unit: 'bungkus', costPrice: 2_500, sellingPrice: 4_000, initialStock: 100, minStock: 25 },

  { sku: 'RTG-001', barcode: '8994000000016', name: 'Deterjen Bubuk 800 g', categoryKey: 'RTG', unit: 'bungkus', costPrice: 17_500, sellingPrice: 21_500, initialStock: 30, minStock: 8 },
  { sku: 'RTG-002', barcode: '8994000000023', name: 'Sabun Cuci Piring 400 ml', categoryKey: 'RTG', unit: 'botol', costPrice: 8_500, sellingPrice: 11_500, initialStock: 36, minStock: 10 },
  { sku: 'RTG-003', barcode: '8994000000030', name: 'Pewangi Pakaian 900 ml', categoryKey: 'RTG', unit: 'pouch', costPrice: 12_500, sellingPrice: 16_000, initialStock: 24, minStock: 6 },
  { sku: 'RTG-004', barcode: '8994000000047', name: 'Tisu Gulung Isi 4', categoryKey: 'RTG', unit: 'pak', costPrice: 9_000, sellingPrice: 12_000, initialStock: 40, minStock: 10 },
  { sku: 'RTG-005', barcode: '8994000000054', name: 'Pembersih Lantai 780 ml', categoryKey: 'RTG', unit: 'botol', costPrice: 11_000, sellingPrice: 14_500, initialStock: 24, minStock: 6 },
  { sku: 'RTG-006', barcode: '8994000000061', name: 'Kantong Sampah Isi 10', categoryKey: 'RTG', unit: 'pak', costPrice: 6_000, sellingPrice: 8_500, initialStock: 40, minStock: 10 },

  { sku: 'PCR-001', barcode: '8995000000015', name: 'Sabun Mandi Batang 85 g', categoryKey: 'PCR', unit: 'batang', costPrice: 3_000, sellingPrice: 4_500, initialStock: 100, minStock: 25 },
  { sku: 'PCR-002', barcode: '8995000000022', name: 'Sampo 170 ml', categoryKey: 'PCR', unit: 'botol', costPrice: 14_500, sellingPrice: 18_500, initialStock: 30, minStock: 8 },
  { sku: 'PCR-003', barcode: '8995000000039', name: 'Pasta Gigi 120 g', categoryKey: 'PCR', unit: 'tube', costPrice: 8_500, sellingPrice: 11_500, initialStock: 48, minStock: 12 },
  { sku: 'PCR-004', barcode: '8995000000046', name: 'Sikat Gigi Dewasa', categoryKey: 'PCR', unit: 'pcs', costPrice: 4_000, sellingPrice: 6_500, initialStock: 60, minStock: 15 },
  { sku: 'PCR-005', barcode: '8995000000053', name: 'Deodoran Roll-on 50 ml', categoryKey: 'PCR', unit: 'botol', costPrice: 11_500, sellingPrice: 15_500, initialStock: 24, minStock: 6 },
  { sku: 'PCR-006', barcode: '8995000000060', name: 'Sabun Cuci Tangan Refill 200 ml', categoryKey: 'PCR', unit: 'pouch', costPrice: 7_500, sellingPrice: 10_500, initialStock: 30, minStock: 8 },
]
