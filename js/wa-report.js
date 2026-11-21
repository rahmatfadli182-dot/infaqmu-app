// =====================================================================
// MODUL REKAP LAPORAN WHATSAPP & FORM BULANAN (js/wa-report.js)
// =====================================================================

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

function buildWaReportCalculationAndText() {
    if (currentRole === 'admin' && isWaFormEditable) {
        waFormState.month = document.getElementById('wa-input-month').value;
        waFormState.year = document.getElementById('wa-input-year').value || '2026';
        waFormState.prevLabel = document.getElementById('wa-prev-label').value.trim() || 'Sisa saldo bulan sebelumnya';
        waFormState.prevAmount = parseIndoNumber(document.getElementById('wa-prev-amount').value);
        waFormState.expenseGroupTitle = document.getElementById('wa-expense-group-title').value.trim() || 'Belanja sembako';
    }
    return buildWaReportCalculationFromState(waFormState);
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
