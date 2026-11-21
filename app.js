// =====================================================================
// LOGIKA UTAMA APLIKASI INFAQMU (app.js) — VERSI 4.0 (CEKPOIN 4)
// =====================================================================
const APP_VERSION = 'v.4';

function getRealtimePeriods() {
    const now = new Date();
    const curYear = String(now.getFullYear());
    const curMonthNum = now.getMonth() + 1; // 1..12
    const curMonth = String(curMonthNum).padStart(2, '0');

    let prevYearNum = now.getFullYear();
    let prevMonthNum = curMonthNum - 1;
    if (prevMonthNum === 0) {
        prevMonthNum = 12;
        prevYearNum -= 1;
    }
    const prevYear = String(prevYearNum);
    const prevMonth = String(prevMonthNum).padStart(2, '0');

    return {
        current: { year: curYear, month: curMonth, key: `${curYear}-${curMonth}` },
        previous: { year: prevYear, month: prevMonth, key: `${prevYear}-${prevMonth}` }
    };
}

let supabaseClient = null;
let isCloudConnected = false;
let sbCredentials = { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY };

let appSettings = {
    orgName: 'InfaqMU Peduli',
    orgHandle: 'prm.bandarmalela',
    orgBio: 'Laporan Transparansi Penerimaan & Penyaluran Infaq Sedekah • Terverifikasi Bendahara',
    viewerPin: '112233',
    adminPin: '999999'
};

let transactions = [];
let waReportsStore = {};
let likedTxIds = new Set();
let currentRole = null;
let selectedGateRole = 'viewer';
let currentMainView = 'feed';
let feedLayoutMode = 'feed';
let monthlyChartInstance = null;
let pendingDeleteId = null;
let isWaFormEditable = false;
let waEditSnapshot = null;
let currentStorySlide = 0;

let waFormState = {
    month: '10',
    year: '2026',
    incomes: [{ name: 'Kaleng Infaqmu', breakdown: '686.500 + 807.500 + 612.500' }],
    prevLabel: 'Sisa saldo bulan September',
    prevAmount: 12500,
    expenseGroupTitle: 'Belanja sembako',
    isDisbursementCompleted: true,
    expenses: [
        { name: 'Beras Horas', qty: 19, unit: 'sak', price: 74000 },
        { name: 'Minyakita', qty: 19, unit: 'bks', price: 16500 },
        { name: 'Telur', qty: 190, unit: 'butir', price: 1650 }
    ]
};

// Helper In-App Dialog (pengganti prompt & confirm)
function showInAppDialog({ title = 'Konfirmasi', message = '', inputDefault = null, confirmText = 'Lanjutkan', cancelText = 'Batal' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('inapp-dialog-modal');
        const titleEl = document.getElementById('inapp-dialog-title');
        const msgEl = document.getElementById('inapp-dialog-message');
        const inputEl = document.getElementById('inapp-dialog-input');
        const okBtn = document.getElementById('inapp-dialog-confirm');
        const cancelBtn = document.getElementById('inapp-dialog-cancel');

        titleEl.textContent = title;
        msgEl.textContent = message;
        okBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        if (inputDefault !== null) {
            inputEl.classList.remove('hidden');
            inputEl.value = inputDefault;
        } else {
            inputEl.classList.add('hidden');
            inputEl.value = '';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (inputDefault !== null) {
            setTimeout(() => inputEl.focus(), 40);
        }

        const cleanup = (result) => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            inputEl.onkeydown = null;
            resolve(result);
        };

        okBtn.onclick = () => {
            cleanup(inputDefault !== null ? inputEl.value : true);
        };
        cancelBtn.onclick = () => {
            cleanup(inputDefault !== null ? null : false);
        };
        inputEl.onkeydown = (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                cleanup(inputEl.value);
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                cleanup(null);
            }
        };
    });
}

// --- INISIALISASI INSTAN ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadLocalFallbackData();
        loadTakziahState();
        ensureTakziahMenuAndViewMounted();
        deduplicateMonthlyLedgerRecords();
        syncWaReportsStoreFromTransactions();
        initSupabaseCredentials();
        setupPinInputListeners();
        setupRealtimeMoneyFormatters();
        setupStickyWaPeriodHeader();
        applySettingsToUI();

        const firstPinBox = document.querySelector('.pin-box');
        if (firstPinBox) firstPinBox.focus();

        setTimeout(() => {
            syncInitialData(false).catch(() => {});
        }, 150);
    } catch (err) {
        console.error('Init error:', err);
    }
});

// --- UTILITAS FORMATTER & PARSER INDONESIA (PEMISAH RIBUAN REAL-TIME) ---
function formatIndoDots(num) {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(Number(num) || 0));
}

function parseIndoNumber(val) {
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9-]/g, '');
    return Number(cleaned) || 0;
}

function formatBreakdownExpression(rawStr) {
    if (!rawStr) return '';
    return String(rawStr).replace(/\d[\d.]*/g, (match) => {
        const digitsOnly = match.replace(/\D/g, '');
        if (!digitsOnly) return '';
        return formatIndoDots(Number(digitsOnly));
    });
}

function formatMoneyInputLive(inputEl) {
    if (!inputEl) return;
    const rawDigits = String(inputEl.value).replace(/\D/g, '');
    if (!rawDigits) {
        inputEl.value = '';
        updateWaLivePreview();
        return;
    }
    const num = Number(rawDigits);
    inputEl.value = formatIndoDots(num);
    updateWaLivePreview();
}

function formatMoneyInputOnBlur(inputEl) {
    const num = parseIndoNumber(inputEl.value);
    inputEl.value = formatIndoDots(num);
    updateWaLivePreview();
}

function setupRealtimeMoneyFormatters() {
    const prevAmountEl = document.getElementById('wa-prev-amount');
    if (prevAmountEl) {
        prevAmountEl.setAttribute('inputmode', 'numeric');
        prevAmountEl.addEventListener('input', function () {
            formatMoneyInputLive(this);
        });
    }

    document.addEventListener('input', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('format-ribuan')) {
            const rawDigits = String(e.target.value).replace(/\D/g, '');
            e.target.value = rawDigits ? formatIndoDots(Number(rawDigits)) : '';
        }
    });
}

// --- STICKY HEADER BULAN & TAHUN PADA HALAMAN REKAP WA ---
function setupStickyWaPeriodHeader() {
    const monthEl = document.getElementById('wa-input-month');
    const yearEl = document.getElementById('wa-input-year');
    if (!monthEl || !yearEl) return;

    const periodGrid = monthEl.closest('.grid') || monthEl.parentElement?.parentElement;
    if (!periodGrid || periodGrid.dataset.stickyApplied === 'true') return;
    periodGrid.dataset.stickyApplied = 'true';

    const mainHeader = document.querySelector('#main-app header');
    const headerHeight = mainHeader ? mainHeader.offsetHeight : 56;

    periodGrid.classList.add(
        'sticky',
        'z-30',
        'bg-white/95',
        'backdrop-blur-md',
        'py-2.5',
        '-mx-3',
        'px-3',
        'border-b',
        'border-slate-200/80',
        'shadow-sm',
        'transition-all'
    );
    periodGrid.style.top = `${headerHeight}px`;

    const waView = document.getElementById('wa-view');
    if (waView) {
        let el = periodGrid.parentElement;
        while (el && el !== waView.parentElement) {
            if (getComputedStyle(el).overflow === 'hidden' || getComputedStyle(el).overflowY === 'hidden') {
                el.style.overflow = 'visible';
            }
            el = el.parentElement;
        }
    }

    window.addEventListener('resize', () => {
        const h = mainHeader ? mainHeader.offsetHeight : 56;
        periodGrid.style.top = `${h}px`;
    });
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(Number(number) || 0));
}

function formatShortRupiah(number) {
    const abs = Math.abs(number);
    const sign = number < 0 ? '-' : '';
    if (abs >= 1000000) {
        const jt = (abs / 1000000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
        return `${sign}Rp${jt}Jt`;
    }
    if (abs >= 1000) {
        return `${sign}Rp${Math.round(abs / 1000)}Rb`;
    }
    return `${sign}Rp${abs}`;
}

function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(d, 10)} ${monthShort[parseInt(m, 10) - 1]} ${y}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- KONEKSI SUPABASE ---
function isJwtFormat(token) {
    return typeof token === 'string' && token.split('.').length === 3 && token.startsWith('eyJ');
}

function initSupabaseCredentials() {
    let savedCreds = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.SB_CONFIG);
        if (raw) savedCreds = JSON.parse(raw);
    } catch (e) {}

    const url = (savedCreds && savedCreds.url) ? savedCreds.url.trim() : DEFAULT_SUPABASE_URL.trim();
    const key = (savedCreds && savedCreds.key) ? savedCreds.key.trim() : DEFAULT_SUPABASE_KEY.trim();
    sbCredentials = { url: url.replace(/\/+$/, ''), key };

    if (sbCredentials.url && sbCredentials.key && window.supabase && isJwtFormat(sbCredentials.key)) {
        try {
            supabaseClient = window.supabase.createClient(sbCredentials.url, sbCredentials.key);
        } catch (e) {
            supabaseClient = null;
        }
    } else {
        supabaseClient = null;
    }
}

