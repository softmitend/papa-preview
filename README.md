# Portfolio — PAPA & NURTURA

Halaman utama repository ini adalah showcase dua studi kasus:

- **PAPA — Payroll & Rule Management System**, dengan preview frontend interaktif yang aman dibuka publik.
- **NURTURA — Klasifikasi & Pemantauan Stunting**, yang dipertahankan sebagai dokumentasi karena domain website aslinya sudah kedaluwarsa.

Capture kedua proyek disimpan di `images/portfolio/`. Preview PAPA dapat dibuka melalui `papa-preview.html`.

## PAPA — batasan preview

Demo ini menampilkan frontend modul penggajian dan Rule Management System (RMS) dari sistem PAPA yang telah digunakan secara operasional.

Versi portofolio ini sengaja tidak menyertakan backend, database, API produksi, kredensial, maupun data pegawai asli. Seluruh data yang muncul pada halaman interaktif adalah data simulasi. Aksi yang pada sistem asli akan menyimpan atau mengubah data hanya ditampilkan sebagai demonstrasi antarmuka.

## Halaman yang tersedia

- Dashboard HRD
- Panduan RMS
- Katalog Kunci Tarif
- Master Tarif
- Kelola Pajak
- Komponen Gaji
- Repositori Aturan
- Evaluasi Aturan Gaji
- Audit Trail
- Slip Gaji
- Pengaturan Jam Kerja

## Menjalankan secara lokal

```bash
npm install
npm start
```

Buka `http://localhost:4173`.

## Batasan keamanan

- Tidak ada backend atau koneksi database.
- Tidak ada data produksi maupun data pribadi pegawai.
- Tidak ada kredensial, token, atau konfigurasi internal perusahaan.
- Navigasi di luar modul payroll dan RMS dinonaktifkan.
- Semua operasi tulis merupakan simulasi frontend.
