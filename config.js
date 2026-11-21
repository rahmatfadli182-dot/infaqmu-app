// =====================================================================
// KONFIGURASI UTAMA APLIKASI INFAQMU (config.js) — VERSI 3.0 (v.3)
// =====================================================================

const DEFAULT_SUPABASE_URL = "https://pmcqlufrsrfkfblljdzb.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_D0xmTYa3K7pO2d15zsdD_A_Tx-7bh9y";

const STORAGE_KEYS = {
    SB_CONFIG: 'infaqmu_supabase_creds_v5',
    SETTINGS: 'infaqmu_local_settings_v5',
    TRANSACTIONS: 'infaqmu_local_transactions_v5',
    LIKED_IDS: 'infaqmu_local_liked_v5',
    WA_REPORTS: 'infaqmu_wa_reports_v5',
    TAKZIAH: 'infaqmu_takziah_data_v1'
};

const CATEGORIES = {
    news: [
        'Penyaluran Sembako',
        'Santunan Yatim & Dhuafa',
        'Laporan Keuangan Bulanan',
        'Program Kesehatan & Sosial',
        'Kegiatan Dakwah & TPQ',
        'Pengumuman Lembaga'
    ],
    in: [
        'Kaleng Infaqmu',
        'Sisa Saldo Bulan Lalu',
        'Kotak Amal Jumat',
        'Donatur Tetap Bulanan',
        'Transfer Rekening Infaq',
        'Infaq Hamba Allah'
    ],
    out: [
        'Belanja Sembako',
        'Santunan Anak Yatim & Piatu',
        'Bantuan Fakir Miskin & Dhuafa',
        'Bantuan Kesehatan & Pengobatan',
        'Bantuan Tanggap Bencana',
        'Operasional Dakwah & TPQ'
    ]
};

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function getDefaultDummyData() {
    return [
        // --- LEDGER OKTOBER 2026 (SEBAGAI ACUAN AWAL BUKU KAS) ---
        {
            id: 'local-1001',
            tx_date: '2026-10-25',
            type: 'in',
            category: 'Kaleng Infaqmu',
            title: 'Penerimaan Infaq Bulan Oktober 2026',
            description: '- Kaleng Infaqmu = 686.500 + 807.500 + 612.500 = 2.106.500. Sisa saldo bulan September = Rp 12.500,- (Total Penerimaan: Rp 2.119.000,-).',
            amount: 2119000,
            theme: 'emerald',
            aamiin_count: 54
        },
        {
            id: 'local-1002',
            tx_date: '2026-10-28',
            type: 'out',
            category: 'Belanja Sembako',
            title: 'Belanja sembako (Oktober 2026)',
            description: 'Rincian Belanja sembako: - Beras Horas 19 sak x 74.000 = 1.406.000,- - Minyakita 19 bks x 16.500 = 313.500,- - Telur 190 butir x 1.650 = 313.500,- (Total Pengeluaran: Rp 2.033.000,- | Saldo Akhir: Rp 86.000,-).',
            amount: 2033000,
            theme: 'amber',
            aamiin_count: 82
        },

        // --- BERITA UNIK & INSPIRATIF SETIAP BULAN (JANUARI - DESEMBER 2026) ---
        {
            id: 'local-news-2026-01',
            tx_date: '2026-01-27',
            type: 'news',
            category: 'Penyaluran Sembako',
            title: 'Resolusi Awal Tahun: Dapur Ngebul Kembali untuk 18 Keluarga Lansia',
            description: 'Mengawali tahun 2026 dengan semangat berbagi, tim relawan mengetuk pintu rumah para lansia sebatang kara di sudut gang untuk mengantarkan beras pulen, minyak goreng, dan lauk kering. Senyum hangat mereka menjadi doa terbaik bagi para pemilik Kaleng Infaqmu.',
            amount: 0,
            theme: 'emerald',
            aamiin_count: 71
        },
        {
            id: 'local-news-2026-02',
            tx_date: '2026-02-24',
            type: 'news',
            category: 'Program Kesehatan & Sosial',
            title: 'Jemput Sehat Dhuafa: Cek Tensi & Paket Vitamin Door-to-Door',
            description: 'Tak sekadar mengantar logistik pangan, penyaluran bulan Februari dirangkai dengan pemeriksaan tekanan darah, gula darah, serta pembagian madu dan multivitamin gratis bagi warga rentan agar tetap bugar menyambut datangnya bulan suci.',
            amount: 0,
            theme: 'blue',
            aamiin_count: 68
        },
        {
            id: 'local-news-2026-03',
            tx_date: '2026-03-22',
            type: 'news',
            category: 'Penyaluran Sembako',
            title: 'Parsel Cinta Ramadhan & Sahur Hangat untuk Penjaga Malam Kampung',
            description: 'Menjelang puncak Ramadhan, koin-koin receh yang terkumpul dari Kaleng Infaqmu warga menjelma menjadi paket sembako komplit plus kurma dan sirup lebaran untuk keluarga prasejahtera serta para pekerja harian lepas.',
            amount: 0,
            theme: 'amber',
            aamiin_count: 114
        },
        {
            id: 'local-news-2026-04',
            tx_date: '2026-04-25',
            type: 'news',
            category: 'Santunan Yatim & Dhuafa',
            title: 'Tawa Syawal Adik Yatim: Tas Sekolah Baru & Bingkisan Lebaran',
            description: 'Suasana haru penuh syukur menyelimuti balai pertemuan saat adik-adik yatim menerima bingkisan alat tulis dan santunan tunai pasca-Idulfitri. Kebahagiaan mereka adalah bukti nyata bahwa kepedulian warga tidak pernah libur.',
            amount: 0,
            theme: 'purple',
            aamiin_count: 103
        },
        {
            id: 'local-news-2026-05',
            tx_date: '2026-05-26',
            type: 'news',
            category: 'Kegiatan Dakwah & TPQ',
            title: 'Cahaya Iqra di Pelosok: Wakaf Al-Qur’an & Meja Lipat Santri TPQ',
            description: 'Melihat semangat anak-anak mengaji dengan mushaf yang mulai lusuh, dana infaq bulan Mei dialokasikan untuk menghadirkan puluhan Al-Qur’an baru, buku Iqra, dan meja baca kayu agar lantunan ayat suci makin bergema.',
            amount: 0,
            theme: 'emerald',
            aamiin_count: 89
        },
        {
            id: 'local-news-2026-06',
            tx_date: '2026-06-27',
            type: 'news',
            category: 'Penyaluran Sembako',
            title: 'Dapur Gizi Balita & Ibu Menyusui: Gerakan Cegah Stunting Warga',
            description: 'Kolaborasi bersama kader posyandu setempat, tim menyalurkan paket protein tinggi berupa telur ayam kampung, susu, kacang hijau, dan beras sehat bagi balita dari keluarga kurang mampu agar tumbuh cerdas dan kuat.',
            amount: 0,
            theme: 'rose',
            aamiin_count: 92
        },
        {
            id: 'local-news-2026-07',
            tx_date: '2026-07-25',
            type: 'news',
            category: 'Santunan Yatim & Dhuafa',
            title: 'Semangat Tahun Ajaran Baru: Sepatu & Seragam Putih Merah untuk Pejuang Ilmu',
            description: 'Memasuki tahun ajaran baru sekolah, InfaqMU hadir memastikan tidak ada anak dhuafa di lingkungan kita yang minder berangkat ke kelas. Bantuan perlengkapan sekolah disalurkan langsung ke tangan orang tua murid.',
            amount: 0,
            theme: 'blue',
            aamiin_count: 85
        },
        {
            id: 'local-news-2026-08',
            tx_date: '2026-08-23',
            type: 'news',
            category: 'Program Kesehatan & Sosial',
            title: 'Merdeka dari Lapar: Bakti Sosial Kemerdekaan & Borong Dagangan Lansia',
            description: 'Memaknai HUT Kemerdekaan dengan cara unik: tim memborong habis dagangan pedagang kecil lanjut usia lalu membagikannya bersama paket sembako kepada para tukang becak, pemulung, dan marbot masjid.',
            amount: 0,
            theme: 'rose',
            aamiin_count: 119
        },
        {
            id: 'local-news-2026-09',
            tx_date: '2026-09-26',
            type: 'news',
            category: 'Penyaluran Sembako',
            title: 'Jumat Berkah & Lumbung Pangan Tetangga: Dari Receh Menjadi Berkah',
            description: 'Setiap koin seribu dan dua ribu rupiah yang dimasukkan warga ke Kaleng Infaqmu sepanjang September kembali terbukti dahsyat manfaatnya: terwujud puluhan paket kebutuhan pokok siap masak bagi tetangga yang sedang diuji kesulitan ekonomi.',
            amount: 0,
            theme: 'emerald',
            aamiin_count: 77
        },
        {
            id: 'local-1003',
            tx_date: '2026-10-29',
            type: 'news',
            category: 'Penyaluran Sembako',
            title: 'Distribusi 19 Paket Sembako untuk Keluarga Dhuafa',
            description: 'Alhamdulillah, amanah dari kotak Kaleng Infaqmu bulan Oktober 2026 telah disalurkan dalam bentuk 19 paket sembako (Beras Horas, Minyakita, dan Telur) kepada warga yang membutuhkan. Jazakumullahu khairan katsiran kepada seluruh donatur.',
            amount: 0,
            theme: 'emerald',
            aamiin_count: 96
        },
        {
            id: 'local-news-2026-11',
            tx_date: '2026-11-20',
            type: 'news',
            category: 'Program Kesehatan & Sosial',
            title: 'Siaga Musim Hujan: Paket Sembako Hangat & Selimut Tebal untuk Warga Rentan',
            description: 'Curah hujan yang mulai tinggi di bulan November tak menyurutkan langkah relawan mengantar paket sembako, minyak kayu putih, serta perlengkapan hangat bagi keluarga dhuafa di kawasan rawan genangan. Terima kasih para donatur setia!',
            amount: 0,
            theme: 'blue',
            aamiin_count: 64
        },
        {
            id: 'local-news-2026-12',
            tx_date: '2026-12-26',
            type: 'news',
            category: 'Laporan Keuangan Bulanan',
            title: 'Refleksi Akhir Tahun: Ratusan Paket Kebaikan Tersalurkan Sepanjang 2026',
            description: 'Menutup lembaran tahun 2026 dengan penuh rasa syukur, seluruh amanah infaq warga telah dibukukan secara transparan dan disalurkan tepat sasaran hingga pelosok gang. Semoga menjadi pemberat amal kebaikan kita semua di akhirat kelak.',
            amount: 0,
            theme: 'amber',
            aamiin_count: 108
        }
    ];
}

function getDefaultWaReports() {
    return {
        '2026-10': {
            month: '10',
            year: '2026',
            incomes: [
                { name: 'Kaleng Infaqmu', breakdown: '686.500 + 807.500 + 612.500' }
            ],
            prevLabel: 'Sisa saldo bulan September',
            prevAmount: 12500,
            expenseGroupTitle: 'Belanja sembako',
            expenses: [
                { name: 'Beras Horas', qty: 19, unit: 'sak', price: 74000 },
                { name: 'Minyakita', qty: 19, unit: 'bks', price: 16500 },
                { name: 'Telur', qty: 190, unit: 'butir', price: 1650 }
            ]
        }
    };
}