async function supabaseRestFetch(path, options = {}) {
    if (!sbCredentials.url || !sbCredentials.key) throw new Error('Kredensial Supabase kosong');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const headers = {
        'apikey': sbCredentials.key,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (isJwtFormat(sbCredentials.key)) {
        headers['Authorization'] = `Bearer ${sbCredentials.key}`;
    }

    try {
        const res = await fetch(`${sbCredentials.url}/rest/v1/${path}`, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText.slice(0, 120)}`);
        }
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

async function syncInitialData(showNotification = false) {
    updateSyncStatusUI('syncing');
    try {
        const settingsRows = await supabaseRestFetch('infaq_settings?id=eq.1&select=*');
        if (Array.isArray(settingsRows) && settingsRows.length > 0) {
            const s = settingsRows[0];
            appSettings = {
                orgName: s.org_name || appSettings.orgName,
                orgHandle: (s.org_handle || appSettings.orgHandle).replace(/^@/, ''),
                orgBio: s.org_bio || appSettings.orgBio,
                viewerPin: String(s.visitor_pin || appSettings.viewerPin),
                adminPin: String(s.admin_pin || appSettings.adminPin)
            };
        }

        const txRows = await supabaseRestFetch('infaq_transactions?select=*&order=tx_date.desc,id.desc');
        if (Array.isArray(txRows) && txRows.length > 0) {
            const cloudMapped = txRows.map(r => ({
                id: r.id,
                type: r.type,
                category: r.category,
                title: r.title,
                description: r.description || '',
                amount: Number(r.amount) || 0,
                tx_date: r.tx_date,
                theme: r.theme || 'emerald',
                aamiin_count: Number(r.aamiin_count) || 0
            }));
            const localOnly = transactions.filter(t => String(t.id).startsWith('local-'));
            transactions = [...cloudMapped, ...localOnly];
            deduplicateMonthlyLedgerRecords();
            ensureAllMonthlyNewsPresent();
            syncWaReportsStoreFromTransactions();
        }

        isCloudConnected = true;
        saveLocalCache();
        applySettingsToUI();
        updateSyncStatusUI('cloud');
        updateDiagnosticBox('Terhubung ke Supabase Cloud.');

        if (currentRole) {
            populateYearFilter();
            refreshDashboard();
        }
        if (showNotification) showToast('Berhasil sinkronisasi dengan Supabase Cloud!', 'success');
        return true;
    } catch (err) {
        isCloudConnected = false;
        updateSyncStatusUI('local');
        updateDiagnosticBox(`Mode Lokal Aktif (${err.name === 'AbortError' ? 'Timeout jaringan' : err.message}).`);
        if (showNotification) showToast('Berjalan dalam Mode Lokal (Cloud tidak terjangkau).', 'info');
        return false;
    }
}

function updateSyncStatusUI(state) {
    const gateBadge = document.getElementById('gate-sync-badge');
    const headerPill = document.getElementById('connection-status-pill');

    if (state === 'syncing') {
        if (gateBadge) gateBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span><span>Menyinkronkan...</span>';
        if (headerPill) headerPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span><span>Sinkron</span>';
    } else if (state === 'cloud') {
        if (gateBadge) gateBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Cloud Terhubung</span>';
        if (headerPill) headerPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Cloud</span>';
    } else {
        if (gateBadge) gateBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Mode Lokal</span>';
        if (headerPill) headerPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>Lokal</span>';
    }
}

function updateDiagnosticBox(msg) {
    const el = document.getElementById('sb-diagnostic-box');
    if (el) el.textContent = msg;
}

// --- PENYIMPANAN LOKAL & DEDUPLIKASI ---
function ensureAllMonthlyNewsPresent() {
    const periods = getRealtimePeriods();
    const defaults = getDefaultDummyData().filter(d => d.type === 'news');
    const existingIds = new Set(transactions.map(t => String(t.id)));
    const existingYearMonths = new Set(
        transactions
            .filter(t => t.type === 'news' && t.tx_date && t.tx_date.length >= 7)
            .map(t => t.tx_date.substring(0, 7))
    );

    let added = false;
    defaults.forEach(item => {
        const ym = item.tx_date.substring(0, 7);
        if (ym >= periods.current.key) return;
        if (!existingIds.has(String(item.id)) && !existingYearMonths.has(ym)) {
            transactions.push(item);
            added = true;
        }
    });
    if (added) saveLocalCache();
}

function loadLocalFallbackData() {
    try {
        const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (s) appSettings = { ...appSettings, ...JSON.parse(s) };

        const t = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        transactions = t ? JSON.parse(t) : getDefaultDummyData();

        const w = localStorage.getItem(STORAGE_KEYS.WA_REPORTS);
        waReportsStore = w ? JSON.parse(w) : getDefaultWaReports();

        const l = localStorage.getItem(STORAGE_KEYS.LIKED_IDS);
        if (l) likedTxIds = new Set(JSON.parse(l));

        ensureAllMonthlyNewsPresent();
    } catch (e) {
        transactions = getDefaultDummyData();
        waReportsStore = getDefaultWaReports();
    }
}

function saveLocalCache() {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appSettings));
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
        localStorage.setItem(STORAGE_KEYS.WA_REPORTS, JSON.stringify(waReportsStore));
    } catch (e) {}
}

function deduplicateMonthlyLedgerRecords() {
    const seenMonthlyKey = new Set();
    const cleaned = [];
    const sorted = [...transactions].sort((a, b) => String(b.id).localeCompare(String(a.id)));

    for (const tx of sorted) {
        if ((tx.type === 'in' || tx.type === 'out') && tx.tx_date) {
            const ym = tx.tx_date.substring(0, 7);
            const titleNorm = (tx.title || '').toLowerCase();
            if (titleNorm.includes('penerimaan infaq bulan') || titleNorm.includes('belanja sembako') || titleNorm.includes('kaleng infaqmu')) {
                const key = `${ym}-${tx.type}`;
                if (seenMonthlyKey.has(key)) continue;
                seenMonthlyKey.add(key);
            }
        }
        cleaned.push(tx);
    }
    transactions = cleaned;
}

function syncWaReportsStoreFromTransactions() {
    const monthsSet = new Set();
    transactions.forEach(t => {
        if ((t.type === 'in' || t.type === 'out') && t.tx_date && t.tx_date.length >= 7) {
            monthsSet.add(t.tx_date.substring(0, 7));
        }
    });

    monthsSet.forEach(ym => {
        if (!waReportsStore[ym]) {
            const [y, m] = ym.split('-');
            const inTx = transactions.find(t => t.type === 'in' && t.tx_date && t.tx_date.startsWith(ym));
            const outTx = transactions.find(t => t.type === 'out' && t.tx_date && t.tx_date.startsWith(ym));
            if (inTx || outTx) {
                const { pureIn, carryOver } = inTx ? extractCarryOverAndPureIncome(inTx) : { pureIn: 0, carryOver: 0 };
                const prevInfo = getPreviousMonthInfo(y, m);
                waReportsStore[ym] = {
                    month: m,
                    year: y,
                    incomes: [{ name: inTx?.category || 'Kaleng Infaqmu', breakdown: formatIndoDots(pureIn) }],
                    prevLabel: `Sisa saldo bulan ${prevInfo.prevMonthName}`,
                    prevAmount: carryOver,
                    expenseGroupTitle: outTx?.category || 'Belanja sembako',
                    expenses: outTx ? [{ name: outTx.title || 'Penyaluran', qty: 1, unit: 'paket', price: Number(outTx.amount) || 0 }] : []
                };
            }
        }
    });
}

// =====================================================================
// PERHITUNGAN SALDO KAS BULAN BERJALAN & AUTO CARRY-OVER REKAP WA
// =====================================================================
function getPreviousMonthInfo(yearStr, monthStr) {
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10);
    if (m === 1) {
        m = 12;
        y -= 1;
    } else {
        m -= 1;
    }
    const prevMonthStr = String(m).padStart(2, '0');
    const prevYearStr = String(y);
    const prevMonthName = MONTH_NAMES[m - 1] || 'Sebelumnya';
    return {
        prevYear: prevYearStr,
        prevMonth: prevMonthStr,
        prevKey: `${prevYearStr}-${prevMonthStr}`,
        prevMonthName
    };
}

function extractCarryOverAndPureIncome(tx) {
    const amount = Number(tx.amount) || 0;
    if (tx.type !== 'in') return { pureIn: 0, carryOver: 0 };

    const desc = tx.description || '';
    const carryMatch = desc.match(/sisa\s+saldo[^=]*=\s*(?:rp\.?\s*)?([0-9.]+)/i);
    if (carryMatch) {
        const carryVal = parseIndoNumber(carryMatch[1]);
        if (carryVal >= 0 && carryVal <= amount) {
            return { pureIn: amount - carryVal, carryOver: carryVal };
        }
    }
    return { pureIn: amount, carryOver: 0 };
}

function computeMonthlyLedgerBreakdown(includeLiveDraft = true) {
    const periodKeys = new Set();

    Object.keys(waReportsStore).forEach(k => {
        if (/^\d{4}-\d{2}$/.test(k)) periodKeys.add(k);
    });
    transactions.forEach(t => {
        if ((t.type === 'in' || t.type === 'out') && t.tx_date && t.tx_date.length >= 7) {
            periodKeys.add(t.tx_date.substring(0, 7));
        }
    });

    const liveDraftKey = (includeLiveDraft && waFormState && waFormState.year && waFormState.month)
        ? `${waFormState.year}-${waFormState.month}`
        : null;
    if (liveDraftKey) {
        periodKeys.add(liveDraftKey);
    }

    const sortedKeys = Array.from(periodKeys).sort();
    const monthlyMap = {};
    let runningBalance = 0;
    let hasInitializedFirstBalance = false;
    let initialSeedCarryOver = 0;
    let totalPureInAll = 0;
    let totalOutAll = 0;

    sortedKeys.forEach(ym => {
        let openingBalance = 0;
        let pureIncome = 0;
        let expense = 0;

        const report = (liveDraftKey === ym) ? waFormState : waReportsStore[ym];
        const monthInTxs = transactions.filter(t => t.type === 'in' && t.tx_date && t.tx_date.startsWith(ym));
        const monthOutTxs = transactions.filter(t => t.type === 'out' && t.tx_date && t.tx_date.startsWith(ym));

        if (report) {
            pureIncome = (report.incomes || []).reduce((acc, item) => {
                return acc + parseSumExpression(item.breakdown).total;
            }, 0);

            expense = (report.expenses || []).reduce((acc, item) => {
                return acc + Math.round((Number(item.qty) || 0) * parseIndoNumber(item.price));
            }, 0);

            if (!hasInitializedFirstBalance) {
                openingBalance = parseIndoNumber(report.prevAmount);
                initialSeedCarryOver = openingBalance;
                hasInitializedFirstBalance = true;
            } else {
                openingBalance = runningBalance;
            }
        } else {
            let explicitCarry = 0;
            monthInTxs.forEach(tx => {
                const parsed = extractCarryOverAndPureIncome(tx);
                pureIncome += parsed.pureIn;
                if (parsed.carryOver > 0) explicitCarry += parsed.carryOver;
            });
            monthOutTxs.forEach(tx => {
                expense += Number(tx.amount) || 0;
            });

            if (!hasInitializedFirstBalance) {
                openingBalance = explicitCarry;
                initialSeedCarryOver = openingBalance;
                hasInitializedFirstBalance = true;
            } else {
                openingBalance = runningBalance;
            }
        }

        const netMonthBalance = pureIncome - expense;
        const totalAvailable = openingBalance + pureIncome;
        const closingBalance = totalAvailable - expense;

        runningBalance = closingBalance;
        totalPureInAll += pureIncome;
        totalOutAll += expense;

        monthlyMap[ym] = {
            ym,
            openingBalance,
            pureIncome,
            totalAvailable,
            expense,
            netMonthBalance,
            closingBalance
        };
    });

    const latestKey = sortedKeys.length > 0 ? sortedKeys[sortedKeys.length - 1] : null;
    const latestMonthSummary = latestKey ? monthlyMap[latestKey] : null;

    return {
        sortedKeys,
        monthlyMap,
        latestKey,
        latestMonthSummary,
        initialCarryOver: initialSeedCarryOver,
        totalPureIn: totalPureInAll,
        totalOut: totalOutAll,
        overallBalance: runningBalance
    };
}

function computeAccurateCashLedger() {
    return computeMonthlyLedgerBreakdown(true);
}

function getEndingBalanceBeforePeriod(yearStr, monthStr) {
    const targetYm = `${yearStr}-${monthStr}`;
    const ledger = computeMonthlyLedgerBreakdown(false);
    const prevInfo = getPreviousMonthInfo(yearStr, monthStr);

    if (ledger.monthlyMap[prevInfo.prevKey]) {
        return ledger.monthlyMap[prevInfo.prevKey].closingBalance;
    }

    const earlierKeys = ledger.sortedKeys.filter(k => k < targetYm);
    if (earlierKeys.length > 0) {
        const lastEarlierKey = earlierKeys[earlierKeys.length - 1];
        return ledger.monthlyMap[lastEarlierKey].closingBalance;
    }

    if (waReportsStore[targetYm]) {
        return parseIndoNumber(waReportsStore[targetYm].prevAmount);
    }
    return 0;
}

function propagateCarryOverToSubsequentMonths(fromYear, fromMonth) {
    const fromKey = `${fromYear}-${fromMonth}`;
    const ledger = computeMonthlyLedgerBreakdown(false);

    ledger.sortedKeys.forEach(ym => {
        if (ym > fromKey && waReportsStore[ym]) {
            const [y, m] = ym.split('-');
            const prevInfo = getPreviousMonthInfo(y, m);
            const prevSummary = ledger.monthlyMap[prevInfo.prevKey];
            if (prevSummary) {
                waReportsStore[ym].prevLabel = `Sisa saldo bulan ${prevInfo.prevMonthName}`;
                waReportsStore[ym].prevAmount = prevSummary.closingBalance;
            }
        }
    });
}

function syncTopKpiCardsRealtime() {
    const selectedMonthEl = document.getElementById('filter-month');
    const selectedYearEl = document.getElementById('filter-year');
    if (!selectedMonthEl || !selectedYearEl) return;

    const selectedMonth = selectedMonthEl.value;
    const selectedYear = selectedYearEl.value;
    const ledger = computeMonthlyLedgerBreakdown(true);

    let displayOpening = 0;
    let displayIn = 0;
    let displayOut = 0;
    let endingCashBalance = 0;

    if (currentMainView === 'wa' && waFormState.year && waFormState.month) {
        const activeYm = `${waFormState.year}-${waFormState.month}`;
        if (ledger.monthlyMap[activeYm]) {
            const mSummary = ledger.monthlyMap[activeYm];
            displayOpening = mSummary.openingBalance;
            displayIn = mSummary.pureIncome;
            displayOut = mSummary.expense;
            endingCashBalance = mSummary.closingBalance;
        }
    } else if (selectedMonth !== 'all') {
        const activeYm = `${selectedYear}-${selectedMonth}`;
        if (ledger.monthlyMap[activeYm]) {
            const mSummary = ledger.monthlyMap[activeYm];
            displayOpening = mSummary.openingBalance;
            displayIn = mSummary.pureIncome;
            displayOut = mSummary.expense;
            endingCashBalance = mSummary.closingBalance;
        } else {
            displayOpening = getEndingBalanceBeforePeriod(selectedYear, selectedMonth);
            endingCashBalance = displayOpening;
        }
    } else {
        const yearKeys = ledger.sortedKeys.filter(k => k.startsWith(`${selectedYear}-`));
        if (yearKeys.length > 0) {
            const firstSummary = ledger.monthlyMap[yearKeys[0]];
            const lastSummary = ledger.monthlyMap[yearKeys[yearKeys.length - 1]];
            displayOpening = firstSummary.openingBalance;
            yearKeys.forEach(k => {
                displayIn += ledger.monthlyMap[k].pureIncome;
                displayOut += ledger.monthlyMap[k].expense;
            });
            endingCashBalance = lastSummary.closingBalance;
        } else {
            displayOpening = getEndingBalanceBeforePeriod(selectedYear, '01');
            endingCashBalance = displayOpening;
        }
    }

    const totalCashAvailable = displayOpening + displayIn;
    const balEl = document.getElementById('profile-stat-balance');
    const outEl = document.getElementById('profile-stat-out');
    const storyBalEl = document.getElementById('story-balance-short');
    const storyInEl = document.getElementById('story-in-short');
    const storyOutEl = document.getElementById('story-out-short');
    const storyRatioEl = document.getElementById('story-ratio-short');

    if (balEl) balEl.textContent = formatShortRupiah(endingCashBalance);
    if (outEl) outEl.textContent = formatShortRupiah(displayOut);
    if (storyBalEl) storyBalEl.textContent = formatShortRupiah(endingCashBalance);
    if (storyInEl) storyInEl.textContent = formatShortRupiah(displayIn);
    if (storyOutEl) storyOutEl.textContent = formatShortRupiah(displayOut);

    const ratio = totalCashAvailable > 0 ? Math.round((displayOut / totalCashAvailable) * 100) : 0;
    if (storyRatioEl) storyRatioEl.textContent = `${ratio}%`;
}

// --- GERBANG PIN 6 DIGIT ---
function applySettingsToUI() {
    const cleanHandle = appSettings.orgHandle.replace(/^@/, '');
    document.getElementById('gate-org-name').textContent = appSettings.orgName;
    document.getElementById('gate-org-handle').textContent = `@${cleanHandle} • Berita & Transparansi`;
    document.getElementById('header-org-name').textContent = appSettings.orgName;
    document.getElementById('header-org-handle').textContent = cleanHandle;
    document.getElementById('header-org-bio').textContent = appSettings.orgBio;
    document.getElementById('hint-viewer-pin').textContent = appSettings.viewerPin;
    document.getElementById('hint-admin-pin').textContent = appSettings.adminPin;
}

function switchGateRole(role) {
    selectedGateRole = role;
    const tabViewer = document.getElementById('tab-role-viewer');
    const tabAdmin = document.getElementById('tab-role-admin');
    const promptLabel = document.getElementById('pin-prompt-label');
    const btnUnlock = document.getElementById('btn-unlock');

    if (role === 'viewer') {
        tabViewer.className = 'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white text-emerald-800 shadow-sm';
        tabAdmin.className = 'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-slate-500 hover:text-slate-900';
        promptLabel.textContent = 'Masukkan Kode PIN 6 Digit dari Admin';
        btnUnlock.className = 'w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-emerald-800 text-white font-bold text-sm shadow-lg transition-all';
        btnUnlock.innerHTML = '<span>Buka Berita & Transparansi</span>';
    } else {
        tabAdmin.className = 'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white text-amber-800 shadow-sm';
        tabViewer.className = 'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-slate-500 hover:text-slate-900';
        promptLabel.textContent = 'Masukkan PIN 6 Digit Khusus Panitia / Admin';
        btnUnlock.className = 'w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm shadow-lg transition-all';
        btnUnlock.innerHTML = '<span>Masuk sebagai Admin</span>';
    }
    clearPinInputs();
}

function pressKeypad(digit) {
    const boxes = document.querySelectorAll('.pin-box');
    document.getElementById('pin-error-msg').classList.add('hidden');
    for (let i = 0; i < boxes.length; i++) {
        if (!boxes[i].value) {
            boxes[i].value = digit;
            if (i < boxes.length - 1) boxes[i + 1].focus();
            else {
                const fullPin = Array.from(boxes).map(b => b.value).join('');
                if (fullPin.length === 6) verifyAndUnlock(fullPin);
            }
            break;
        }
    }
}

function backspaceKeypad() {
    const boxes = document.querySelectorAll('.pin-box');
    for (let i = boxes.length - 1; i >= 0; i--) {
        if (boxes[i].value) {
            boxes[i].value = '';
            boxes[i].focus();
            break;
        }
    }
}

function setupPinInputListeners() {
    const boxes = document.querySelectorAll('.pin-box');
    boxes.forEach((box, idx) => {
        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val;
            if (val && idx < boxes.length - 1) boxes[idx + 1].focus();
            if (idx === boxes.length - 1 && val) {
                const fullPin = Array.from(boxes).map(b => b.value).join('');
                if (fullPin.length === 6) verifyAndUnlock(fullPin);
            }
        });
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) boxes[idx - 1].focus();
        });
    });
}

function clearPinInputs() {
    document.querySelectorAll('.pin-box').forEach(b => b.value = '');
    document.getElementById('pin-error-msg').classList.add('hidden');
}

function togglePinVisibility() {
    const show = document.getElementById('toggle-show-pin').checked;
    document.querySelectorAll('.pin-box').forEach(b => b.type = show ? 'text' : 'password');
}

function autoFillDemoPin(role) {
    switchGateRole(role);
    const pin = role === 'admin' ? appSettings.adminPin : appSettings.viewerPin;
    const boxes = document.querySelectorAll('.pin-box');
    pin.split('').forEach((d, i) => { if (boxes[i]) boxes[i].value = d; });
    verifyAndUnlock(pin);
}

function handlePinSubmit(e) {
    e.preventDefault();
    const enteredPin = Array.from(document.querySelectorAll('.pin-box')).map(b => b.value).join('');
    verifyAndUnlock(enteredPin);
}

function verifyAndUnlock(enteredPin) {
    const errorEl = document.getElementById('pin-error-msg');
    if (enteredPin.length !== 6) {
        errorEl.textContent = 'Harap lengkapi 6 digit angka PIN.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (enteredPin === appSettings.adminPin) {
        grantAccess('admin');
    } else if (enteredPin === appSettings.viewerPin) {
        grantAccess('viewer');
    } else {
        errorEl.textContent = 'Kode PIN 6 digit salah. Silakan coba lagi.';
        errorEl.classList.remove('hidden');
        clearPinInputs();
    }
}

function grantAccess(role) {
    currentRole = role;
    document.getElementById('access-gate').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');

    const isAdmin = role === 'admin';
    document.getElementById('role-badge').textContent = isAdmin ? 'Admin' : 'Publik';
    document.getElementById('role-badge-mobile').textContent = isAdmin ? 'Admin' : 'Publik';
    document.getElementById('btn-open-security').classList.toggle('hidden', !isAdmin);
    document.getElementById('fab-create-post').classList.toggle('hidden', !isAdmin);
    document.getElementById('fab-create-post').classList.toggle('flex', isAdmin);
    document.getElementById('nav-btn-wa').classList.toggle('hidden', !isAdmin);
    document.getElementById('nav-btn-wa').classList.toggle('flex', isAdmin);
    document.getElementById('story-highlight-wa').classList.toggle('hidden', !isAdmin);
    document.getElementById('story-highlight-wa').classList.toggle('flex', isAdmin);

    const btnSecondary = document.getElementById('btn-profile-secondary');
    if (isAdmin) {
        btnSecondary.textContent = 'Rekap Laporan WA';
        btnSecondary.onclick = () => switchMainView('wa');
    } else {
        btnSecondary.textContent = 'Grafik Transparansi';
        btnSecondary.onclick = () => switchMainView('stats');
    }

    const periods = getRealtimePeriods();
    populateYearFilter();
    document.getElementById('filter-year').value = periods.previous.year;
    document.getElementById('filter-month').value = periods.previous.month;

    loadWaReportForPeriod(periods.current.year, periods.current.month, false);

    ensureTakziahMenuAndViewMounted();
    setupStickyWaPeriodHeader();
    switchMainView('feed');
    const prevMonthLabel = MONTH_NAMES[parseInt(periods.previous.month, 10) - 1] || '';
    showToast(
        isAdmin
            ? `Selamat datang, Admin! Beranda menampilkan laporan ${prevMonthLabel} ${periods.previous.year}.`
            : `Selamat datang! Menampilkan laporan bulan ${prevMonthLabel} ${periods.previous.year}.`,
        'success'
    );
}

function lockApplication() {
    currentRole = null;
    clearPinInputs();
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('access-gate').classList.remove('hidden');
}

// --- NAVIGASI & BERANDA ALA INSTAGRAM ---
function populateYearFilter() {
    const select = document.getElementById('filter-year');
    const periods = getRealtimePeriods();
    const years = new Set(['2026', '2025', periods.current.year, periods.previous.year]);
    transactions.forEach(t => { if (t.tx_date) years.add(t.tx_date.substring(0, 4)); });
    const sorted = Array.from(years).sort((a, b) => b - a);
    select.innerHTML = sorted.map(y => `<option value="${y}">${y}</option>`).join('');
}

function toggleSearchBar() {
    const el = document.getElementById('search-bar-wrapper');
    el.classList.toggle('hidden');
    if (!el.classList.contains('hidden')) document.getElementById('search-input').focus();
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-bar-wrapper').classList.add('hidden');
    refreshDashboard();
}

function switchMainView(view) {
    if (view === 'wa' && currentRole !== 'admin') {
        showToast('Menu Rekap WA khusus untuk Panitia / Admin.', 'error');
        return;
    }
    currentMainView = view;

    const activeCls = 'flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 text-emerald-400 font-bold text-xs transition-all';
    const inactiveCls = 'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-400 hover:text-white font-semibold text-xs transition-all';

    ensureTakziahMenuAndViewMounted();
    document.getElementById('nav-btn-feed').className = view === 'feed' ? activeCls : inactiveCls;
    document.getElementById('nav-btn-stats').className = view === 'stats' ? activeCls : inactiveCls;
    const navTakziahEl = document.getElementById('nav-btn-takziah');
    if (navTakziahEl) navTakziahEl.className = view === 'takziah' ? activeCls : inactiveCls;
    if (currentRole === 'admin') {
        document.getElementById('nav-btn-wa').className = view === 'wa' ? activeCls : inactiveCls;
    }

    document.getElementById('feed-mode-tabs').classList.toggle('hidden', view !== 'feed');

    if (view === 'wa') {
        const periods = getRealtimePeriods();
        loadWaReportForPeriod(periods.current.year, periods.current.month, false);
        setTimeout(setupStickyWaPeriodHeader, 50);
    }

    refreshDashboard();
}

function setFeedLayoutMode(mode) {
    feedLayoutMode = mode;
    document.getElementById('tab-subview-feed').className = mode === 'feed'
        ? 'py-2.5 flex items-center justify-center gap-1.5 border-b-2 border-slate-900 text-slate-900 font-bold text-xs'
        : 'py-2.5 flex items-center justify-center gap-1.5 border-b-2 border-transparent text-slate-400 font-semibold text-xs';
    document.getElementById('tab-subview-grid').className = mode === 'grid'
        ? 'py-2.5 flex items-center justify-center gap-1.5 border-b-2 border-slate-900 text-slate-900 font-bold text-xs'
        : 'py-2.5 flex items-center justify-center gap-1.5 border-b-2 border-transparent text-slate-400 font-semibold text-xs';
    refreshDashboard();
}

function refreshDashboard() {
    const selectedMonth = document.getElementById('filter-month').value;
    const selectedYear = document.getElementById('filter-year').value;
    const searchQuery = document.getElementById('search-input').value.trim().toLowerCase();

    const newsPostsAll = transactions.filter(t => t.type === 'news');
    document.getElementById('profile-stat-posts').textContent = newsPostsAll.length;

    syncTopKpiCardsRealtime();

    const ledger = computeMonthlyLedgerBreakdown(true);
    const periodLabel = selectedMonth === 'all'
        ? `Tahun ${selectedYear}`
        : `${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`;
    document.getElementById('active-period-badge').textContent = periodLabel;

    ensureTakziahMenuAndViewMounted();
    document.getElementById('feed-view').classList.add('hidden');
    document.getElementById('grid-view').classList.add('hidden');
    document.getElementById('wa-view').classList.add('hidden');
    document.getElementById('stats-view').classList.add('hidden');
    const takziahViewEl = document.getElementById('takziah-view');
    if (takziahViewEl) takziahViewEl.classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');

    if (currentMainView === 'takziah') {
        if (takziahViewEl) takziahViewEl.classList.remove('hidden');
        renderTakziahView();
        return;
    }

    if (currentMainView === 'wa') {
        document.getElementById('wa-view').classList.remove('hidden');
        renderPublishedMonthsBar();
        updateWaLivePreview();
        return;
    }

    if (currentMainView === 'stats') {
        document.getElementById('stats-view').classList.remove('hidden');
        renderStatsView(selectedYear, selectedMonth, periodLabel, ledger);
        return;
    }

    const filteredNews = newsPostsAll
        .filter(tx => {
            if (!tx.tx_date) return false;
            const matchYear = tx.tx_date.startsWith(selectedYear);
            const matchMonth = selectedMonth === 'all' || tx.tx_date.substring(5, 7) === selectedMonth;
            return matchYear && matchMonth;
        })
        .filter(tx => {
            if (!searchQuery) return true;
            return (tx.title || '').toLowerCase().includes(searchQuery) ||
                   (tx.description || '').toLowerCase().includes(searchQuery) ||
                   (tx.category || '').toLowerCase().includes(searchQuery);
        })
        .sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date));

    if (filteredNews.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }

    if (feedLayoutMode === 'grid') {
        document.getElementById('grid-view').classList.remove('hidden');
        renderInstagramGrid(filteredNews);
    } else {
        document.getElementById('feed-view').classList.remove('hidden');
        renderInstagramFeed(filteredNews);
    }
}

function getThemeGradient(theme) {
    const map = {
        emerald: 'from-emerald-600 via-emerald-700 to-teal-900',
        blue: 'from-blue-600 via-indigo-700 to-slate-900',
        amber: 'from-amber-500 via-orange-600 to-amber-900',
        rose: 'from-rose-600 via-pink-700 to-rose-950',
        purple: 'from-purple-600 via-violet-700 to-indigo-950'
    };
    return map[theme] || map.emerald;
}

let expandedPosterIds = new Set();

function togglePosterExpand(txKey, event) {
    if (event) event.stopPropagation();
    const key = String(txKey);
    if (expandedPosterIds.has(key)) {
        expandedPosterIds.delete(key);
    } else {
        expandedPosterIds.add(key);
    }
    refreshDashboard();
}

function buildWaReportCalculationFromState(reportObj) {
    const monthName = MONTH_NAMES[parseInt(reportObj.month, 10) - 1] || 'Oktober';
    const yearStr = String(reportObj.year || '2026');

    let totalNewIncome = 0;
    const incomeLines = (reportObj.incomes || []).map(item => {
        const { parts, total } = parseSumExpression(item.breakdown);
        totalNewIncome += total;
        if (parts.length > 1) {
            return `- ${item.name} = ${parts.map(p => `Rp. ${formatIndoDots(p)}`).join(' + ')} = Rp. ${formatIndoDots(total)},-`;
        }
        return `- ${item.name} = Rp. ${formatIndoDots(total)},-`;
    });

    const prevAmt = parseIndoNumber(reportObj.prevAmount);
    const totalIncomeAll = totalNewIncome + prevAmt;

    let totalExpenseAll = 0;
    const expenseLines = (reportObj.expenses || []).map(item => {
        const qty = Number(item.qty) || 0;
        const price = parseIndoNumber(item.price);
        const subtotal = Math.round(qty * price);
        totalExpenseAll += subtotal;
        const unitStr = item.unit ? ` ${item.unit}` : '';
        return `- ${item.name} ${qty}${unitStr} x Rp. ${formatIndoDots(price)} = Rp. ${formatIndoDots(subtotal)},-`;
    });

    const endingBalance = totalIncomeAll - totalExpenseAll;

    const waText = [
        "Assalamu'alaikum warohmatullahi wabarokatuh",
        "",
        `*LAPORAN INFAQMU BULAN ${monthName.toUpperCase()} ${yearStr}*`,
        "======================================",
        "#Penerimaan :",
        ...incomeLines,
        `- ${reportObj.prevLabel || 'Sisa saldo bulan sebelumnya'} = Rp. ${formatIndoDots(prevAmt)},-`,
        `Total penerimaan = Rp. ${formatIndoDots(totalIncomeAll)},-`,
        "",
        "#Pengeluaran :",
        `- ${reportObj.expenseGroupTitle || 'Belanja sembako'} :`,
        ...expenseLines,
        `Total pengeluaran = Rp. ${formatIndoDots(totalExpenseAll)},-`,
        "",
        `Saldo Infaqmu bulan ${monthName} = Rp. ${formatIndoDots(totalIncomeAll)} - Rp. ${formatIndoDots(totalExpenseAll)} = Rp. ${formatIndoDots(endingBalance)},-`,
        "",
        "_Wassalamu'alaikum warohmatullahi wabarokatuh._ 🙏"
    ].join('\n');

    return { monthName, yearStr, totalNewIncome, totalIncomeAll, prevAmt, totalExpenseAll, endingBalance, incomeLines, expenseLines, waText };
}

function getWaPreviewTextForPost(tx) {
    const filterMonthEl = document.getElementById('filter-month');
    const filterYearEl = document.getElementById('filter-year');
    const selectedMonth = filterMonthEl ? filterMonthEl.value : 'all';
    const selectedYear = filterYearEl ? filterYearEl.value : '2026';

    let targetYm = '';
    if (selectedMonth && selectedMonth !== 'all') {
        targetYm = `${selectedYear}-${selectedMonth}`;
    } else if (tx && tx.tx_date && tx.tx_date.length >= 7) {
        targetYm = tx.tx_date.substring(0, 7);
    } else {
        targetYm = `${waFormState.year}-${waFormState.month}`;
    }

    const [y, m] = targetYm.split('-');
    const ledger = computeMonthlyLedgerBreakdown(false);
    const prevInfo = getPreviousMonthInfo(y, m);
    const hasEarlierPeriod = ledger.sortedKeys.some(k => k < targetYm);
    const autoCarryBalance = getEndingBalanceBeforePeriod(y, m);

    let reportData = null;
    if (waFormState && `${waFormState.year}-${waFormState.month}` === targetYm) {
        reportData = JSON.parse(JSON.stringify(waFormState));
    } else if (waReportsStore[targetYm]) {
        reportData = JSON.parse(JSON.stringify(waReportsStore[targetYm]));
        if (hasEarlierPeriod) {
            reportData.prevLabel = `Sisa saldo bulan ${prevInfo.prevMonthName}`;
            reportData.prevAmount = autoCarryBalance;
        }
    } else {
        const monthInTxs = transactions.filter(t => t.type === 'in' && t.tx_date && t.tx_date.startsWith(targetYm));
        const monthOutTxs = transactions.filter(t => t.type === 'out' && t.tx_date && t.tx_date.startsWith(targetYm));
        const mSummary = ledger.monthlyMap[targetYm];
        const openingBal = mSummary ? mSummary.openingBalance : autoCarryBalance;

        const incomes = monthInTxs.length > 0
            ? monthInTxs.map(t => {
                const parsed = extractCarryOverAndPureIncome(t);
                return { name: t.category || 'Kaleng Infaqmu', breakdown: formatIndoDots(parsed.pureIn) };
            })
            : [{ name: 'Kaleng Infaqmu', breakdown: '0' }];

        const expenses = monthOutTxs.length > 0
            ? monthOutTxs.map(t => ({
                name: t.title || t.category || 'Penyaluran',
                qty: 1,
                unit: 'paket',
                price: Number(t.amount) || 0
            }))
            : [{ name: 'Belum ada pengeluaran tercatat', qty: 0, unit: '', price: 0 }];

        reportData = {
            month: m,
            year: y,
            incomes,
            prevLabel: `Sisa saldo bulan ${prevInfo.prevMonthName}`,
            prevAmount: openingBal,
            expenseGroupTitle: monthOutTxs[0]?.category || 'Belanja sembako',
            expenses
        };
    }

    return buildWaReportCalculationFromState(reportData).waText;
}

function renderInstagramFeed(list) {
    const container = document.getElementById('feed-view');
    const isAdmin = currentRole === 'admin';
    const handle = appSettings.orgHandle.replace(/^@/, '');

    container.innerHTML = list.map(tx => {
        const txKey = String(tx.id);
        const isLiked = likedTxIds.has(txKey);
        const isExpanded = expandedPosterIds.has(txKey);
        const grad = getThemeGradient(tx.theme);
        const waPreviewText = getWaPreviewTextForPost(tx);

        const adminActions = isAdmin ? `
            <div class="flex items-center gap-1">
                <button type="button" onclick="openNewsModal('${txKey}')" class="px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700">Edit</button>
                <button type="button" onclick="promptDeleteTransaction('${txKey}')" class="px-2 py-1 rounded-lg bg-rose-50 text-[11px] font-bold text-rose-600">Hapus</button>
            </div>
        ` : `<span class="text-[11px] text-slate-400">${formatDateIndo(tx.tx_date)}</span>`;

        const expandedContent = isExpanded ? `
            <div class="mt-4 pt-3.5 border-t border-white/20 space-y-3 animate-fadeIn">
                <div class="rounded-xl bg-black/25 backdrop-blur-sm p-3.5 border border-white/15">
                    <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 mb-2">
                        Rincian Laporan Kas &amp; Penyaluran
                    </div>
                    <pre class="whitespace-pre-wrap font-sans text-[11px] sm:text-xs leading-relaxed text-white/95">${escapeHtml(waPreviewText)}</pre>
                </div>
            </div>
        ` : '';

        return `
            <article class="bg-white py-4 px-4">
                <div class="flex items-center justify-between mb-2.5">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-full story-ring-ig">
                            <div class="w-full h-full rounded-full bg-slate-900 text-emerald-300 font-display font-extrabold text-[10px] flex items-center justify-center border border-white">MU</div>
                        </div>
                        <div>
                            <div class="text-xs font-bold text-slate-900">${escapeHtml(handle)}</div>
                            <div class="text-[11px] text-slate-500">${escapeHtml(tx.category)}</div>
                        </div>
                    </div>
                    ${adminActions}
                </div>

                <div onclick="togglePosterExpand('${txKey}', event)" ondblclick="handleDoubleTapPoster('${txKey}', this)" class="rounded-2xl bg-gradient-to-br ${grad} ${isExpanded ? 'p-6 sm:p-7' : 'p-6'} text-white relative overflow-hidden select-none cursor-pointer shadow-sm transition-all duration-300">
                    <span class="inline-block px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider mb-3">
                        ${escapeHtml(tx.category)}
                    </span>
                    <h3 class="font-display font-extrabold text-lg sm:text-xl leading-snug">
                        ${escapeHtml(tx.title)}
                    </h3>
                    ${expandedContent}
                    <div class="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-white/85">
                        <a href="javascript:void(0)" onclick="togglePosterExpand('${txKey}', event)" class="underline decoration-white/70 hover:text-white font-semibold cursor-pointer">
                            ${isExpanded ? 'tutup..' : 'selengkapnya..'}
                        </a>
                        <span>${formatDateIndo(tx.tx_date)}</span>
                    </div>
                    <div class="double-tap-overlay hidden absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg class="w-20 h-20 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                </div>

                <div class="flex items-center justify-between mt-3 mb-2">
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="toggleAamiin('${txKey}')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${isLiked ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-700'}">
                            ${isLiked ? '♥' : '♡'} Aamiin (${tx.aamiin_count || 0})
                        </button>
                        <button type="button" onclick="sharePostDetail('${txKey}')" class="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                            Bagikan
                        </button>
                    </div>
                    <span class="text-[11px] font-semibold text-emerald-700">#InfaqmuPeduli</span>
                </div>

                <div class="text-xs text-slate-800 leading-relaxed">
                    <span class="font-bold mr-1">${escapeHtml(handle)}</span>
                    <span>${escapeHtml(tx.description)}</span>
                </div>
            </article>
        `;
    }).join('');
}

function renderInstagramGrid(list) {
    const container = document.getElementById('grid-view');
    container.innerHTML = list.map(tx => {
        const grad = getThemeGradient(tx.theme);
        return `
            <button type="button" onclick="setFeedLayoutMode('feed')" class="aspect-square bg-gradient-to-br ${grad} p-2.5 text-left text-white flex flex-col justify-between overflow-hidden relative">
                <span class="text-[9px] font-bold uppercase bg-black/25 px-1.5 py-0.5 rounded w-fit">${escapeHtml(tx.category)}</span>
                <div class="font-display font-bold text-[11px] leading-tight line-clamp-3">${escapeHtml(tx.title)}</div>
            </button>
        `;
    }).join('');
}

function handleDoubleTapPoster(txId, el) {
    const overlay = el.querySelector('.double-tap-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('animate-double-tap-heart');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('animate-double-tap-heart');
        }, 750);
    }
    if (!likedTxIds.has(String(txId))) toggleAamiin(txId);
}

async function toggleAamiin(txId) {
    const idx = transactions.findIndex(t => String(t.id) === String(txId));
    if (idx === -1) return;

    const key = String(txId);
    const liked = likedTxIds.has(key);
    const nextCount = liked ? Math.max(0, (transactions[idx].aamiin_count || 0) - 1) : (transactions[idx].aamiin_count || 0) + 1;

    if (liked) likedTxIds.delete(key);
    else likedTxIds.add(key);

    transactions[idx].aamiin_count = nextCount;
    try { localStorage.setItem(STORAGE_KEYS.LIKED_IDS, JSON.stringify(Array.from(likedTxIds))); } catch (e) {}
    saveLocalCache();
    refreshDashboard();

    if (isCloudConnected && !key.startsWith('local-')) {
        supabaseRestFetch(`infaq_transactions?id=eq.${transactions[idx].id}`, {
            method: 'PATCH',
            body: { aamiin_count: nextCount }
        }).catch(() => {});
    }
}

function sharePostDetail(txId) {
    const tx = transactions.find(t => String(t.id) === String(txId));
    if (!tx) return;
    const text = `*${appSettings.orgName}*\n_${tx.category} (${formatDateIndo(tx.tx_date)})_\n\n*${tx.title}*\n${tx.description}`;
    copyTextFallback(text, 'Berita berhasil disalin untuk dibagikan!');
}

// --- STORY VIEWER INTERAKTIF (MURNI TRANSAKSI BULAN BERJALAN) ---
function openStoryViewer(slideIdx = 0) {
    currentStorySlide = slideIdx;
    document.getElementById('story-viewer-modal').classList.remove('hidden');
    document.getElementById('story-viewer-modal').classList.add('flex');
    renderStorySlide();
}

function closeStoryViewer() {
    document.getElementById('story-viewer-modal').classList.add('hidden');
    document.getElementById('story-viewer-modal').classList.remove('flex');
}

function nextStorySlide() {
    if (currentStorySlide < 3) {
        currentStorySlide++;
        renderStorySlide();
    } else {
        closeStoryViewer();
    }
}

function prevStorySlide() {
    if (currentStorySlide > 0) {
        currentStorySlide--;
        renderStorySlide();
    }
}

function renderStorySlide() {
    for (let i = 0; i < 4; i++) {
        const bar = document.getElementById(`story-prog-${i}`);
        if (bar) bar.style.width = i <= currentStorySlide ? '100%' : '0%';
    }

    const selectedMonth = document.getElementById('filter-month').value;
    const selectedYear = document.getElementById('filter-year').value;
    const ledger = computeMonthlyLedgerBreakdown(true);

    let openingVal = 0;
    let pureInVal = 0;
    let outVal = 0;
    let closingBalVal = 0;
    let periodDesc = `Tahun ${selectedYear}`;

    if (currentMainView === 'wa' && waFormState.year && waFormState.month) {
        const activeYm = `${waFormState.year}-${waFormState.month}`;
        const mName = MONTH_NAMES[parseInt(waFormState.month, 10) - 1] || '';
        periodDesc = `Periode ${mName} ${waFormState.year}`;
        if (ledger.monthlyMap[activeYm]) {
            openingVal = ledger.monthlyMap[activeYm].openingBalance;
            pureInVal = ledger.monthlyMap[activeYm].pureIncome;
            outVal = ledger.monthlyMap[activeYm].expense;
            closingBalVal = ledger.monthlyMap[activeYm].closingBalance;
        }
    } else if (selectedMonth !== 'all') {
        const activeYm = `${selectedYear}-${selectedMonth}`;
        const mName = MONTH_NAMES[parseInt(selectedMonth, 10) - 1] || '';
        periodDesc = `Periode ${mName} ${selectedYear}`;
        if (ledger.monthlyMap[activeYm]) {
            openingVal = ledger.monthlyMap[activeYm].openingBalance;
            pureInVal = ledger.monthlyMap[activeYm].pureIncome;
            outVal = ledger.monthlyMap[activeYm].expense;
            closingBalVal = ledger.monthlyMap[activeYm].closingBalance;
        } else {
            openingVal = getEndingBalanceBeforePeriod(selectedYear, selectedMonth);
            closingBalVal = openingVal;
        }
    } else {
        const yearKeys = ledger.sortedKeys.filter(k => k.startsWith(`${selectedYear}-`));
        if (yearKeys.length > 0) {
            openingVal = ledger.monthlyMap[yearKeys[0]].openingBalance;
            yearKeys.forEach(k => {
                pureInVal += ledger.monthlyMap[k].pureIncome;
                outVal += ledger.monthlyMap[k].expense;
            });
            closingBalVal = ledger.monthlyMap[yearKeys[yearKeys.length - 1]].closingBalance;
        } else {
            openingVal = getEndingBalanceBeforePeriod(selectedYear, '01');
            closingBalVal = openingVal;
        }
    }

    const totalAvailVal = openingVal + pureInVal;
    const titleEl = document.getElementById('story-viewer-title');
    const subEl = document.getElementById('story-viewer-subtitle');
    const bodyEl = document.getElementById('story-viewer-body');

    if (currentStorySlide === 0) {
        titleEl.textContent = 'Posisi Saldo Akhir Kas';
        subEl.textContent = periodDesc;
        bodyEl.innerHTML = `
            <div class="text-center space-y-3">
                <div class="text-xs uppercase tracking-wider text-emerald-300 font-bold">Saldo Akhir Kas (Buku Kas Umum)</div>
                <div class="font-display font-extrabold text-3xl text-white">${formatRupiah(closingBalVal)}</div>
                <div class="p-3.5 rounded-2xl bg-white/10 text-left text-xs space-y-1.5">
                    <div class="flex justify-between"><span>Saldo Awal Periode:</span><span class="font-bold text-slate-200">${formatRupiah(openingVal)}</span></div>
                    <div class="flex justify-between"><span>Penerimaan Kas (+):</span><span class="font-bold text-emerald-300">+ ${formatRupiah(pureInVal)}</span></div>
                    <div class="border-t border-white/10 pt-1 flex justify-between text-slate-200"><span>Total Kas Tersedia:</span><span class="font-bold">${formatRupiah(totalAvailVal)}</span></div>
                    <div class="flex justify-between"><span>Pengeluaran Kas (-):</span><span class="font-bold text-amber-300">- ${formatRupiah(outVal)}</span></div>
                    <div class="border-t border-white/15 pt-1.5 flex justify-between font-bold text-emerald-300"><span>Saldo Akhir Kas:</span><span>${formatRupiah(closingBalVal)}</span></div>
                </div>
            </div>
        `;
    } else if (currentStorySlide === 1) {
        titleEl.textContent = 'Penerimaan Kas';
        subEl.textContent = periodDesc;
        bodyEl.innerHTML = `
            <div class="text-center space-y-3">
                <div class="text-xs uppercase tracking-wider text-sky-300 font-bold">Arus Kas Masuk (Cash Inflow)</div>
                <div class="font-display font-extrabold text-3xl text-white">${formatRupiah(pureInVal)}</div>
                <p class="text-xs text-slate-300 leading-relaxed">Total penerimaan infaq murni pada ${periodDesc} (di luar saldo awal ${formatRupiah(openingVal)}).</p>
            </div>
        `;
    } else if (currentStorySlide === 2) {
        titleEl.textContent = 'Pengeluaran Kas';
        subEl.textContent = periodDesc;
        bodyEl.innerHTML = `
            <div class="text-center space-y-3">
                <div class="text-xs uppercase tracking-wider text-amber-300 font-bold">Arus Kas Keluar (Cash Outflow)</div>
                <div class="font-display font-extrabold text-3xl text-white">${formatRupiah(outVal)}</div>
                <p class="text-xs text-slate-300 leading-relaxed">Total penyaluran belanja sembako dhuafa dan santunan sosial pada ${periodDesc}.</p>
            </div>
        `;
    } else {
        titleEl.textContent = 'Rasio Penyaluran Kas';
        subEl.textContent = periodDesc;
        const pct = totalAvailVal > 0 ? Math.round((outVal / totalAvailVal) * 100) : 0;
        bodyEl.innerHTML = `
            <div class="text-center space-y-3">
                <div class="font-display font-extrabold text-4xl text-emerald-400">${pct}%</div>
                <div class="text-xs font-bold text-white">Tersalurkan dari Total Kas Tersedia</div>
                <p class="text-xs text-slate-300 leading-relaxed">Dari total kas tersedia ${formatRupiah(totalAvailVal)}, tersalurkan ${formatRupiah(outVal)} sehingga saldo akhir kas berlanjut sebesar ${formatRupiah(closingBalVal)}.</p>
            </div>
        `;
    }
}

// --- REKAP WA & FORM INPUT BULANAN (AUTO CARRY-OVER & REALTIME SALDO) ---
function toggleWaFormEditMode(enableEdit) {
    if (currentRole !== 'admin') return;
    isWaFormEditable = enableEdit;

    const box = document.getElementById('wa-admin-editor-box');
    const statusBadge = document.getElementById('wa-lock-status-badge');
    const btnEdit = document.getElementById('btn-toggle-wa-edit');
    const btnCancel = document.getElementById('btn-cancel-wa-edit');
    const btnPublish = document.getElementById('btn-publish-wa-to-feed');

    if (enableEdit) {
        waEditSnapshot = JSON.parse(JSON.stringify(waFormState));
        box.classList.remove('wa-form-locked');
        statusBadge.innerHTML = '<span class="text-amber-700">Mode Edit Aktif</span>';
        btnEdit.classList.add('hidden');
        btnCancel.classList.remove('hidden');
        btnPublish.disabled = false;
    } else {
        box.classList.add('wa-form-locked');
        statusBadge.innerHTML = '<span>Terkunci (Mode Baca)</span>';
        btnEdit.classList.remove('hidden');
        btnCancel.classList.add('hidden');
        btnPublish.disabled = true;
    }

    document.getElementById('btn-add-wa-income').disabled = !enableEdit;
    document.getElementById('btn-add-wa-expense').disabled = !enableEdit;
    document.getElementById('wa-prev-label').disabled = !enableEdit;
    document.getElementById('wa-prev-amount').disabled = !enableEdit;
    document.getElementById('wa-expense-group-title').disabled = !enableEdit;

    renderWaIncomeRows();
    renderWaExpenseRows();
    updateWaLivePreview();
    syncTopKpiCardsRealtime();
}

function cancelWaFormEdit() {
    if (waEditSnapshot) {
        waFormState = JSON.parse(JSON.stringify(waEditSnapshot));
        initWaEditorFromState();
    }
    toggleWaFormEditMode(false);
}

function renderPublishedMonthsBar() {
    const bar = document.getElementById('wa-published-months-bar');
    const keys = Object.keys(waReportsStore).sort().reverse();
    if (keys.length === 0) {
        bar.innerHTML = '';
        return;
    }
    bar.innerHTML = keys.map(k => {
        const [y, m] = k.split('-');
        const label = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
        const active = waFormState.year === y && waFormState.month === m;
        return `
            <button type="button" onclick="selectPublishedMonthPill('${y}', '${m}')" class="px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}">
                ${label}
            </button>
        `;
    }).join('');
}

function selectPublishedMonthPill(year, month) {
    const topMonthEl = document.getElementById('filter-month');
    const topYearEl = document.getElementById('filter-year');
    if (topMonthEl) topMonthEl.value = month;
    if (topYearEl) topYearEl.value = year;

    loadWaReportForPeriod(year, month, true);
    renderPublishedMonthsBar();
    refreshDashboard();
}

function loadWaReportForPeriod(year, month, syncTopFilter = false) {
    const key = `${year}-${month}`;
    const prevInfo = getPreviousMonthInfo(year, month);
    const ledger = computeMonthlyLedgerBreakdown(false);
    const hasEarlierPeriod = ledger.sortedKeys.some(k => k < key);
    const autoCarryBalance = getEndingBalanceBeforePeriod(year, month);

    if (waReportsStore[key]) {
        waFormState = JSON.parse(JSON.stringify(waReportsStore[key]));
        if (typeof waFormState.isDisbursementCompleted !== 'boolean') {
            const existingExp = (waFormState.expenses || []).reduce(
                (sum, item) => sum + Math.round((Number(item.qty) || 0) * parseIndoNumber(item.price)),
                0
            );
            waFormState.isDisbursementCompleted = existingExp > 0;
        }
        if (hasEarlierPeriod) {
            waFormState.prevLabel = `Sisa saldo bulan ${prevInfo.prevMonthName}`;
            waFormState.prevAmount = autoCarryBalance;
        }
    } else {
        waFormState = {
            month,
            year,
            incomes: [{ name: 'Kaleng Infaqmu', breakdown: '0' }],
            prevLabel: `Sisa saldo bulan ${prevInfo.prevMonthName}`,
            prevAmount: autoCarryBalance,
            expenseGroupTitle: 'Belanja sembako',
            isDisbursementCompleted: false,
            expenses: [{ name: 'Beras', qty: 1, unit: 'sak', price: 0 }]
        };
    }

    if (syncTopFilter) {
        const topMonthEl = document.getElementById('filter-month');
        const topYearEl = document.getElementById('filter-year');
        if (topMonthEl && topMonthEl.value !== 'all' && topMonthEl.value !== month) {
            topMonthEl.value = month;
        }
        if (topYearEl && topYearEl.value !== year) {
            topYearEl.value = year;
        }
    }

    initWaEditorFromState();
    toggleWaFormEditMode(false);
}

function onWaPeriodSelectChange() {
    const m = document.getElementById('wa-input-month').value;
    const y = document.getElementById('wa-input-year').value || '2026';

    const topMonthEl = document.getElementById('filter-month');
    const topYearEl = document.getElementById('filter-year');
    if (topMonthEl) topMonthEl.value = m;
    if (topYearEl) topYearEl.value = y;

    loadWaReportForPeriod(y, m, true);
    renderPublishedMonthsBar();
    refreshDashboard();
}

function loadOctoberSampleTemplate() {
    waFormState = getDefaultWaReports()['2026-10'];
    const topMonthEl = document.getElementById('filter-month');
    const topYearEl = document.getElementById('filter-year');
    if (topMonthEl) topMonthEl.value = '10';
    if (topYearEl) topYearEl.value = '2026';

    initWaEditorFromState();
    toggleWaFormEditMode(false);
    refreshDashboard();
    showToast('Contoh laporan Oktober 2026 dimuat.', 'info');
}

function initWaEditorFromState() {
    document.getElementById('wa-input-month').value = waFormState.month;
    document.getElementById('wa-input-year').value = waFormState.year;
    document.getElementById('wa-prev-label').value = waFormState.prevLabel;
    document.getElementById('wa-prev-amount').value = formatIndoDots(waFormState.prevAmount);
    document.getElementById('wa-expense-group-title').value = waFormState.expenseGroupTitle;

    renderWaIncomeRows();
    renderWaExpenseRows();
    updateWaLivePreview();
}

function renderWaIncomeRows() {
    const container = document.getElementById('wa-income-rows-container');
    const disAttr = isWaFormEditable ? '' : 'disabled';

    container.innerHTML = waFormState.incomes.map((item, idx) => {
        const formattedBreakdown = formatBreakdownExpression(item.breakdown);
        const { total } = parseSumExpression(formattedBreakdown);
        return `
            <div class="p-2.5 rounded-xl bg-white border border-emerald-200 space-y-1.5">
                <div class="flex items-center gap-1.5">
                    <input type="text" ${disAttr} value="${escapeHtml(item.name)}" oninput="updateWaIncomeField(${idx}, 'name', this.value)" class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none">
                    ${isWaFormEditable && waFormState.incomes.length > 1 ? `<button type="button" onclick="removeWaIncomeRow(${idx})" class="px-2 py-1 text-xs font-bold text-rose-600">Hapus</button>` : ''}
                </div>
                <input type="text" ${disAttr} inputmode="tel" value="${escapeHtml(formattedBreakdown)}" oninput="handleWaIncomeBreakdownInput(${idx}, this)" placeholder="Contoh: 686.500 + 807.500" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-xs font-bold text-emerald-900 outline-none">
                <div id="wa-inc-subtotal-${idx}" class="text-[10px] font-bold text-emerald-700 text-right">Subtotal Pos: Rp ${formatIndoDots(total)},-</div>
            </div>
        `;
    }).join('');
}

function handleWaIncomeBreakdownInput(idx, inputEl) {
    if (!waFormState.incomes[idx]) return;
    const formatted = formatBreakdownExpression(inputEl.value);
    inputEl.value = formatted;
    waFormState.incomes[idx].breakdown = formatted;

    const { total } = parseSumExpression(formatted);
    const subEl = document.getElementById(`wa-inc-subtotal-${idx}`);
    if (subEl) {
        subEl.textContent = `Subtotal Pos: Rp ${formatIndoDots(total)},-`;
    }
    updateWaLivePreview();
}

function addWaIncomeRow() {
    if (!isWaFormEditable) return;
    waFormState.incomes.push({ name: 'Donatur / Kotak Infaq', breakdown: '0' });
    renderWaIncomeRows();
    updateWaLivePreview();
}

function removeWaIncomeRow(idx) {
    if (!isWaFormEditable) return;
    waFormState.incomes.splice(idx, 1);
    renderWaIncomeRows();
    updateWaLivePreview();
}

function updateWaIncomeField(idx, field, val) {
    if (!waFormState.incomes[idx]) return;
    waFormState.incomes[idx][field] = val;
    updateWaLivePreview();
}

function renderWaExpenseRows() {
    const container = document.getElementById('wa-expense-rows-container');
    const disAttr = isWaFormEditable ? '' : 'disabled';

    container.innerHTML = waFormState.expenses.map((item, idx) => {
        const sub = Math.round((Number(item.qty) || 0) * parseIndoNumber(item.price));
        return `
            <div class="p-2.5 rounded-xl bg-white border border-amber-200 space-y-1.5">
                <div class="flex items-center gap-1.5">
                    <input type="text" ${disAttr} value="${escapeHtml(item.name)}" oninput="updateWaExpenseField(${idx}, 'name', this.value)" placeholder="Nama barang" class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none">
                    ${isWaFormEditable && waFormState.expenses.length > 1 ? `<button type="button" onclick="removeWaExpenseRow(${idx})" class="px-2 py-1 text-xs font-bold text-rose-600">Hapus</button>` : ''}
                </div>
                <div class="grid grid-cols-3 gap-1.5">
                    <input type="number" ${disAttr} value="${item.qty}" oninput="updateWaExpenseField(${idx}, 'qty', this.value)" class="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none">
                    <input type="text" ${disAttr} value="${escapeHtml(item.unit)}" oninput="updateWaExpenseField(${idx}, 'unit', this.value)" class="px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none">
                    <input type="text" ${disAttr} inputmode="numeric" value="${formatIndoDots(item.price)}" oninput="handleWaExpensePriceInput(${idx}, this)" onblur="formatMoneyInputOnBlur(this)" class="px-2 py-1.5 rounded-lg border border-slate-200 font-mono text-xs font-bold text-amber-950 outline-none">
                </div>
                <div id="wa-exp-subtotal-${idx}" class="text-[10px] font-bold text-amber-800 text-right">Subtotal: Rp ${formatIndoDots(sub)},-</div>
            </div>
        `;
    }).join('');

    const checkedAttr = waFormState.isDisbursementCompleted ? 'checked' : '';
    container.innerHTML += `
        <label class="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer select-none">
            <input type="checkbox" id="wa-disbursement-completed" ${disAttr} ${checkedAttr}
                onchange="waFormState.isDisbursementCompleted = this.checked"
                class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
            <span class="text-xs font-semibold text-amber-950">
                Pengeluaran &amp; penyaluran bulan ini sudah selesai (Terbitkan berita otomatis ke Feed)
            </span>
        </label>
    `;
}

function handleWaExpensePriceInput(idx, inputEl) {
    if (!waFormState.expenses[idx]) return;
    const rawDigits = String(inputEl.value).replace(/\D/g, '');
    const numericVal = rawDigits ? Number(rawDigits) : 0;
    inputEl.value = rawDigits ? formatIndoDots(numericVal) : '';

    waFormState.expenses[idx].price = numericVal;
    const item = waFormState.expenses[idx];
    const subEl = document.getElementById(`wa-exp-subtotal-${idx}`);
    if (subEl) {
        const sub = Math.round((Number(item.qty) || 0) * numericVal);
        subEl.textContent = `Subtotal: Rp ${formatIndoDots(sub)},-`;
    }
    updateWaLivePreview();
}

function addWaExpenseRow() {
    if (!isWaFormEditable) return;
    waFormState.expenses.push({ name: 'Barang Baru', qty: 1, unit: 'pcs', price: 0 });
    renderWaExpenseRows();
    updateWaLivePreview();
}

function removeWaExpenseRow(idx) {
    if (!isWaFormEditable) return;
    waFormState.expenses.splice(idx, 1);
    renderWaExpenseRows();
    updateWaLivePreview();
}

function updateWaExpenseField(idx, field, val) {
    if (!waFormState.expenses[idx]) return;
    if (field === 'qty') waFormState.expenses[idx].qty = Number(val) || 0;
    else if (field === 'price') waFormState.expenses[idx].price = parseIndoNumber(val);
    else waFormState.expenses[idx][field] = val;

    const item = waFormState.expenses[idx];
    const subEl = document.getElementById(`wa-exp-subtotal-${idx}`);
    if (subEl) {
        const sub = Math.round((Number(item.qty) || 0) * parseIndoNumber(item.price));
        subEl.textContent = `Subtotal: Rp ${formatIndoDots(sub)},-`;
    }
    updateWaLivePreview();
}

function parseSumExpression(exprStr) {
    if (!exprStr) return { parts: [], total: 0 };
    const parts = String(exprStr)
        .split('+')
        .map(s => parseIndoNumber(s))
        .filter(n => n > 0);
    const total = parts.reduce((acc, n) => acc + n, 0);
    return { parts, total };
}

function buildWaReportCalculationAndText() {
    if (currentRole === 'admin' && isWaFormEditable) {
        waFormState.month = document.getElementById('wa-input-month').value;
        waFormState.year = document.getElementById('wa-input-year').value || '2026';
        waFormState.prevLabel = document.getElementById('wa-prev-label').value.trim() || 'Sisa saldo bulan sebelumnya';
        waFormState.prevAmount = parseIndoNumber(document.getElementById('wa-prev-amount').value);
        waFormState.expenseGroupTitle = document.getElementById('wa-expense-group-title').value.trim() || 'Belanja sembako';
    }

    const monthName = MONTH_NAMES[parseInt(waFormState.month, 10) - 1] || 'Oktober';
    const yearStr = waFormState.year;

    let totalNewIncome = 0;
    const incomeLines = waFormState.incomes.map(item => {
        const { parts, total } = parseSumExpression(item.breakdown);
        totalNewIncome += total;
        if (parts.length > 1) {
            return `- ${item.name} = ${parts.map(p => `Rp. ${formatIndoDots(p)}`).join(' + ')} = Rp. ${formatIndoDots(total)},-`;
        }
        return `- ${item.name} = Rp. ${formatIndoDots(total)},-`;
    });

    const prevAmt = parseIndoNumber(waFormState.prevAmount);
    const totalIncomeAll = totalNewIncome + prevAmt;

    let totalExpenseAll = 0;
    const expenseLines = waFormState.expenses.map(item => {
        const qty = Number(item.qty) || 0;
        const price = parseIndoNumber(item.price);
        const subtotal = Math.round(qty * price);
        totalExpenseAll += subtotal;
        const unitStr = item.unit ? ` ${item.unit}` : '';
        return `- ${item.name} ${qty}${unitStr} x Rp. ${formatIndoDots(price)} = Rp. ${formatIndoDots(subtotal)},-`;
    });

    const endingBalance = totalIncomeAll - totalExpenseAll;

    const waText = [
        "Assalamu'alaikum warohmatullahi wabarokatuh",
        "",
        `*LAPORAN INFAQMU BULAN ${monthName.toUpperCase()} ${yearStr}*`,
        "======================================",
        "#Penerimaan :",
        ...incomeLines,
        `- ${waFormState.prevLabel} = Rp. ${formatIndoDots(prevAmt)},-`,
        `Total penerimaan = Rp. ${formatIndoDots(totalIncomeAll)},-`,
        "",
        "#Pengeluaran :",
        `- ${waFormState.expenseGroupTitle} :`,
        ...expenseLines,
        `Total pengeluaran = Rp. ${formatIndoDots(totalExpenseAll)},-`,
        "",
        `Saldo Infaqmu bulan ${monthName} = Rp. ${formatIndoDots(totalIncomeAll)} - Rp. ${formatIndoDots(totalExpenseAll)} = Rp. ${formatIndoDots(endingBalance)},-`,
        "",
        "_Wassalamu'alaikum warohmatullahi wabarokatuh._ 🙏"
    ].join('\n');

    return { monthName, yearStr, totalNewIncome, totalIncomeAll, prevAmt, totalExpenseAll, endingBalance, incomeLines, expenseLines, waText };
}

function updateWaLivePreview() {
    const calc = buildWaReportCalculationAndText();
    document.getElementById('wa-preview-period-tag').textContent = `${calc.monthName} ${calc.yearStr}`;
    document.getElementById('wa-generated-text').textContent = calc.waText;
    syncTopKpiCardsRealtime();
}

async function saveAndPublishWaReport() {
    if (currentRole !== 'admin') return;
    const calc = buildWaReportCalculationAndText();
    const periodKey = `${waFormState.year}-${waFormState.month}`;

    const checkboxEl = document.getElementById('wa-disbursement-completed');
    const isMarkedDone = checkboxEl ? checkboxEl.checked : Boolean(waFormState.isDisbursementCompleted);
    const hasDisbursement = Number(calc.totalExpenseAll) > 0;
    const shouldPublishNews = hasDisbursement && isMarkedDone;

    waFormState.isDisbursementCompleted = shouldPublishNews;
    waReportsStore[periodKey] = JSON.parse(JSON.stringify(waFormState));

    propagateCarryOverToSubsequentMonths(waFormState.year, waFormState.month);

    const txDateStr = `${waFormState.year}-${waFormState.month}-25`;
    const ymPrefix = `${waFormState.year}-${waFormState.month}`;

    transactions = transactions.filter(t => !(t.tx_date && t.tx_date.startsWith(ymPrefix) && (t.type === 'in' || t.type === 'out')));

    const newRows = [
        {
            id: 'local-in-' + Date.now(),
            type: 'in',
            category: waFormState.incomes[0]?.name || 'Kaleng Infaqmu',
            title: `Penerimaan Infaq Bulan ${calc.monthName} ${calc.yearStr}`,
            description: `${calc.incomeLines.join(' ')} ${waFormState.prevLabel} = Rp ${formatIndoDots(calc.prevAmt)},- (Total Penerimaan: Rp ${formatIndoDots(calc.totalIncomeAll)},-).`,
            amount: calc.totalIncomeAll,
            tx_date: txDateStr,
            theme: 'emerald',
            aamiin_count: 1
        }
    ];

    if (hasDisbursement) {
        newRows.push({
            id: 'local-out-' + (Date.now() + 1),
            type: 'out',
            category: waFormState.expenseGroupTitle || 'Belanja Sembako',
            title: `${waFormState.expenseGroupTitle} (${calc.monthName} ${calc.yearStr})`,
            description: `Rincian ${waFormState.expenseGroupTitle}: ${calc.expenseLines.join(' ')} (Total Pengeluaran: Rp ${formatIndoDots(calc.totalExpenseAll)},- | Saldo Akhir: Rp ${formatIndoDots(calc.endingBalance)},-).`,
            amount: calc.totalExpenseAll,
            tx_date: txDateStr,
            theme: 'amber',
            aamiin_count: 1
        });
    }

    const autoNewsId = `local-news-auto-${ymPrefix}`;
    transactions = transactions.filter(t => String(t.id) !== autoNewsId);

    if (shouldPublishNews) {
        newRows.push({
            id: autoNewsId,
            type: 'news',
            category: 'Penyaluran',
            title: `Laporan & Penyaluran InfaqMU Bulan ${calc.monthName} ${calc.yearStr}`,
            description: `Alhamdulillah, telah terlaksana ${waFormState.expenseGroupTitle} untuk bulan ${calc.monthName} ${calc.yearStr}. Rincian: ${calc.expenseLines.join(' ')} Total tersalurkan Rp ${formatIndoDots(calc.totalExpenseAll)},- dengan saldo akhir kas Rp ${formatIndoDots(calc.endingBalance)},-.`,
            amount: calc.totalExpenseAll,
            tx_date: txDateStr,
            theme: 'emerald',
            aamiin_count: 1
        });
    }

    transactions.push(...newRows);
    saveLocalCache();
    toggleWaFormEditMode(false);
    renderPublishedMonthsBar();
    refreshDashboard();

    const statusMsg = shouldPublishNews
        ? `Laporan & berita ${calc.monthName} ${calc.yearStr} berhasil diterbitkan! Saldo akhir Rp ${formatIndoDots(calc.endingBalance)}.`
        : `Rekap kas ${calc.monthName} ${calc.yearStr} tersimpan. Berita otomatis ditunda karena pengeluaran/penyaluran bulan ini belum selesai.`;

    if (isCloudConnected) {
        try {
            await supabaseRestFetch('infaq_transactions', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: newRows.map(({ id, ...rest }) => rest)
            });
            showToast(statusMsg, shouldPublishNews ? 'success' : 'info');
        } catch (e) {
            showToast('Tersimpan di perangkat (Cloud gagal dijangkau).', 'info');
        }
    } else {
        showToast(statusMsg, shouldPublishNews ? 'success' : 'info');
    }
}

function copyWaReportText() {
    copyTextFallback(document.getElementById('wa-generated-text').textContent, 'Teks laporan WhatsApp berhasil disalin!');
}

function shareDirectToWhatsApp() {
    const text = document.getElementById('wa-generated-text').textContent;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

// --- STATISTIK & GRAFIK ---
function renderStatsView(year, month, periodLabel, ledger) {
    let displayCarry = 0;
    let displayIn = 0;
    let displayOut = 0;
    let displayClosing = 0;

    if (month !== 'all') {
        const activeYm = `${year}-${month}`;
        if (ledger.monthlyMap[activeYm]) {
            const mSum = ledger.monthlyMap[activeYm];
            displayCarry = mSum.openingBalance;
            displayIn = mSum.pureIncome;
            displayOut = mSum.expense;
            displayClosing = mSum.closingBalance;
        } else {
            displayCarry = getEndingBalanceBeforePeriod(year, month);
            displayClosing = displayCarry;
        }
    } else {
        const yearKeys = ledger.sortedKeys.filter(k => k.startsWith(`${year}-`));
        if (yearKeys.length > 0) {
            displayCarry = ledger.monthlyMap[yearKeys[0]].openingBalance;
            yearKeys.forEach(k => {
                displayIn += ledger.monthlyMap[k].pureIncome;
                displayOut += ledger.monthlyMap[k].expense;
            });
            displayClosing = ledger.monthlyMap[yearKeys[yearKeys.length - 1]].closingBalance;
        } else {
            displayCarry = getEndingBalanceBeforePeriod(year, '01');
            displayClosing = displayCarry;
        }
    }

    const totalAvail = displayCarry + displayIn;
    document.getElementById('stats-card-in').textContent = formatRupiah(displayIn);
    document.getElementById('stats-sub-in').textContent = `Saldo Awal: ${formatRupiah(displayCarry)} | Total Tersedia: ${formatRupiah(totalAvail)}`;
    document.getElementById('stats-card-out').textContent = formatRupiah(displayOut);
    document.getElementById('stats-sub-out').textContent = `Saldo Akhir Kas: ${formatRupiah(displayClosing)}`;
    document.getElementById('chart-year-label').textContent = year;
    document.getElementById('category-period-subtitle').textContent = `Periode ${periodLabel}`;

    const ratio = totalAvail > 0 ? Math.round((displayOut / totalAvail) * 100) : 0;
    document.getElementById('disbursement-ratio').textContent = `${ratio}% Tersalurkan`;

    const inData = Array(12).fill(0);
    const outData = Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
        const mStr = String(i + 1).padStart(2, '0');
        const mSum = ledger.monthlyMap[`${year}-${mStr}`];
        if (mSum) {
            inData[i] = mSum.pureIncome;
            outData[i] = mSum.expense;
        }
    }

    const canvas = document.getElementById('monthlyChart');
    const fallbackBox = document.getElementById('fallback-bar-chart');

    if (window.Chart && canvas) {
        canvas.classList.remove('hidden');
        fallbackBox.classList.add('hidden');
        if (monthlyChartInstance) monthlyChartInstance.destroy();
        monthlyChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [
                    { label: 'Masuk', data: inData, backgroundColor: '#10b981', borderRadius: 4 },
                    { label: 'Salur', data: outData, backgroundColor: '#f59e0b', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } else if (fallbackBox) {
        canvas.classList.add('hidden');
        fallbackBox.classList.remove('hidden');
        const maxVal = Math.max(1, ...inData, ...outData);
        fallbackBox.innerHTML = inData.map((v, i) => {
            const hIn = Math.round((v / maxVal) * 100);
            const hOut = Math.round((outData[i] / maxVal) * 100);
            return `
                <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div class="w-full flex items-end gap-0.5 h-32">
                        <div class="flex-1 bg-emerald-500 rounded-t" style="height:${hIn}%"></div>
                        <div class="flex-1 bg-amber-500 rounded-t" style="height:${hOut}%"></div>
                    </div>
                    <span class="text-[9px] text-slate-500">${i + 1}</span>
                </div>
            `;
        }).join('');
    }

    const outMap = {};
    const filteredOuts = transactions.filter(t => {
        if (t.type !== 'out' || !t.tx_date) return false;
        if (month === 'all') return t.tx_date.startsWith(year);
        return t.tx_date.startsWith(`${year}-${month}`);
    });
    filteredOuts.forEach(t => {
        outMap[t.category] = (outMap[t.category] || 0) + (Number(t.amount) || 0);
    });

    const listBox = document.getElementById('category-breakdown-list');
    const entries = Object.entries(outMap).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
        listBox.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">Belum ada data penyaluran pada periode ini.</div>';
    } else {
        listBox.innerHTML = entries.map(([cat, amt]) => {
            const pct = displayOut > 0 ? Math.round((amt / displayOut) * 100) : 0;
            return `
                <div>
                    <div class="flex justify-between text-xs mb-1">
                        <span class="font-bold text-slate-700">${escapeHtml(cat)}</span>
                        <span class="font-bold">${formatRupiah(amt)} (${pct}%)</span>
                    </div>
                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-600 rounded-full" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// --- MODAL BERITA (ADMIN) ---
function openNewsModal(editId = null) {
    if (currentRole !== 'admin') return;
    const catSelect = document.getElementById('news-category');
    catSelect.innerHTML = CATEGORIES.news.map(c => `<option value="${c}">${c}</option>`).join('');

    if (editId) {
        const tx = transactions.find(t => String(t.id) === String(editId));
        if (!tx) return;
        document.getElementById('modal-news-title').textContent = 'Edit Berita Kegiatan';
        document.getElementById('news-id').value = tx.id;
        document.getElementById('news-title').value = tx.title;
        document.getElementById('news-description').value = tx.description;
        document.getElementById('news-date').value = tx.tx_date;
        document.getElementById('news-category').value = tx.category;
        document.getElementById('news-theme').value = tx.theme || 'emerald';
    } else {
        document.getElementById('modal-news-title').textContent = 'Posting Berita Baru';
        document.getElementById('news-id').value = '';
        document.getElementById('news-form').reset();
        document.getElementById('news-date').value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('news-modal').classList.remove('hidden');
    document.getElementById('news-modal').classList.add('flex');
}

function closeNewsModal() {
    document.getElementById('news-modal').classList.add('hidden');
    document.getElementById('news-modal').classList.remove('flex');
}

async function handleSaveNews(e) {
    e.preventDefault();
    if (currentRole !== 'admin') return;

    const id = document.getElementById('news-id').value;
    const payload = {
        type: 'news',
        title: document.getElementById('news-title').value.trim(),
        description: document.getElementById('news-description').value.trim(),
        tx_date: document.getElementById('news-date').value,
        category: document.getElementById('news-category').value,
        theme: document.getElementById('news-theme').value,
        amount: 0
    };

    if (id) {
        const idx = transactions.findIndex(t => String(t.id) === String(id));
        if (idx !== -1) transactions[idx] = { ...transactions[idx], ...payload };
    } else {
        transactions.unshift({ id: 'local-news-' + Date.now(), ...payload, aamiin_count: 1 });
        if (isCloudConnected) {
            supabaseRestFetch('infaq_transactions', {
                method: 'POST',
                body: [{ ...payload, aamiin_count: 1 }]
            }).catch(() => {});
        }
    }

    saveLocalCache();
    closeNewsModal();
    refreshDashboard();
    showToast('Berita kegiatan berhasil diterbitkan!', 'success');
}

function promptDeleteTransaction(id) {
    if (currentRole !== 'admin') return;
    pendingDeleteId = id;
    document.getElementById('delete-modal').classList.remove('hidden');
    document.getElementById('delete-modal').classList.add('flex');

    document.getElementById('confirm-delete-btn').onclick = () => {
        const target = String(pendingDeleteId);
        transactions = transactions.filter(t => String(t.id) !== target);
        saveLocalCache();
        closeDeleteModal();
        refreshDashboard();
        if (isCloudConnected && !target.startsWith('local-')) {
            supabaseRestFetch(`infaq_transactions?id=eq.${target}`, { method: 'DELETE' }).catch(() => {});
        }
        showToast('Postingan berhasil dihapus.', 'info');
    };
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
    document.getElementById('delete-modal').classList.remove('flex');
}

// --- PENGATURAN ADMIN, SUPABASE & AUDIT SALDO ---
function openSecurityModal() {
    if (currentRole !== 'admin') return;
    document.getElementById('set-sb-url').value = sbCredentials.url;
    document.getElementById('set-sb-key').value = sbCredentials.key;
    document.getElementById('set-org-name').value = appSettings.orgName;
    document.getElementById('set-org-handle').value = appSettings.orgHandle;
    document.getElementById('set-org-bio').value = appSettings.orgBio;
    document.getElementById('set-viewer-pin').value = appSettings.viewerPin;
    document.getElementById('set-admin-pin').value = appSettings.adminPin;

    document.getElementById('security-modal').classList.remove('hidden');
    document.getElementById('security-modal').classList.add('flex');
}

function closeSecurityModal() {
    document.getElementById('security-modal').classList.add('hidden');
    document.getElementById('security-modal').classList.remove('flex');
}

async function testAndSyncSupabase() {
    sbCredentials = {
        url: document.getElementById('set-sb-url').value.trim().replace(/\/+$/, ''),
        key: document.getElementById('set-sb-key').value.trim()
    };
    localStorage.setItem(STORAGE_KEYS.SB_CONFIG, JSON.stringify(sbCredentials));
    initSupabaseCredentials();
    await syncInitialData(true);
}

async function pushLocalDataToCloud() {
    const localRows = transactions.filter(t => String(t.id).startsWith('local-'));
    if (localRows.length === 0) {
        showToast('Semua data sudah tersinkron di Cloud.', 'info');
        return;
    }
    try {
        await supabaseRestFetch('infaq_transactions', {
            method: 'POST',
            body: localRows.map(({ id, ...rest }) => rest)
        });
        showToast(`${localRows.length} data lokal berhasil diunggah ke Supabase!`, 'success');
        await syncInitialData(false);
    } catch (err) {
        showToast('Gagal mengunggah ke Supabase: ' + err.message, 'error');
    }
}

function runFullBalanceAudit() {
    deduplicateMonthlyLedgerRecords();
    syncWaReportsStoreFromTransactions();
    const ledger = computeMonthlyLedgerBreakdown(false);
    if (ledger.sortedKeys.length > 0) {
        const [firstY, firstM] = ledger.sortedKeys[0].split('-');
        propagateCarryOverToSubsequentMonths(firstY, firstM);
    }
    saveLocalCache();
    refreshDashboard();
    showToast(`Audit selesai! Saldo Akhir Kas Akurat: ${formatRupiah(ledger.overallBalance)}`, 'success');
}

async function handleSaveSecuritySettings(e) {
    e.preventDefault();
    const newViewerPin = document.getElementById('set-viewer-pin').value.trim();
    const newAdminPin = document.getElementById('set-admin-pin').value.trim();

    if (!/^\d{6}$/.test(newViewerPin) || !/^\d{6}$/.test(newAdminPin)) {
        showToast('PIN wajib 6 digit angka!', 'error');
        return;
    }

    sbCredentials = {
        url: document.getElementById('set-sb-url').value.trim().replace(/\/+$/, ''),
        key: document.getElementById('set-sb-key').value.trim()
    };
    localStorage.setItem(STORAGE_KEYS.SB_CONFIG, JSON.stringify(sbCredentials));

    appSettings = {
        orgName: document.getElementById('set-org-name').value.trim(),
        orgHandle: document.getElementById('set-org-handle').value.trim().replace(/^@/, ''),
        orgBio: document.getElementById('set-org-bio').value.trim(),
        viewerPin: newViewerPin,
        adminPin: newAdminPin
    };

    saveLocalCache();
    applySettingsToUI();
    closeSecurityModal();
    showToast('Pengaturan berhasil disimpan!', 'success');
}

function resetDemoData() {
    transactions = getDefaultDummyData();
    waReportsStore = getDefaultWaReports();
    saveLocalCache();
    closeSecurityModal();
    refreshDashboard();
    showToast('Data contoh dipulihkan.', 'info');
}

async function handleManualRefresh() {
    await syncInitialData(true);
}

function exportToCSV() {
    const rows = [['Tanggal', 'Jenis', 'Kategori', 'Judul', 'Nominal']];
    transactions.forEach(t => {
        rows.push([t.tx_date, t.type, `"${t.category}"`, `"${t.title}"`, t.amount || 0]);
    });
    const blob = new Blob(['\uFEFF' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Laporan_INFAQMU.csv';
    a.click();
}

function copyTextFallback(text, successMsg) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
        document.execCommand('copy');
        showToast(successMsg, 'success');
    } catch (e) {
        showToast('Gagal menyalin teks.', 'error');
    }
    document.body.removeChild(el);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bg = type === 'error' ? 'bg-rose-900 border-rose-500/40' : 'bg-slate-900 border-emerald-500/40';
    toast.className = `${bg} text-white px-4 py-2.5 rounded-full shadow-xl border text-xs font-semibold text-center transition-opacity duration-300`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// =====================================================================
// MODUL MANAJEMEN IURAN TAKZIAH (DINAMIS & INTERAKTIF + TOP SCROLL + BAYAR KELIPATAN)
// =====================================================================
let takziahState = {
    nominalPerMusibah: 10000,
    events: [
        { id: 'ev-1', label: 'Iuran Musibah #1', date: 'Musibah #1', note: '' },
        { id: 'ev-2', label: 'Iuran Musibah #2', date: 'Musibah #2', note: '' },
        { id: 'ev-3', label: 'Iuran Musibah #3', date: 'Musibah #3', note: '' },
        { id: 'ev-4', label: 'Iuran Musibah #4', date: 'Musibah #4', note: '' },
        { id: 'ev-5', label: 'Iuran Musibah #5', date: 'Musibah #5', note: '' },
        { id: 'ev-6', label: 'Iuran Musibah #6', date: 'Musibah #6', note: '' },
        { id: 'ev-7', label: 'Iuran Musibah #7', date: 'Musibah #7', note: '' },
        { id: 'ev-8', label: 'Iuran Musibah #8', date: 'Musibah #8', note: '' },
        { id: 'ev-9', label: 'Iuran Musibah #9', date: 'Musibah #9', note: '' },
        { id: 'ev-10', label: 'Iuran Musibah #10', date: 'Musibah #10', note: '' },
        { id: 'ev-11', label: 'Iuran Musibah #11', date: 'Musibah #11', note: '' },
        { id: 'ev-12', label: 'Iuran Musibah #12', date: 'Musibah #12', note: '' },
        { id: 'ev-13', label: 'Iuran Musibah #13', date: 'Musibah #13', note: '' },
        { id: 'ev-14', label: 'Iuran Musibah #14', date: 'Musibah #14', note: '' },
        { id: 'ev-15', label: 'Iuran Musibah #15', date: 'Musibah #15', note: '' },
        { id: 'ev-16', label: 'Iuran Musibah #16', date: 'Musibah #16', note: '' },
        { id: 'ev-17', label: 'Iuran Musibah #17', date: 'Musibah #17', note: '' }
    ],
    members: [
        { id: 'm-1', name: 'Abdul Azis D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-2', name: 'Abdul Hamid S.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-3', name: 'Adi Kusdi', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-4', name: 'Al-Azhar D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 10000, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-5', name: 'Amran D.', payments: { 'ev-1': 0, 'ev-2': 0, 'ev-3': 0, 'ev-4': 0, 'ev-5': 0, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-6', name: 'Budi Setiawan', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-7', name: 'Dodi Suhendra S.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 0, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-8', name: 'Dzulkarnain D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 10000, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-9', name: 'Dzulkifli D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-10', name: 'Fatwa Fayandi K.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-11', name: 'Julianto D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-12', name: 'Junaidi D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-13', name: 'Kaliaman D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-14', name: 'Kardi', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-15', name: 'Khairul A.F.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 10000, 'ev-13': 10000, 'ev-14': 10000, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-16', name: 'Kamal D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-17', name: 'Rahmat Fadli', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-18', name: 'Rindu Syahhada H.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-19', name: 'Sahriudin S.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-20', name: 'Sudianto', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-21', name: 'Suhendy', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 10000, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-22', name: 'Tunut', payments: { 'ev-1': 0, 'ev-2': 0, 'ev-3': 0, 'ev-4': 0, 'ev-5': 0, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-23', name: 'Yahman S.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-24', name: 'Yogi Wardana D.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 10000, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-25', name: 'Edi Kurniawan S.', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-26', name: 'Masta D', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-27', name: 'Kamsino', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 10000, 'ev-7': 10000, 'ev-8': 10000, 'ev-9': 10000, 'ev-10': 10000, 'ev-11': 10000, 'ev-12': 10000, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } },
        { id: 'm-28', name: 'Taufik Simangunsong', payments: { 'ev-1': 10000, 'ev-2': 10000, 'ev-3': 10000, 'ev-4': 10000, 'ev-5': 10000, 'ev-6': 0, 'ev-7': 0, 'ev-8': 0, 'ev-9': 0, 'ev-10': 0, 'ev-11': 0, 'ev-12': 0, 'ev-13': 0, 'ev-14': 0, 'ev-15': 0, 'ev-16': 0, 'ev-17': 0 } }
    ]
};

function loadTakziahState() {
    try {
        const key = (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.TAKZIAH) ? STORAGE_KEYS.TAKZIAH : 'infaqmu_takziah_data_v3';
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.events) && Array.isArray(parsed.members)) {
                takziahState = parsed;
            }
        }
    } catch (e) {}
}

function saveTakziahState() {
    try {
        const key = (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.TAKZIAH) ? STORAGE_KEYS.TAKZIAH : 'infaqmu_takziah_data_v3';
        localStorage.setItem(key, JSON.stringify(takziahState));
    } catch (e) {}
}

function ensureTakziahMenuAndViewMounted() {
    const navStatsBtn = document.getElementById('nav-btn-stats');
    if (navStatsBtn && !document.getElementById('nav-btn-takziah')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'nav-btn-takziah';
        btn.onclick = () => switchMainView('takziah');
        btn.className = 'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-400 hover:text-white font-semibold text-xs transition-all';
        btn.innerHTML = `
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Iuran Takziah</span>
        `;
        navStatsBtn.parentNode.insertBefore(btn, navStatsBtn.nextSibling);
    }

    const storyWaBtn = document.getElementById('story-highlight-wa');
    if (storyWaBtn && !document.getElementById('story-highlight-takziah')) {
        const storyBtn = document.createElement('button');
        storyBtn.type = 'button';
        storyBtn.id = 'story-highlight-takziah';
        storyBtn.onclick = () => switchMainView('takziah');
        storyBtn.className = 'flex flex-col items-center gap-1 shrink-0 group';
        storyBtn.innerHTML = `
            <div class="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-sky-500 to-indigo-600">
                <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-indigo-700 font-extrabold text-xs">
                    TZ
                </div>
            </div>
            <span class="text-[11px] font-medium text-slate-700 truncate max-w-[72px] text-center">Iuran Takziah</span>
        `;
        storyWaBtn.parentNode.insertBefore(storyBtn, storyWaBtn.nextSibling);
    }

    const statsView = document.getElementById('stats-view');
    if (statsView && !document.getElementById('takziah-view')) {
        const takziahDiv = document.createElement('section');
        takziahDiv.id = 'takziah-view';
        takziahDiv.className = 'hidden px-3 py-4 space-y-4 pb-24';
        statsView.parentNode.insertBefore(takziahDiv, statsView.nextSibling);
    }
}

function formatRupiahCompactNoSpace(num) {
    const val = Math.round(Number(num) || 0);
    return `Rp${formatIndoDots(val)}`;
}

function getTakziahKeteranganAndCount(tunggakan, nominal) {
    if (tunggakan <= 0) {
        return { text: 'Lunas', isLunas: true, kurangKali: 0 };
    }
    const unit = nominal > 0 ? nominal : 10000;
    const kali = Math.ceil(tunggakan / unit);
    return { text: `Kurang ${kali}x`, isLunas: false, kurangKali: kali };
}

function setupTakziahDualHorizontalScroll() {
    const topBar = document.getElementById('takziah-top-scroll-bar');
    const topInner = document.getElementById('takziah-top-scroll-inner');
    const bottomWrap = document.getElementById('takziah-bottom-table-scroll');
    const tableEl = document.getElementById('takziah-main-table');

    if (!topBar || !topInner || !bottomWrap || !tableEl) return;

    const syncWidth = () => {
        topInner.style.width = `${tableEl.scrollWidth}px`;
    };
    syncWidth();

    let isSyncingFromTop = false;
    let isSyncingFromBottom = false;

    topBar.onscroll = () => {
        if (isSyncingFromTop) return;
        isSyncingFromBottom = true;
        bottomWrap.scrollLeft = topBar.scrollLeft;
        requestAnimationFrame(() => { isSyncingFromBottom = false; });
    };

    bottomWrap.onscroll = () => {
        if (isSyncingFromBottom) return;
        isSyncingFromTop = true;
        topBar.scrollLeft = bottomWrap.scrollLeft;
        requestAnimationFrame(() => { isSyncingFromTop = false; });
    };

    window.addEventListener('resize', syncWidth);
}

function scrollTakziahHorizontalBy(deltaX) {
    const bottomWrap = document.getElementById('takziah-bottom-table-scroll');
    const topBar = document.getElementById('takziah-top-scroll-bar');
    if (bottomWrap) {
        bottomWrap.scrollBy({ left: deltaX, behavior: 'smooth' });
    } else if (topBar) {
        topBar.scrollBy({ left: deltaX, behavior: 'smooth' });
    }
}

function handleTakziahBatchPayment(e) {
    e.preventDefault();
    if (currentRole !== 'admin') return;

    const memberSelect = document.getElementById('takziah-pay-member-id');
    const amountInput = document.getElementById('takziah-pay-amount');
    if (!memberSelect || !amountInput) return;

    const memberId = memberSelect.value;
    const rawAmount = parseIndoNumber(amountInput.value);
    const nominal = Number(takziahState.nominalPerMusibah) || 10000;

    if (!memberId) {
        showToast('Silakan pilih nama anggota terlebih dahulu.', 'error');
        return;
    }
    if (rawAmount <= 0 || rawAmount % nominal !== 0) {
        showToast(`Nominal pembayaran harus kelipatan ${formatRupiahCompactNoSpace(nominal)}!`, 'error');
        return;
    }

    const member = takziahState.members.find(m => m.id === memberId);
    if (!member) return;
    if (!member.payments) member.payments = {};

    const slotsNeeded = Math.floor(rawAmount / nominal);
    const unpaidEvents = (takziahState.events || []).filter(ev => Number(member.payments[ev.id] || 0) < nominal);

    if (unpaidEvents.length === 0) {
        showToast(`${member.name} sudah melunasi seluruh ${takziahState.events.length} iuran musibah!`, 'info');
        return;
    }

    if (slotsNeeded > unpaidEvents.length) {
        const maxAllowed = unpaidEvents.length * nominal;
        showToast(`Sisa tunggakan ${member.name} hanya ${unpaidEvents.length}x (${formatRupiahCompactNoSpace(maxAllowed)}). Masukkan maksimal ${formatRupiahCompactNoSpace(maxAllowed)}.`, 'error');
        return;
    }

    for (let i = 0; i < slotsNeeded; i++) {
        const targetEv = unpaidEvents[i];
        member.payments[targetEv.id] = nominal;
    }

    const prevScrollLeft = document.getElementById('takziah-bottom-table-scroll')?.scrollLeft || 0;
    saveTakziahState();
    renderTakziahView();

    const newBottomWrap = document.getElementById('takziah-bottom-table-scroll');
    const newTopBar = document.getElementById('takziah-top-scroll-bar');
    if (newBottomWrap) newBottomWrap.scrollLeft = prevScrollLeft;
    if (newTopBar) newTopBar.scrollLeft = prevScrollLeft;
    const newSelect = document.getElementById('takziah-pay-member-id');
    if (newSelect) newSelect.value = memberId;

    showToast(`Berhasil mencatat pembayaran ${formatRupiahCompactNoSpace(rawAmount)} (${slotsNeeded}x musibah) untuk ${member.name}!`, 'success');
}

function renderTakziahView() {
    ensureTakziahMenuAndViewMounted();
    const container = document.getElementById('takziah-view');
    if (!container) return;

    const isAdmin = currentRole === 'admin';
    const nominal = Number(takziahState.nominalPerMusibah) || 10000;
    const events = takziahState.events || [];
    const members = takziahState.members || [];
    const totalWajibPerAnggota = events.length * nominal;

    const eventTotals = {};
    events.forEach(ev => { eventTotals[ev.id] = 0; });

    let grandTotalBayar = 0;
    let grandTotalTunggakan = 0;

    const computedRows = members.map((m, idx) => {
        let rowBayar = 0;
        events.forEach(ev => {
            const paid = Number((m.payments && m.payments[ev.id]) || 0);
            rowBayar += paid;
            eventTotals[ev.id] = (eventTotals[ev.id] || 0) + paid;
        });
        const rowTunggakan = Math.max(0, totalWajibPerAnggota - rowBayar);
        const ket = getTakziahKeteranganAndCount(rowTunggakan, nominal);

        grandTotalBayar += rowBayar;
        grandTotalTunggakan += rowTunggakan;

        return {
            index: idx + 1,
            member: m,
            rowBayar,
            rowTunggakan,
            ket
        };
    });

    const memberSelectOptions = computedRows.map(r => {
        const sisaInfo = r.rowTunggakan > 0 ? `Sisa ${r.ket.text} (${formatRupiahCompactNoSpace(r.rowTunggakan)})` : 'LUNAS';
        return `<option value="${r.member.id}">${r.index}. ${escapeHtml(r.member.name)} — ${sisaInfo}</option>`;
    }).join('');

    const headerEventCols = events.map((ev) => `
        <th class="border border-slate-800 bg-[#FDE9C9] px-2.5 py-2 text-center font-bold text-slate-900 min-w-[115px]">
            <div class="leading-tight">${escapeHtml(ev.label)}</div>
            <div class="text-[11px] font-bold text-slate-800">(${escapeHtml(ev.date)})</div>
            ${isAdmin ? `
                <div class="mt-1 flex items-center justify-center gap-1">
                    <button type="button" onclick="editTakziahEvent('${ev.id}')" class="px-1.5 py-0.5 rounded bg-white/80 hover:bg-white text-[9px] font-bold text-slate-700 border border-slate-300" title="Edit Tanggal/Judul">Edit</button>
                    ${events.length > 1 ? `<button type="button" onclick="deleteTakziahEvent('${ev.id}')" class="px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-[9px] font-bold text-rose-700" title="Hapus Musibah">×</button>` : ''}
                </div>
            ` : ''}
        </th>
    `).join('');

    const bodyRowsHtml = computedRows.map(row => {
        const m = row.member;
        const paymentCells = events.map(ev => {
            const val = Number((m.payments && m.payments[ev.id]) || 0);
            const isPaid = val >= nominal;
            if (isAdmin) {
                if (isPaid) {
                    return `
                        <td class="border border-slate-800 px-2 py-2 text-right font-medium text-slate-900 bg-white">
                            <div class="flex items-center justify-end gap-1.5">
                                <button type="button" onclick="toggleTakziahPayment('${m.id}', '${ev.id}')"
                                    class="px-2 py-1 rounded text-[11px] font-bold transition-colors bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                    title="Klik untuk membatalkan pembayaran menjadi Rp0">
                                    ${formatRupiahCompactNoSpace(val)}
                                </button>
                            </div>
                        </td>
                    `;
                }
                return `
                    <td class="border border-slate-800 px-2 py-2 text-right font-medium text-slate-900 bg-white">
                        <div class="flex items-center justify-end gap-1.5">
                            <span class="px-2 py-1 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 select-none"
                                title="Gunakan form Input Pembayaran Iuran Takziah di atas untuk mencatat pembayaran">
                                ${formatRupiahCompactNoSpace(val)}
                            </span>
                        </div>
                    </td>
                `;
            }
            return `
                <td class="border border-slate-800 px-2.5 py-2 text-right font-medium text-slate-900 bg-white">
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold ${isPaid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}">
                        ${formatRupiahCompactNoSpace(val)}
                    </span>
                </td>
            `;
        }).join('');

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="border border-slate-800 px-2 py-2 text-right font-medium text-slate-900 bg-white">${row.index}</td>
                <td class="border border-slate-800 px-2.5 py-2 text-left font-medium text-slate-900 bg-white">
                    <div class="flex items-center justify-between gap-2">
                        <span>${escapeHtml(m.name)}</span>
                        ${isAdmin ? `
                            <div class="flex items-center gap-1 shrink-0">
                                <button type="button" onclick="editTakziahMember('${m.id}')" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">Edit</button>
                                <button type="button" onclick="deleteTakziahMember('${m.id}')" class="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold">Hapus</button>
                            </div>
                        ` : ''}
                    </div>
                </td>
                ${paymentCells}
                <td class="border border-slate-800 px-2.5 py-2 text-right font-medium text-slate-900 bg-white">
                    ${formatRupiahCompactNoSpace(row.rowBayar)}
                </td>
                <td class="border border-slate-800 px-2.5 py-2 text-right font-medium ${row.rowTunggakan > 0 ? 'text-rose-700 font-semibold' : 'text-slate-900'} bg-white">
                    ${formatRupiahCompactNoSpace(row.rowTunggakan)}
                </td>
                <td class="border border-slate-800 px-2.5 py-2 text-left font-medium ${row.ket.isLunas ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'} bg-white">
                    ${escapeHtml(row.ket.text)}
                </td>
            </tr>
        `;
    }).join('');

    const footerEventTotalsHtml = events.map(ev => `
        <td class="border border-slate-800 px-2.5 py-2 text-right font-extrabold text-slate-950 bg-white">
            ${formatRupiahCompactNoSpace(eventTotals[ev.id] || 0)}
        </td>
    `).join('');

    container.innerHTML = `
        <style>
            #takziah-top-scroll-bar::-webkit-scrollbar,
            #takziah-bottom-table-scroll::-webkit-scrollbar {
                height: 14px;
            }
            #takziah-top-scroll-bar::-webkit-scrollbar-track,
            #takziah-bottom-table-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 6px;
            }
            #takziah-top-scroll-bar::-webkit-scrollbar-thumb,
            #takziah-bottom-table-scroll::-webkit-scrollbar-thumb {
                background: #78716c;
                border-radius: 9999px;
                border: 3px solid #f1f5f9;
            }
            #takziah-top-scroll-bar::-webkit-scrollbar-thumb:hover,
            #takziah-bottom-table-scroll::-webkit-scrollbar-thumb:hover {
                background: #57534e;
            }
        </style>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                    <h2 class="font-display font-extrabold text-base sm:text-lg text-slate-900">Manajemen Iuran Takziah</h2>
                    <p class="text-[11px] text-slate-500">
                        Iuran wajib per kejadian musibah: <strong class="text-slate-800">${formatRupiahCompactNoSpace(nominal)}</strong> • Total ${members.length} Anggota • ${events.length} Kejadian Musibah
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    <button type="button" onclick="copyTakziahWaSummary()" class="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm">
                        Salin Rekap WA
                    </button>
                    <button type="button" onclick="exportTakziahCSV()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">
                        Unduh CSV
                    </button>
                </div>
            </div>

            ${isAdmin ? `
                <div class="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <div class="flex flex-wrap items-center justify-between gap-1">
                        <span class="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">Input Pembayaran Iuran Takziah (Kelipatan ${formatRupiahCompactNoSpace(nominal)})</span>
                        <span class="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Otomatis Ubah Merah (Rp0) → Hijau (${formatRupiahCompactNoSpace(nominal)})</span>
                    </div>
                    <form onsubmit="handleTakziahBatchPayment(event)" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div class="sm:col-span-6">
                            <select id="takziah-pay-member-id" required class="w-full px-2.5 py-2 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-slate-900 outline-none focus:border-emerald-600">
                                ${memberSelectOptions}
                            </select>
                        </div>
                        <div class="sm:col-span-3">
                            <div class="relative">
                                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                                <input type="text" id="takziah-pay-amount" inputmode="numeric" required placeholder="10.000" oninput="formatMoneyInputLive(this)" class="w-full pl-8 pr-2.5 py-2 rounded-lg border border-emerald-300 bg-white font-mono text-xs font-extrabold text-emerald-950 outline-none focus:border-emerald-600">
                            </div>
                        </div>
                        <div class="sm:col-span-3">
                            <button type="submit" class="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-sm transition-colors">
                                Bayar Iuran
                            </button>
                        </div>
                    </form>
                    <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span class="text-[10px] font-semibold text-emerald-800">Pilih Cepat:</span>
                        ${[1, 2, 3, 5].map(mult => {
                            const amt = mult * nominal;
                            return `<button type="button" onclick="document.getElementById('takziah-pay-amount').value='${formatIndoDots(amt)}'" class="px-2 py-0.5 rounded bg-white hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-900">${formatRupiahCompactNoSpace(amt)} (${mult}x)</button>`;
                        }).join('')}
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <form onsubmit="handleAddTakziahMember(event)" class="flex items-center gap-1.5">
                        <input type="text" id="takziah-new-member-name" required placeholder="Nama anggota baru..." class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-emerald-600">
                        <button type="submit" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-800 text-white text-xs font-bold shrink-0">
                            + Anggota
                        </button>
                    </form>
                    <form onsubmit="handleAddTakziahEvent(event)" class="flex items-center gap-1.5">
                        <input type="text" id="takziah-new-event-date" required placeholder="Tgl (cth: 25/11/2026)" class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-amber-600">
                        <button type="submit" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shrink-0">
                            + Musibah #${events.length + 1}
                        </button>
                    </form>
                    <div class="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-slate-600">Tarif per Musibah:</span>
                            <input type="text" id="takziah-nominal-input" value="${formatIndoDots(nominal)}" oninput="formatMoneyInputLive(this)" class="w-24 px-2 py-1 rounded border border-slate-300 bg-white font-mono font-bold text-xs text-slate-900">
                            <button type="button" onclick="updateTakziahNominal()" class="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px]">Terapkan</button>
                        </div>
                        <span class="text-slate-500 italic">*Input pembayaran melalui form di atas; klik sel hijau (${formatRupiahCompactNoSpace(nominal)}) untuk batal ke Rp0</span>
                    </div>
                </div>
            ` : ''}

            <div class="space-y-1">
                <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-300">
                    <button type="button" onclick="scrollTakziahHorizontalBy(-240)" class="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-600 font-bold text-[10px] shrink-0" title="Geser Kiri">◀</button>
                    <div id="takziah-top-scroll-bar" class="flex-1 overflow-x-auto overflow-y-hidden h-4">
                        <div id="takziah-top-scroll-inner" class="h-px"></div>
                    </div>
                    <button type="button" onclick="scrollTakziahHorizontalBy(240)" class="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-600 font-bold text-[10px] shrink-0" title="Geser Kanan">▶</button>
                </div>

                <div id="takziah-bottom-table-scroll" class="overflow-x-auto rounded-lg border border-slate-800">
                    <table id="takziah-main-table" class="w-full border-collapse text-xs sm:text-[13px] font-sans">
                        <thead>
                            <tr>
                                <th class="border border-slate-800 bg-[#FDE9C9] px-2.5 py-2 text-center font-bold text-slate-900 w-10">No</th>
                                <th class="border border-slate-800 bg-[#FDE9C9] px-3 py-2 text-center font-bold text-slate-900 min-w-[145px]">Nama Anggota</th>
                                ${headerEventCols}
                                <th class="border border-slate-800 bg-[#FDE9C9] px-2.5 py-2 text-center font-bold text-slate-900 min-w-[95px]">Total Bayar</th>
                                <th class="border border-slate-800 bg-[#FDE9C9] px-2.5 py-2 text-center font-bold text-slate-900 min-w-[95px]">Tunggakan</th>
                                <th class="border border-slate-800 bg-[#FDE9C9] px-2.5 py-2 text-center font-bold text-slate-900 min-w-[95px]">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bodyRowsHtml.length > 0 ? bodyRowsHtml : `
                                <tr>
                                    <td colspan="${events.length + 5}" class="border border-slate-800 px-4 py-6 text-center text-slate-400">
                                        Belum ada data anggota iuran takziah.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td class="border border-slate-800 px-2.5 py-2 text-left font-extrabold text-slate-950 bg-white">Total</td>
                                <td class="border border-slate-800 px-2.5 py-2 bg-white"></td>
                                ${footerEventTotalsHtml}
                                <td class="border border-slate-800 px-2.5 py-2 text-right font-extrabold text-slate-950 bg-white">
                                    ${formatRupiahCompactNoSpace(grandTotalBayar)}
                                </td>
                                <td class="border border-slate-800 px-2.5 py-2 text-right font-extrabold text-rose-700 bg-white">
                                    ${formatRupiahCompactNoSpace(grandTotalTunggakan)}
                                </td>
                                <td class="border border-slate-800 px-2.5 py-2 bg-white"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;

    setupTakziahDualHorizontalScroll();
}

async function toggleTakziahPayment(memberId, eventId) {
    if (currentRole !== 'admin') return;
    const member = takziahState.members.find(m => m.id === memberId);
    if (!member) return;
    if (!member.payments) member.payments = {};

    const nominal = Number(takziahState.nominalPerMusibah) || 10000;
    const currentVal = Number(member.payments[eventId] || 0);

    // Jika nilai 0, tidak boleh diubah menjadi 10.000 lewat klik sel tabel
    if (currentVal <= 0) {
        showToast('Input pembayaran hanya melalui kolom Input Pembayaran Iuran Takziah di atas.', 'info');
        return;
    }

    // Jika bernilai > 0 (misal Rp10.000), tampilkan pemberitahuan konfirmasi sebelum diubah menjadi Rp0
    const evObj = (takziahState.events || []).find(ev => ev.id === eventId);
    const evLabel = evObj ? `${evObj.label} (${evObj.date})` : 'iuran musibah ini';
    const confirmed = await showInAppDialog({
        title: 'Batalkan Pembayaran Iuran?',
        message: `Apakah Anda yakin ingin mengubah pembayaran ${member.name} pada ${evLabel} dari ${formatRupiahCompactNoSpace(currentVal)} menjadi Rp0?`,
        confirmText: 'Ya, Ubah ke Rp0',
        cancelText: 'Batal'
    });

    if (!confirmed) return;

    const prevScrollLeft = document.getElementById('takziah-bottom-table-scroll')?.scrollLeft || 0;
    member.payments[eventId] = 0;

    saveTakziahState();
    renderTakziahView();

    const newBottomWrap = document.getElementById('takziah-bottom-table-scroll');
    const newTopBar = document.getElementById('takziah-top-scroll-bar');
    if (newBottomWrap) newBottomWrap.scrollLeft = prevScrollLeft;
    if (newTopBar) newTopBar.scrollLeft = prevScrollLeft;
    showToast(`Pembayaran ${member.name} diubah menjadi Rp0.`, 'info');
}

function handleAddTakziahMember(e) {
    e.preventDefault();
    if (currentRole !== 'admin') return;
    const input = document.getElementById('takziah-new-member-name');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    const payments = {};
    takziahState.events.forEach(ev => { payments[ev.id] = 0; });

    takziahState.members.push({
        id: 'm-' + Date.now(),
        name,
        payments
    });

    if (input) input.value = '';
    saveTakziahState();
    renderTakziahView();
    showToast(`Anggota "${name}" ditambahkan ke daftar Takziah.`, 'success');
}

async function editTakziahMember(memberId) {
    if (currentRole !== 'admin') return;
    const member = takziahState.members.find(m => m.id === memberId);
    if (!member) return;
    const newName = await showInAppDialog({
        title: 'Ubah Nama Anggota',
        message: 'Masukkan nama lengkap anggota iuran takziah:',
        inputDefault: member.name,
        confirmText: 'Simpan'
    });
    if (newName && newName.trim()) {
        member.name = newName.trim();
        saveTakziahState();
        renderTakziahView();
        showToast('Nama anggota diperbarui.', 'success');
    }
}

async function deleteTakziahMember(memberId) {
    if (currentRole !== 'admin') return;
    const member = takziahState.members.find(m => m.id === memberId);
    if (!member) return;
    const ok = await showInAppDialog({
        title: 'Hapus Anggota Takziah',
        message: `Hapus "${member.name}" dari daftar Iuran Takziah?`,
        confirmText: 'Hapus'
    });
    if (!ok) return;
    takziahState.members = takziahState.members.filter(m => m.id !== memberId);
    saveTakziahState();
    renderTakziahView();
    showToast('Anggota dihapus.', 'info');
}

function handleAddTakziahEvent(e) {
    e.preventDefault();
    if (currentRole !== 'admin') return;
    const input = document.getElementById('takziah-new-event-date');
    const dateVal = input ? input.value.trim() : '';
    if (!dateVal) return;

    const nextNum = takziahState.events.length + 1;
    const newId = 'ev-' + Date.now();
    takziahState.events.push({
        id: newId,
        label: `Iuran Musibah #${nextNum}`,
        date: dateVal
    });

    takziahState.members.forEach(m => {
        if (!m.payments) m.payments = {};
        m.payments[newId] = 0;
    });

    if (input) input.value = '';
    saveTakziahState();
    renderTakziahView();
    showToast(`Kolom Iuran Musibah #${nextNum} (${dateVal}) ditambahkan.`, 'success');
}

