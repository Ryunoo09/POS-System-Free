#!/usr/bin/env node
// Benchmark HTTP sederhana tanpa dependensi tambahan.
//
// Bandingkan cache hidup vs mati (jalankan server terpisah untuk tiap mode):
//   REDIS_ENABLED=false pnpm --dir Backend start   # baseline tanpa cache
//   REDIS_ENABLED=true  pnpm --dir Backend start   # dengan cache
//   BENCH_URL=http://127.0.0.1:3000/api/health node Backend/scripts/bench.mjs
//
// Env: BENCH_URL (wajib), BENCH_TOKEN (Bearer, opsional),
//      BENCH_CONCURRENCY=10, BENCH_DURATION_MS=10000, BENCH_TIMEOUT_MS=5000.

const url = process.env.BENCH_URL
if (!url) {
  console.error('BENCH_URL wajib diisi. Contoh: BENCH_URL=http://127.0.0.1:3000/api/health')
  process.exit(1)
}

const concurrency = Number(process.env.BENCH_CONCURRENCY ?? 10)
const durationMs = Number(process.env.BENCH_DURATION_MS ?? 10_000)
const timeoutMs = Number(process.env.BENCH_TIMEOUT_MS ?? 5_000)
const token = process.env.BENCH_TOKEN

const headers = token ? { authorization: `Bearer ${token}` } : {}
const latencies = []
let ok = 0
let failed = 0
const deadline = Date.now() + durationMs

const worker = async () => {
  while (Date.now() < deadline) {
    const started = performance.now()

    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
      await response.arrayBuffer()
      if (response.ok) ok += 1
      else failed += 1
    } catch {
      failed += 1
    }

    latencies.push(performance.now() - started)
  }
}

const startedAt = Date.now()
await Promise.all(Array.from({ length: concurrency }, worker))
const elapsedMs = Date.now() - startedAt

const percentile = (p) => {
  if (latencies.length === 0) return 0
  const sorted = [...latencies].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

const total = ok + failed
console.log(`url          ${url}`)
console.log(`durasi       ${elapsedMs} ms, concurrency ${concurrency}`)
console.log(`requests     ${total} (ok ${ok}, gagal ${failed})`)
console.log(`throughput   ${(total / (elapsedMs / 1000)).toFixed(1)} req/s`)
console.log(
  `latensi      p50 ${percentile(50).toFixed(1)} ms | p95 ${percentile(95).toFixed(1)} ms | p99 ${percentile(99).toFixed(1)} ms`,
)
