const { XepBaiBinh, getCard } = require('./mau_binh_logic.js');

function combinationsOfK(arr, k) {
    const out = [];
    const n = arr.length;
    const pick = [];

    function dfs(start, need) {
        if (need === 0) {
            out.push([...pick]);
            return;
        }
        for (let i = start; i <= n - need; i++) {
            pick.push(arr[i]);
            dfs(i + 1, need - 1);
            pick.pop();
        }
    }

    dfs(0, k);
    return out;
}

function cardsKey(cards) {
    return [...cards].sort((a, b) => a - b).join('-');
}

function solutionTypeKey(s1Name, s2Name, s3Name) {
    return `${s3Name}|${s2Name}|${s1Name}`;
}

function removeCards(source, toRemove) {
    const rm = new Set(toRemove);
    return source.filter((c) => !rm.has(c));
}

function score5(xb, cards) {
    const t = xb.getBinhType(cards);
    const sortedNorm = [...cards]
        .map((c) => (c < 4 ? c + 52 : c))
        .sort((a, b) => b - a);
    return {
        name: t.name,
        hang: t.hang,
        diem: t.diem,
        // tie-break phụ để giữ ổn định khi cùng hang/diem
        kickers: sortedNorm
    };
}

function score3(xb, cards) {
    const t = xb.getBinhType(cards);
    const sortedNorm = [...cards]
        .map((c) => (c < 4 ? c + 52 : c))
        .sort((a, b) => b - a);
    return {
        name: t.name,
        hang: t.hang,
        diem: t.diem,
        kickers: sortedNorm
    };
}

function compareScore(a, b) {
    if (a.hang !== b.hang) return a.hang - b.hang;
    if (a.diem !== b.diem) return a.diem - b.diem;

    const n = Math.min(a.kickers.length, b.kickers.length);
    for (let i = 0; i < n; i++) {
        if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
    }
    return 0;
}

function totalScore(s3, s2, s1) {
    return s3.hang + s2.hang + s1.hang;
}

function best5ScoreFromPool(xb, cards) {
    if (cards.length < 5) return null;
    const combos = combinationsOfK(cards, 5);
    let best = null;
    for (const c of combos) {
        const sc = score5(xb, c);
        if (!best || compareScore(sc, best) > 0) best = sc;
    }
    return best;
}

function best3ScoreFromPool(xb, cards) {
    if (cards.length < 3) return null;
    const combos = combinationsOfK(cards, 3);
    let best = null;
    for (const c of combos) {
        const sc = score3(xb, c);
        if (!best || compareScore(sc, best) > 0) best = sc;
    }
    return best;
}