async function editTakziahEvent(eventId) {
    if (currentRole !== 'admin') return;
    const ev = takziahState.events.find(x => x.id === eventId);
    if (!ev) return;
    const newLabel = await showInAppDialog({
        title: 'Ubah Label Kolom Musibah',
        message: 'Contoh: Iuran Musibah #1',
        inputDefault: ev.label,
        confirmText: 'Lanjut'
    });
    if (!newLabel || !newLabel.trim()) return;
    const newDate = await showInAppDialog({
        title: 'Ubah Tanggal / Keterangan Musibah',
        message: 'Contoh: 10/11/2026 atau Musibah #1',
        inputDefault: ev.date,
        confirmText: 'Simpan'
    });
    if (!newDate || !newDate.trim()) return;

    ev.label = newLabel.trim();
    ev.date = newDate.trim();
    saveTakziahState();
    renderTakziahView();
    showToast('Data musibah diperbarui.', 'success');
}

async function deleteTakziahEvent(eventId) {
    if (currentRole !== 'admin' || takziahState.events.length <= 1) return;
    const ev = takziahState.events.find(x => x.id === eventId);
    if (!ev) return;
    const ok = await showInAppDialog({
        title: 'Hapus Kolom Musibah',
        message: `Hapus kolom "${ev.label} (${ev.date})"?`,
        confirmText: 'Hapus'
    });
    if (!ok) return;

    takziahState.events = takziahState.events.filter(x => x.id !== eventId);
    takziahState.events.forEach((item, idx) => {
        if (/^Iuran Musibah #\d+$/i.test(item.label)) {
            item.label = `Iuran Musibah #${idx + 1}`;
        }
    });
    takziahState.members.forEach(m => {
        if (m.payments) delete m.payments[eventId];
    });

    saveTakziahState();
    renderTakziahView();
    showToast('Kolom musibah dihapus.', 'info');
}

