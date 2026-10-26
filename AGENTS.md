# AGENTS — frontend (React + Vite)

Baca `../README.md` **dulu** sebelum explore. Berisi peta lengkap: stack, route
map, struktur file, dan gotchas. Tujuannya supaya tidak perlu re-explore dari nol.

## Konteks cepat

- React 18 + React Router v6 + TypeScript, Vite 6, Tailwind 3.4.
- Routing: **semua** di `src/main.tsx` — `<Guard>` (butuh token) dan
  `<Need perm="x">` (butuh permission).
- API: **semua** endpoint RTK Query di `src/store/services.ts`; base + auth
  handling di `src/store/baseApi.ts`; tipe response di `src/types.ts`.
  Tiga file ini selalu berubah bersamaan.
- Permission: `src/permissions.ts` (`FEATURE_PERMS`) — **harus sinkron** dengan
  `backend/internal/httpx/middleware.go`.
- i18n: teks baru masuk `src/i18n/id.ts` dan `src/i18n/en.ts`.
- Halaman besar, hati-hati saat edit:
  `MatchMaker.tsx` 2782 · `PeriodDetail.tsx` 1679 · `Reports.tsx` 1570 ·
  `MabarDetail.tsx` 1511 · `NoShowTracker.tsx` 1417 · `Live.tsx` 906.
- Dev: `npm run dev` (proxy `/api` → `:8080`). Build: `npm run build`.
  Lint: `npm run lint`.

## Wajib setelah mengubah kode

Perbarui `../README.md` sesuai tabel **Maintenance Rules** di bagian bawah file
itu. Ringkasnya:

- Tambah/hapus route halaman → §7 Route Map (`main.tsx` + `permissions.ts`)
- Tambah endpoint API → §7 (services.ts + types.ts)
- Permission baru → §5 backend + §7 frontend, keduanya
- Ganti teknologi/library → §1 Layout
- Ubah proxy/deploy → §3 (`vite.config.ts`, `vercel.json`)

Jangan commit kalau README belum sinkron.
