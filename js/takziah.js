// =====================================================================
// MODUL MANAJEMEN IURAN TAKZIAH (js/takziah.js)
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

    const currentVal = Number(member.payments[eventId] || 0);
    if (currentVal <= 0) {
        showToast('Input pembayaran hanya melalui kolom Input Pembayaran Iuran Takziah di atas.', 'info');
        return;
    }

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
