class XepBaiBinh {

    constructor(card) {
        this.card = [...card].sort((a, b) => a - b);
        this.cacheType = new Map();
    }

    // ================= BASIC =================

    getRank(c) {
        return c < 4 ? 13 : Math.floor(c / 4);
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

    // ================= CACHE =================

    fastType(cards) {
        let key = cards.slice().sort((a,b)=>a-b).join("-");
        if (this.cacheType.has(key)) return this.cacheType.get(key);

        let val = this.getBinhType(cards);
        this.cacheType.set(key, val);
        return val;
    }

    // ================= TYPE =================

    countByRank(cards) {
        let map = {};
        for (let c of cards) {
            let r = this.getRank(c);
            map[r] = (map[r] || 0) + 1;
        }
        return map;
    }

    isFlush(cards) {
        let suit = cards[0] % 4;
        return cards.every(c => c % 4 === suit);
    }

    isStraight(cards) {
        let ranks = [...new Set(cards.map(c => this.getRank(c)))].sort((a,b)=>a-b);
        if (ranks.length !== cards.length) return false;

        // A2345
        if (JSON.stringify(ranks) === JSON.stringify([1,2,3,4,13])) return true;

        return ranks[ranks.length - 1] - ranks[0] === cards.length - 1;
    }

    getBinhType(cards) {
        let len = cards.length;
        let map = this.countByRank(cards);
        let counts = Object.values(map).sort((a,b)=>b-a);

        let maxRank = Math.max(...cards.map(c=>this.getRank(c)));

        // ===== CHI 3 LÁ =====
        if (len === 3) {
            if (counts[0] === 3) return { name:"Xám", hang:27, diem:maxRank };
            if (counts[0] === 2) return { name:"Đôi", hang:3, diem:maxRank };
            return { name:"Mậu Thầu", hang:1, diem:maxRank };
        }

        // ===== CHI 5 LÁ =====
        let flush = this.isFlush(cards);
        let straight = this.isStraight(cards);

        if (flush && straight) return { name:"TPS", hang:6561, diem:maxRank };
        if (counts[0] === 4) return { name:"Tứ Quý", hang:2187, diem:maxRank };
        if (counts[0] === 3 && counts[1] === 2) return { name:"Cù Lũ", hang:729, diem:maxRank };
        if (flush) return { name:"Thùng", hang:243, diem:maxRank };
        if (straight) return { name:"Sảnh", hang:81, diem:maxRank };
        if (counts[0] === 3) return { name:"Xám", hang:27, diem:maxRank };
        if (counts[0] === 2 && counts[1] === 2) return { name:"Thú", hang:9, diem:maxRank };
        if (counts[0] === 2) return { name:"Đôi", hang:3, diem:maxRank };

        return { name:"Mậu Thầu", hang:1, diem:maxRank };
    }

    // ================= BAO BINH =================

    check6Doi(cards) {
        let map = {};
        for (let c of cards) {
            let r = this.getRank(c);
            map[r] = (map[r] || 0) + 1;
        }
        let pairs = 0;
        for (let r in map) pairs += Math.floor(map[r] / 2);
        return pairs >= 6;
    }

    checkSanhRong(cards) {
        let set = new Set(cards.map(c => this.getRank(c)));
        return set.size === 13;
    }

    checkDongHoa(cards) {
        let isRed = cards.every(c => (c % 4 === 2 || c % 4 === 3));
        let isBlack = cards.every(c => (c % 4 === 0 || c % 4 === 1));
        return isRed || isBlack;
    }

    analyze_cards(card) {
        return {
            sort: { card: card }
        };
    }

    // ================= MAIN =================

    getData(limit = 50) {
        let cards = [...this.card];
        let results = [];

        let comb5 = this.getCombinations(cards, 5);

        for (let c1 of comb5) {
            let remain1 = cards.filter(x => !c1.includes(x));

            let comb5_2 = this.getCombinations(remain1, 5);

            for (let c2 of comb5_2) {
                let c3 = remain1.filter(x => !c2.includes(x));

                let chi1 = this.fastType(c3); // 3 lá
                let chi2 = this.fastType(c1);
                let chi3 = this.fastType(c2);

                // ❌ binh lủng
                if (!(chi1.hang <= chi2.hang && chi2.hang <= chi3.hang)) continue;

                let score =
                    chi3.hang * 1e6 +
                    chi2.hang * 1e3 +
                    chi1.hang +
                    chi3.diem * 100 +
                    chi2.diem * 10 +
                    chi1.diem;

                results.push({
                    chi: [
                        { card: c3, ...chi1 },
                        { card: c1, ...chi2 },
                        { card: c2, ...chi3 }
                    ],
                    score
                });
            }
        }

        results.sort((a, b) => b.score - a.score);

        // lọc trùng
        let filtered = [];
        let seen = new Set();

        for (let r of results) {
            let key = r.chi.map(c => c.hang).join("|");
            if (!seen.has(key)) {
                filtered.push(r);
                seen.add(key);
            }
            if (filtered.length >= limit) break;
        }

        // format output
        let xepbai = filtered.map(r => ([
            { card: r.chi[2].card, binh: r.chi[2].name, hang: r.chi[2].hang, diem: r.chi[2].diem },
            { card: r.chi[1].card, binh: r.chi[1].name, hang: r.chi[1].hang, diem: r.chi[1].diem },
            { card: r.chi[0].card, binh: r.chi[0].name, hang: r.chi[0].hang, diem: r.chi[0].diem }
        ]));

        // ===== bao binh =====
        let bao = [];
        if (this.checkSanhRong(cards)) bao.push({ loai: "Sảnh rồng" });
        else if (this.checkDongHoa(cards)) bao.push({ loai: "Đồng hoa" });
        else if (this.check6Doi(cards)) bao.push({ loai: "Lục phé bôn" });

        return {
            xepbai,
            best: xepbai[0],
            top: xepbai.slice(0, 5),
            maubinh: bao,
            sapxep: this.analyze_cards(cards)
        };
    }
}


function solveMauBinh(cardIds, limit = 50) {
  let xb = new XepBaiBinh(cardIds);
  let res = xb.getData();
  let solutions = res.xepbai.map((x) => ({
    chi1: {
      cards: x[2].card.map((id) => getCard(id).name),
      cardIds: x[2].card,
      loai: x[2].binh,
      score: [x[2].diem || 0],
    },
    chi2: {
      cards: x[1].card.map((id) => getCard(id).name),
      cardIds: x[1].card,
      loai: x[1].binh,
      score: [x[1].diem || 0],
    },
    chi3: {
      cards: x[0].card.map((id) => getCard(id).name),
      cardIds: x[0].card,
      loai: x[0].binh,
      score: [x[0].diem || 0],
    },
  }));
  solutions.maubinh = res.maubinh;
  solutions.sapxep = res.sapxep;
  return solutions;
}

const VALUES = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
const SUITS = ["♠", "♣", "♦", "♥"];
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
  cardIds.forEach((id) => cardKnowledge.add(id));
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

const exportObj = {
  solveMauBinh,
  getCard,
  XepBaiBinh,
  resetGuestTracker,
  updateKnowledge,
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = exportObj;
}
