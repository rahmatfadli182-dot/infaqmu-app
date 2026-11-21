// =====================================================================
// LOGIKA BUKU KAS, CARRY-OVER SALDO, & SINKRONISASI SUPABASE (js/ledger.js)
// =====================================================================

function getRealtimePeriods() {
    const now = new Date();
    const curYear = String(now.getFullYear());
    const curMonthNum = now.getMonth() + 1;
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
