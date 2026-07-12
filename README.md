# Guciku 🏺

Aplikasi keuangan pribadi sederhana — catat pemasukan dan pengeluaran harian, per kategori, dengan tampilan hangat ala krem, terracotta, cokelat muda, dan hijau sage.

## Tahap 1 (selesai)
- Catat pemasukan & pengeluaran harian
- Kategori: Makan, Transport, Belanja, Tagihan, Lainnya
- Ringkasan total masuk, total keluar, dan saldo (divisualisasikan sebagai "guci" yang terisi)
- Riwayat transaksi dikelompokkan per tanggal, bisa difilter dan dihapus
- Data tersimpan otomatis di browser (localStorage)
- Format mata uang Rupiah penuh, mis. `Rp 50.000`

## Tahap 2 (rencana)
- Budget per kategori + peringatan halus saat mendekati/lewat batas

## Tahap 3 (rencana)
- Target nabung + grafik sederhana

## Menjalankan secara lokal
Tidak perlu build tool. Cukup buka `index.html` langsung di browser, atau jalankan server statis:

```bash
npx serve .
```

## Struktur proyek
```
Guciku/
├── index.html   # struktur halaman
├── styles.css   # tema visual (krem, terracotta, cokelat, sage)
├── app.js       # logika: catat, hitung, simpan, render
└── README.md
```
