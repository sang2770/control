class XepBaiBinh {
    static BichList = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52];
    static ChuongList = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53];
    static RoList = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54];
    static CoList = [3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55];
    static mauden = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 52, 53];
    static maudo = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 54, 55];

    constructor(card) {
        this.card = [...card].sort((a, b) => a - b);
    }

    normalizeRules(c) {
        let nc = [...c];
        for (let i = 0; i < nc.length; i++) {
            if (nc[i] < 4) nc[i] += 52; // Ace = 52-55 (Rank 13)
        }
        return nc;
    }

    getCombinations(array, k) {
        let results = [];
        function backtrack(start, combo) {
            if (combo.length === k) {
                results.push([...combo]);
                return;
            }
            for (let i = start; i < array.length; i++) {
                combo.push(array[i]);
                backtrack(i + 1, combo);
                combo.pop();
            }
        }
        backtrack(0, []);
        return results;
    }

    getDoiXamQui(card, count) {
        let nc = this.normalizeRules(card);
        let rankMap = {};
        for (let c of nc) {
            let r = Math.floor(c / 4);
            if (!rankMap[r]) rankMap[r] = [];
            rankMap[r].push(c);
        }
        let arr = [];
        let ranks = Object.keys(rankMap).map(Number).sort((a, b) => b - a);
        for (let r of ranks) {
            let cards = rankMap[r];
            if (cards.length >= count) {
                if (count === 2) {
                    arr.push([cards[0], cards[1]]);
                    if (cards.length === 4) arr.push([cards[2], cards[3]]);
                } else {
                    arr.push(cards.slice(0, count));
                }
            }
        }
        return arr;
    }

    getTPS(card) {
        if (card.length < 5) return [];
        let tc = [...card];
        let arrTPS = [];
        let sanhs = this.getSanh(tc, 5, true);
        for (let sanh of sanhs) {
            let suits = sanh.map(c => c % 4);
            if (suits.every(s => s === suits[0])) {
                arrTPS.push(sanh);
            }
        }
        return arrTPS;
    }

    getCuLu(card) {
        if (card.length < 5) return [];
        let arrCuLu = [];
        let arrXam = this.getDoiXamQui(card, 3);
        let arrDoi = this.getDoiXamQui(card, 2);
        for (let xam of arrXam) {
            for (let doi of arrDoi) {
                if (!xam.some(c => doi.includes(c))) {
                    arrCuLu.push([...xam, ...doi]);
                }
            }
        }
        return arrCuLu;
    }

    getThung(card, length = 5) {
        let nc = this.normalizeRules(card);
        let arrThung = [];
        let groups = [XepBaiBinh.BichList, XepBaiBinh.ChuongList, XepBaiBinh.RoList, XepBaiBinh.CoList];
        for (let suitGroup of groups) {
            let inHand = nc.filter(c => suitGroup.includes(c));
            if (inHand.length >= length) {
                let combos = this.getCombinations(inHand, length);
                for (let comb of combos) arrThung.push(comb);
            }
        }
        arrThung.sort((a, b) => {
            let rA = a.map(c => Math.floor(c / 4)).sort((x, y) => y - x);
            let rB = b.map(c => Math.floor(c / 4)).sort((x, y) => y - x);
            for (let i = 0; i < length; i++) {
                if (rA[i] !== rB[i]) return rB[i] - rA[i];
            }
            return 0;
        });
        return arrThung.map(c => c.map(id => id > 51 ? id - 52 : id));
    }

    getSanh(card, length = 5, allSuits = false) {
        let arrSanh = [];
        let nc = this.normalizeRules(card);
        let rankMap = {};
        for (let c of nc) {
            let r = Math.floor(c / 4);
            if (!rankMap[r]) rankMap[r] = [];
            rankMap[r].push(c);
        }

        let ranks = Object.keys(rankMap).map(Number).sort((a, b) => a - b);
        if (ranks.includes(13)) { // Aces
            rankMap[0] = rankMap[13].map(c => c - 52);
            if (!ranks.includes(0)) {
                ranks.push(0);
                ranks.sort((a, b) => a - b);
            }
        }

        for (let i = 0; i <= ranks.length - length; i++) {
            let seq = ranks.slice(i, i + length);
            if (seq[seq.length - 1] - seq[0] === length - 1) {
                let combos = [[]];
                for (let r of seq) {
                    let available = (allSuits && rankMap[r]) ? rankMap[r] : [rankMap[r][0]];
                    let temp = [];
                    for (let c of available) {
                        for (let cm of combos) temp.push([...cm, c]);
                    }
                    combos = temp;
                }
                for (let c of combos) arrSanh.push(c);
            }
        }

        arrSanh.sort((a, b) => {
            let get_max_r = (s) => {
                let rSet = new Set(s.map(c => Math.floor((c > 51 ? c - 52 : c) / 4)));
                if ([9, 10, 11, 12, 0].every(x => rSet.has(x))) return 13;
                if ([0, 1, 2, 3, 4].every(x => rSet.has(x))) return 4;
                return Math.max(...Array.from(rSet));
            };
            return get_max_r(b) - get_max_r(a);
        });
        return arrSanh.map(c => c.map(id => id > 51 ? id - 52 : id));
    }

    getThu(card) {
        if (card.length < 4) return [];
        let tc = [...card];
        let arrThu = [];
        let arrDoi = this.getDoiXamQui(tc, 2);
        for (let i = 0; i < arrDoi.length - 1; i++) {
            for (let j = i + 1; j < arrDoi.length; j++) {
                if (arrDoi[i].some(c => arrDoi[j].includes(c))) continue;
                let r1 = Math.floor(arrDoi[i][0] / 4);
                let r2 = Math.floor(arrDoi[j][0] / 4);
                if (r1 !== r2) {
                    arrThu.push([...arrDoi[i], ...arrDoi[j]]);
                }
            }
        }
        return arrThu;
    }

    getMauThau(card) {
        let nc = this.normalizeRules(card).sort((a, b) => a - b);
        return nc.map(c => c > 51 ? c - 52 : c);
    }

    check6Doi(cards) {
        let rMap = {};
        for (let c of cards) {
            let r = Math.floor(c / 4);
            rMap[r] = (rMap[r] || 0) + 1;
        }
        let pairs = 0;
        for (let r in rMap) pairs += Math.floor(rMap[r] / 2);
        return pairs >= 6;
    }

    checkSanhRong(card) {
        let rSet = new Set(card.map(c => Math.floor(c / 4)));
        return rSet.size === 13;
    }

    checkDongHoa(card) {
        let red = card.every(c => XepBaiBinh.maudo.includes(c));
        let black = card.every(c => XepBaiBinh.mauden.includes(c));
        return red || black;
    }

    getBinhType(cards) {
        if (cards.length === 3) {
            let x = this.getDoiXamQui(cards, 3);
            if (x.length > 0) return { name: "Xám", hang: 27, diem: Math.floor(x[0][0] / 4) };
            let d = this.getDoiXamQui(cards, 2);
            if (d.length > 0) return { name: "Đôi", hang: 3, diem: Math.floor(d[0][0] / 4) };
            return { name: "Mậu Thầu", hang: 1, diem: Math.max(...cards.map(c => Math.floor(c / 4))) };
        }
        if (this.getTPS(cards).length > 0) return { name: "Thùng Phá Sảnh", hang: 6561, diem: Math.max(...cards.map(c => Math.floor(c / 4))) };
        if (this.getDoiXamQui(cards, 4).length > 0) return { name: "Tứ Quí", hang: 2187, diem: 0 };
        if (this.getCuLu(cards).length > 0) return { name: "Cù Lũ", hang: 729, diem: 0 };
        if (this.getThung(cards).length > 0) return { name: "Thùng", hang: 243, diem: 0 };
        if (this.getSanh(cards).length > 0) return { name: "Sảnh", hang: 81, diem: 0 };
        if (this.getDoiXamQui(cards, 3).length > 0) return { name: "Xám", hang: 27, diem: 0 };
        if (this.getThu(cards).length > 0) return { name: "Thú", hang: 9, diem: 0 };
        if (this.getDoiXamQui(cards, 2).length > 0) return { name: "Đôi", hang: 3, diem: 0 };
        return { name: "Mậu Thầu", hang: 1, diem: 0 };
    }

    analyze_cards(card) {
        let t = this.getThung(card, 5);
        let s = this.getSanh(card, 5);
        return {
            sort: { card: card, baobinh: this.check6Doi(card) },
            thung: { card: t[0] || [] },
            sanh: { card: s[0] || [] }
        };
    }

    *getCombinationsOf3(n) {
        for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
                for (let k = j + 1; k < n; k++) {
                    yield [i, j, k];
                }
            }
        }
    }

    getData() {
        let arrXep = [];
        let heso = 60;

        let getNormalizedId = (c) => c < 4 ? c + 52 : c;
        let getRank = (c) => c < 4 ? 13 : Math.floor(c / 4);
        let getMaxId = (cards) => Math.max(...cards.map(getNormalizedId));
        let getMaxRank = (cards) => Math.max(...cards.map(getRank));
        let mapCard = (cards) => cards.map(c => c > 51 ? c - 52 : c);

        this.getTPS(this.card).forEach(x => arrXep.push({ card: mapCard(x), binh: "Thùng Phá Sảnh", hang: heso * 2187, diem: getMaxRank(x) }));
        this.getDoiXamQui(this.card, 4).forEach(x => arrXep.push({ card: mapCard(x), binh: "Tứ Quí", hang: heso * 729, diem: getMaxRank(x) }));
        this.getCuLu(this.card).forEach(x => arrXep.push({ card: mapCard(x), binh: "Cù Lũ", hang: heso * 243, diem: getRank(x[0]) }));
        this.getThung(this.card).forEach(x => arrXep.push({ card: mapCard(x), binh: "Thùng", hang: heso * 81, diem: getMaxId(x) }));
        this.getSanh(this.card).forEach(x => arrXep.push({ card: mapCard(x), binh: "Sảnh", hang: heso * 27, diem: getMaxId(x) }));
        this.getDoiXamQui(this.card, 3).forEach(x => arrXep.push({ card: mapCard(x), binh: "Xám", hang: heso * 9, diem: getNormalizedId(x[0]) }));
        this.getThu(this.card).forEach(x => arrXep.push({ card: mapCard(x), binh: "Thú", hang: heso * 3, diem: getMaxId(x) }));
        this.getDoiXamQui(this.card, 2).forEach(x => arrXep.push({ card: mapCard(x), binh: "Đôi", hang: heso * 1, diem: getNormalizedId(x[0]) }));

        while (arrXep.length < 3) {
            arrXep.push({ card: [], binh: "Mậu Thầu", hang: 1, diem: 0 });
        }

        let arrMau = this.getMauThau(this.card);
        let arrBinh = [];

        for (let idx of this.getCombinationsOf3(arrXep.length)) {
            let i = idx[0], j = idx[1], k = idx[2];
            let b1 = arrXep[i];
            let b2 = arrXep[j];
            let b3 = arrXep[k];

            let binh = [{ card: [...b1.card], binh: b1.binh, hang: b1.hang, diem: b1.diem }];

            let overlap12 = b1.card.some(c => b2.card.includes(c));
            if (!overlap12) {
                binh.push({ card: [...b2.card], binh: b2.binh, hang: b2.hang, diem: b2.diem });
            }

            if (binh.length === 2) {
                let used12 = new Set([...binh[0].card, ...binh[1].card]);
                let overlap123 = b3.card.some(c => used12.has(c));
                if (!overlap123) {
                    binh.push({ card: [...b3.card], binh: b3.binh, hang: b3.hang, diem: b3.diem });
                }
            }

            while (binh.length < 3) {
                binh.push({ card: [], binh: "Mậu Thầu", hang: 1, diem: 0 });
            }

            let arrMauCopy = [...arrMau];
            let usedSet = new Set([...binh[0].card, ...binh[1].card, ...binh[2].card]);

            let fillChi = (binh_i, limit) => {
                let arrCopyMau = arrMauCopy.filter(c => !usedSet.has(c));
                while (binh_i.card.length < limit) {
                    if (arrCopyMau.length > 0) {
                        if (binh_i.card.length === 0) {
                            let cardMT = arrCopyMau.pop();
                            binh_i.card.push(cardMT);
                            binh_i.diem = cardMT;
                            usedSet.add(cardMT);
                        } else {
                            let cardMT = arrCopyMau.shift();
                            binh_i.card.push(cardMT);
                            usedSet.add(cardMT);
                        }
                    } else {
                        break;
                    }
                }
            };

            fillChi(binh[0], 5);
            fillChi(binh[1], 5);
            fillChi(binh[2], 3);

            if (binh[0].binh === binh[1].binh && binh[0].binh !== "Sảnh") {
                if (binh[0].binh === "Thùng") {
                    if (this.getThung(binh[2].card, 3).length > 0 || this.getSanh(binh[2].card, 3).length > 0) {
                        binh[0].hang = 131220;
                        binh[1].hang = 131220;
                        binh[2].hang = 131220;
                        binh[2].binh = binh[1].binh;
                    }
                }
            }

            arrBinh.push(binh);
        }

        if (arrBinh.length === 0) {
            let b = [{ card: [], hang: 1, diem: 0, binh: "Mậu Thầu" }, { card: [], hang: 1, diem: 0, binh: "Mậu Thầu" }, { card: [], hang: 1, diem: 0, binh: "Mậu Thầu" }];
            b[0].card = arrMau.slice(0, 5);
            b[1].card = arrMau.slice(5, 10);
            b[2].card = arrMau.slice(10, 13);
            arrBinh.push(b);
        }

        arrBinh.sort((a, b) => {
            let sumA = a[0].hang + a[1].hang + a[2].hang;
            let sumB = b[0].hang + b[1].hang + b[2].hang;
            if (sumA !== sumB) return sumB - sumA;
            if (a[0].hang !== b[0].hang) return b[0].hang - a[0].hang;
            if (a[1].hang !== b[1].hang) return b[1].hang - a[1].hang;
            return b[2].diem - a[2].diem;
        });

        let filtered = [];
        let count = 0;
        for (let binh of arrBinh) {
            let isCungDiem = false;
            for (let binhfl of filtered) {
                if (binh[0].hang === binhfl[0].hang && binh[1].hang === binhfl[1].hang && binh[2].hang === binhfl[2].hang) {
                    isCungDiem = true;
                    break;
                }
            }
            if (count < 4 && !isCungDiem) {
                filtered.push(binh);
                count++;
            }
        }

        let bao = [];
        if (this.checkSanhRong(this.card)) bao.push({ loai: "Sảnh rồng" });
        else if (this.checkDongHoa(this.card)) bao.push({ loai: "Đồng hoa" });
        else if (this.check6Doi(this.card)) bao.push({ loai: "Lục phé bôn" });

        if (filtered[0]) {
            let is3Thung = filtered[0].every(chi => this.getThung(chi.card, chi.card.length).length > 0);
            if (is3Thung) bao.push({ loai: "3 cái Thùng" });
            else {
                let is3Sanh = filtered[0].every(chi => this.getSanh(chi.card, chi.card.length).length > 0);
                if (is3Sanh) bao.push({ loai: "3 cái Sảnh" });
            }
        }

        return { xepbai: filtered, maubinh: bao, sapxep: this.analyze_cards(this.card) };
    }
}