function solveMauBinh(cardIds, limit = 50) {
    if (!Array.isArray(cardIds) || cardIds.length !== 13) {
        throw new Error('solveMauBinhBruteforce yêu cầu đúng 13 lá bài.');
    }

    const sorted = [...cardIds].sort((a, b) => a - b);
    const xb = new XepBaiBinh(sorted);

    const all5From13 = combinationsOfK(sorted, 5);
    const score5Cache = new Map();
    const score3Cache = new Map();
    const best5BoundCache = new Map();
    const best3BoundCache = new Map();

    const getScore5Cached = (cards) => {
        const key = cardsKey(cards);
        if (!score5Cache.has(key)) score5Cache.set(key, score5(xb, cards));
        return score5Cache.get(key);
    };

    const getScore3Cached = (cards) => {
        const key = cardsKey(cards);
        if (!score3Cache.has(key)) score3Cache.set(key, score3(xb, cards));
        return score3Cache.get(key);
    };

    const getBest5Bound = (cards) => {
        const key = cardsKey(cards);
        if (!best5BoundCache.has(key)) {
            best5BoundCache.set(key, best5ScoreFromPool(xb, cards));
        }
        return best5BoundCache.get(key);
    };

    const getBest3Bound = (cards) => {
        const key = cardsKey(cards);
        if (!best3BoundCache.has(key)) {
            best3BoundCache.set(key, best3ScoreFromPool(xb, cards));
        }
        return best3BoundCache.get(key);
    };

    let bestTotal = -Infinity;
    const bestPerType = new Map(); // typeKey -> { solution, total, h3, h2, h1, ... }

    // Duyệt toàn bộ chi 3 (5 lá), rồi chi 2 (5 lá), chi 1 lấy phần còn lại (3 lá).
    for (const chi3Cards of all5From13) {
        const s3 = getScore5Cached(chi3Cards);
        const remain8 = removeCards(sorted, chi3Cards);

        // Cắt tỉa nhánh: điểm tối đa có thể đạt từ phần còn lại vẫn không qua được bestTotal.
        const b5 = getBest5Bound(remain8);
        const b3 = getBest3Bound(remain8);
        if (b5 && b3) {
            const optimistic = s3.hang + b5.hang + b3.hang;
            if (optimistic < bestTotal) continue;
        }

        const all5From8 = combinationsOfK(remain8, 5);
        for (const chi2Cards of all5From8) {
            const s2 = getScore5Cached(chi2Cards);

            // Luật không lủng: chi 3 phải >= chi 2.
            if (compareScore(s3, s2) < 0) continue;

            const remain3 = removeCards(remain8, chi2Cards);
            const s1 = getScore3Cached(remain3);

            // Luật không lủng: chi 2 phải >= chi 1.
            if (compareScore(s2, s1) < 0) continue;

            const sum = totalScore(s3, s2, s1);
            
            const typeKey = solutionTypeKey(s1.name, s2.name, s3.name);
            const existingPerType = bestPerType.get(typeKey);

            // Nếu loại này chưa có hoặc solution mới tốt hơn (theo total trước, sau đó chi 3, chi 2, chi 1)
            if (
                !existingPerType ||
                sum > existingPerType.total ||
                (sum === existingPerType.total && compareScore({ hang: s3.hang, diem: s3.diem, kickers: s3.kickers }, { hang: existingPerType.s3.hang, diem: existingPerType.s3.diem, kickers: existingPerType.s3.kickers }) > 0) ||
                (sum === existingPerType.total && s3.hang === existingPerType.s3.hang && compareScore({ hang: s2.hang, diem: s2.diem, kickers: s2.kickers }, { hang: existingPerType.s2.hang, diem: existingPerType.s2.diem, kickers: existingPerType.s2.kickers }) > 0)
            ) {
                bestPerType.set(typeKey, {
                    chi1: {
                        cards: remain3.map((id) => getCard(id).name),
                        cardIds: [...remain3],
                        loai: s1.name,
                        score: [s1.diem || 0]
                    },
                    chi2: {
                        cards: chi2Cards.map((id) => getCard(id).name),
                        cardIds: [...chi2Cards],
                        loai: s2.name,
                        score: [s2.diem || 0]
                    },
                    chi3: {
                        cards: chi3Cards.map((id) => getCard(id).name),
                        cardIds: [...chi3Cards],
                        loai: s3.name,
                        score: [s3.diem || 0]
                    },
                    s1, s2, s3,
                    total: sum,
                    h3: s3.hang,
                    h2: s2.hang,
                    h1: s1.hang,
                    d3: s3.diem,
                    d2: s2.diem,
                    d1: s1.diem,
                    k3: s3.kickers,
                    k2: s2.kickers,
                    k1: s1.kickers
                });
                if (sum > bestTotal) bestTotal = sum;
            }
        }
    }

    // Convert Map to array, sort, slice
    const found = Array.from(bestPerType.values());

    found.sort((a, b) => {
        if (a.total !== b.total) return b.total - a.total;
        if (a.h3 !== b.h3) return b.h3 - a.h3;
        if (a.h2 !== b.h2) return b.h2 - a.h2;
        if (a.h1 !== b.h1) return b.h1 - a.h1;
        if (a.d3 !== b.d3) return b.d3 - a.d3;
        if (a.d2 !== b.d2) return b.d2 - a.d2;
        if (a.d1 !== b.d1) return b.d1 - a.d1;

        for (let i = 0; i < 5; i++) {
            if (a.k3[i] !== b.k3[i]) return b.k3[i] - a.k3[i];
        }
        for (let i = 0; i < 5; i++) {
            if (a.k2[i] !== b.k2[i]) return b.k2[i] - a.k2[i];
        }
        for (let i = 0; i < 3; i++) {
            if (a.k1[i] !== b.k1[i]) return b.k1[i] - a.k1[i];
        }
        return 0;
    });

    const deduped = found.slice(0, Math.max(1, limit));
    const clean = deduped.map((s) => ({ chi1: s.chi1, chi2: s.chi2, chi3: s.chi3 }));

    clean.maubinh = [];
    if (xb.checkSanhRong(sorted)) clean.maubinh.push({ loai: 'Sảnh rồng' });
    else if (xb.checkDongHoa(sorted)) clean.maubinh.push({ loai: 'Đồng hoa' });
    else if (xb.check6Doi(sorted)) clean.maubinh.push({ loai: 'Lục phé bôn' });

    clean.sapxep = xb.analyze_cards(sorted);
    return clean;
}

module.exports = {  solveMauBinh };