function updateTakziahNominal() {
    if (currentRole !== 'admin') return;
    const input = document.getElementById('takziah-nominal-input');
    const val = parseIndoNumber(input ? input.value : 0);
    if (val <= 0) {
        showToast('Tarif iuran harus lebih dari Rp0.', 'error');
        return;
    }
    const oldNominal = takziahState.nominalPerMusibah;
    takziahState.nominalPerMusibah = val;
    takziahState.members.forEach(m => {
        if (!m.payments) return;
        Object.keys(m.payments).forEach(evId => {
            if (m.payments[evId] === oldNominal) {
                m.payments[evId] = val;
            }
        });
    });
    saveTakziahState();
    renderTakziahView();
    showToast(`Tarif iuran diperbarui menjadi ${formatRupiahCompactNoSpace(val)}.`, 'success');
}

function copyTakziahWaSummary() {
    const nominal = Number(takziahState.nominalPerMusibah) || 10000;
    const events = takziahState.events || [];
    const totalWajib = events.length * nominal;
    let totalBayarAll = 0;
    let totalTunggakanAll = 0;

    const lines = [
        `*REKAP IURAN TAKZIAH - ${appSettings.orgName.toUpperCase()}*`,
        `Tarif: ${formatRupiahCompactNoSpace(nominal)} / musibah (${events.map(e => `${e.label} ${e.date}`).join(', ')})`,
        "======================================"
    ];

    takziahState.members.forEach((m, idx) => {
        const bayar = events.reduce((acc, ev) => acc + Number((m.payments && m.payments[ev.id]) || 0), 0);
        const tunggakan = Math.max(0, totalWajib - bayar);
        const ket = getTakziahKeteranganAndCount(tunggakan, nominal).text;
        totalBayarAll += bayar;
        totalTunggakanAll += tunggakan;
        lines.push(`${idx + 1}. ${m.name} | Bayar: ${formatRupiahCompactNoSpace(bayar)} | Tunggakan: ${formatRupiahCompactNoSpace(tunggakan)} (${ket})`);
    });

    lines.push("======================================");
    lines.push(`*Total Terkumpul:* ${formatRupiahCompactNoSpace(totalBayarAll)}`);
    lines.push(`*Total Tunggakan:* ${formatRupiahCompactNoSpace(totalTunggakanAll)}`);

    copyTextFallback(lines.join('\n'), 'Rekap WA Iuran Takziah berhasil disalin!');
}

function exportTakziahCSV() {
    const nominal = Number(takziahState.nominalPerMusibah) || 10000;
    const events = takziahState.events || [];
    const totalWajib = events.length * nominal;

    const headers = ['No', 'Nama Anggota', ...events.map(e => `"${e.label} (${e.date})"`), 'Total Bayar', 'Tunggakan', 'Keterangan'];
    const rows = [headers.join(',')];

    takziahState.members.forEach((m, idx) => {
        const evVals = events.map(ev => Number((m.payments && m.payments[ev.id]) || 0));
        const bayar = evVals.reduce((a, b) => a + b, 0);
        const tunggakan = Math.max(0, totalWajib - bayar);
        const ket = getTakziahKeteranganAndCount(tunggakan, nominal).text;
        rows.push([idx + 1, `"${m.name}"`, ...evVals, bayar, tunggakan, `"${ket}"`].join(','));
    });

    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Rekap_Iuran_Takziah_INFAQMU.csv';
    a.click();
}