function solveMauBinh(cardIds, limit = 50) {
    let xb = new XepBaiBinh(cardIds);
    let res = xb.getData();
    let solutions = res.xepbai.map(x => ({
        chi1: { cards: x[2].card.map(id => getCard(id).name), cardIds: x[2].card, loai: x[2].binh, score: [x[2].diem || 0] },
        chi2: { cards: x[1].card.map(id => getCard(id).name), cardIds: x[1].card, loai: x[1].binh, score: [x[1].diem || 0] },
        chi3: { cards: x[0].card.map(id => getCard(id).name), cardIds: x[0].card, loai: x[0].binh, score: [x[0].diem || 0] }
    }));
    solutions.maubinh = res.maubinh;
    solutions.sapxep = res.sapxep;
    return solutions;
}

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♣', '♦', '♥'];
function getCard(id) {
    let vIdx = Math.floor(id / 4);
    let sIdx = id % 4;
    return { id, name: VALUES[vIdx] + SUITS[sIdx] };
}

// --- GUEST CARD TRACKER LOGIC ---
let cardKnowledge = new Set();
let taggedPlayers = new Set();

function resetGuestTracker() {
    cardKnowledge.clear();
    taggedPlayers.clear();
}

function updateKnowledge(playerName, cardIds) {
    if (!cardIds || cardIds.length !== 13) return null;
    cardIds.forEach(id => cardKnowledge.add(id));
    taggedPlayers.add(playerName);

    // If we know cards of 3 players (including us/bots), 
    // the remaining 13 cards MUST be the guest's cards.
    if (taggedPlayers.size === 3 && cardKnowledge.size === 39) {
        let guestCards = [];
        for (let i = 0; i < 52; i++) {
            if (!cardKnowledge.has(i)) guestCards.push(i);
        }
        if (guestCards.length === 13) {
            return guestCards;
        }
    }
    return null;
}

const exportObj = { solveMauBinh, getCard, XepBaiBinh, resetGuestTracker, updateKnowledge };
if (typeof module !== "undefined" && module.exports) {
    module.exports = exportObj;
}