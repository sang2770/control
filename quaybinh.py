# uncompyle6 version 3.9.3
# Python bytecode version base 3.8.0 (3413)
# Decompiled from: Python 3.11.13 (main, Jun  3 2025, 18:38:25) [Clang 17.0.0 (clang-1700.0.13.3)]
# Embedded file name: xepbaibinh.py
import numpy as np
from itertools import combinations
import copy
from itertools import product

class XepBaiBinh:
    Bich = [
     0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52]
    Chuong = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53]
    Ro = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54]
    Co = [3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55]
    mauden = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 1, 5, 9, 13, 
     17, 21, 25, 29, 33, 37, 41, 45, 49, 52, 53]
    maudo = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 3, 7, 11, 15, 
     19, 23, 27, 31, 35, 39, 43, 47, 51, 54, 55]

    def __init__(self, card):
        card.sort()
        self.card = card

    def getTPS(self, card):
        card = card.copy()
        arrTPS = []
        for i in range(len(card)):
            if card[i] < 4:
                card.append(card[i] + 52)
            for i in range(len(card) - 1):
                j = i + 1
                start = i
                tps = [card[start]]

            if j < len(card):
                if len(tps) == 5:
                    break
                if card[j] - card[start] == 4:
                    tps.append(card[j])
                    start = j
                j += 1
            else:
                if len(tps) == 5:
                    arrTPS.append(tps)
                arrTPS.reverse()
                return arrTPS

    def getCuLu(self, card):
        arrCuLu = []
        arrXam = self.getDoiXamQui(card, 3)
        arrDoi = self.getDoiXamQui(card, 2)
        for xam in arrXam:
            for doi in arrDoi:
                if not any((c in xam for c in doi)):
                    arrCuLu.append(xam + doi)
            else:
                arrCuLu = np.unique(arrCuLu, axis=0).tolist()
                arrCuLu.sort(reverse=True)
                return arrCuLu

    def getThung(self, card, length=5):
        arrThung = []
        card = card.copy()
        for i in range(len(card)):
            if card[i] < 4:
                card[i] += 52
            for suit_cards in (
             self.Bich, self.Chuong, self.Ro, self.Co):
                suit_cards_in_hand = [c for c in card if c in suit_cards]
                if len(suit_cards_in_hand) >= length:
                    for comb in combinations(suit_cards_in_hand, length):
                        arrThung.append(list(comb))

                def get_thung_rank_key(comb):
                    ranks = [c % 52 // 4 for c in comb]
                    ranks = [13 if r == 0 else r for r in ranks]
                    ranks.sort(reverse=True)
                    return tuple(ranks)

                arrThung.sort(key=get_thung_rank_key, reverse=True)
                for comb in arrThung:
                    for i in range(len(comb)):
                        if comb[i] > 51:
                            comb[i] -= 52
                    else:
                        return arrThung

    def getThungOldParse error at or near `BUILD_LIST_0' instruction at offset 0

    def getSanh(self, card, length=5):
        arrSanh = []
        card = card.copy()
        rank_map = {}
        for c in card:
            r = c % 52 // 4
            rank_map.setdefault(r, []).append(c)
        else:
            ranks = sorted(rank_map.keys())
            if 0 in ranks:
                rank_map[13] = rank_map[0][None[:None]]
                ranks.append(13)
            for i in range(len(ranks) - (length - 1)):
                seq = ranks[i[:i + length]]
                if seq[-1] - seq[0] == length - 1:
                    for combo in product(*(rank_map[r] for r in seq)):
                        arrSanh.append(list(combo))
                    else:
                        has_A = 0 in ranks

                    if has_A and all((r in ranks for r in (9, 10, 11, 12))):
                        seq = [
                         9, 10, 
                         11, 12, 0]
                        for combo in product(*(rank_map[r] for r in seq)):
                            arrSanh.append(list(combo))

                else:

                    def get_max_rank(seq):
                        r = [c % 52 // 4 for c in seq]
                        if set(r) == {9, 10, 11, 12, 0}:
                            return 13
                        if set(r) == {0, 1, 2, 3, 4}:
                            return 4
                        return max(r)

                    arrSanh.sort(key=get_max_rank, reverse=True)
                    return arrSanh

    def getXam(self, card):
        for i in range(len(card)):
            if card[i] < 4:
                card[i] = card[i] + 52
            card.sort()
            arrXam = []
            for i in range(len(card) - 1):
                j = i + 1
                start = i
                xam = [card[start]]

            if j < len(card):
                if len(xam) == 3:
                    break
                if card[j] // 4 == card[start] // 4:
                    xam.append(card[j])
                    start = j
                j += 1
            else:
                if len(xam) == 3:
                    if xam[0] // 4 == xam[1] // 4 == xam[2] // 4:
                        arrXam.append(xam)
                arrXam.reverse()
                return arrXam

    def getDoiXamQuiParse error at or near `LOAD_FAST' instruction at offset 0

    def getThu(self, card):
        card = card.copy()
        arrThu = []
        arrDoi = self.getDoiXamQui(card, 2)
        for i in range(len(arrDoi) - 1):
            j = i + 1
            while True:
                if j < len(arrDoi):
                    thu = arrDoi[i] + arrDoi[j]
                    thu.sort()
                    if thu not in arrThu:
                        if len(list(set(arrDoi[i]) - set(arrDoi[j]))) == 2:
                            arrThu.append(thu)
                    j += 1

        else:
            arrThu = np.unique(arrThu, axis=0).tolist()
            arrThu.reverse()
            return arrThu

    def getMauThau(self, card):
        for i in range(len(card)):
            if card[i] < 4:
                card[i] = card[i] + 52
            card.sort()
            for i in range(len(card)):
                if card[i] > 51:
                    card[i] = card[i] - 52
                return card

    def check6Doi(self, binh):
        countDoi = []
        card = binh[0]["card"] + binh[1]["card"] + binh[2]["card"]
        for i in range(len(card) - 1):
            j = i + 1
            while True:
                if j < len(card):
                    if card[i] // 4 == card[j] // 4:
                        if card[i] not in countDoi:
                            if card[j] not in countDoi:
                                countDoi += [card[i], card[j]]
                    j += 1

        else:
            if len(countDoi) == 12:
                return True
            return False

    def checkSanhRong(self, card):
        tmp = card.copy()
        tmp = map(self.arrbai, tmp)
        tmp = list(tmp)
        if 1 in tmp:
            if 2 in tmp:
                if 3 in tmp:
                    if 4 in tmp:
                        if 5 in tmp:
                            if 6 in tmp:
                                if 7 in tmp:
                                    if 8 in tmp:
                                        if 9 in tmp:
                                            if 10 in tmp:
                                                if 11 in tmp:
                                                    if 12 in tmp:
                                                        if 13 in tmp:
                                                            return True
        return False

    def arrbai(self, n):
        if 0 <= n:
            if n <= 3:
                return 1
            else:
                if 4 <= n:
                    if n <= 7:
                        return 2
                    else:
                        if 8 <= n:
                            if n <= 11:
                                return 3
                        elif 12 <= n:
                            if n <= 15:
                                return 4
                        if 16 <= n and n <= 19:
                            return 5
                        if 20 <= n and n <= 23:
                            return 6
                    if 24 <= n:
                        if n <= 27:
                            return 7
                elif 28 <= n:
                    if n <= 31:
                        return 8
                if 32 <= n and n <= 35:
                    return 9
                if 36 <= n and n <= 39:
                    return 10
            if 40 <= n:
                if n <= 43:
                    return 11
        elif 44 <= n:
            if n <= 47:
                return 12
        if 48 <= n and n <= 51:
            return 13

    def checkDongHoa(self, card):
        red = self.check_multi_values(self.mauden, card)
        black = self.check_multi_values(self.maudo, card)
        if red == True or black == True:
            return True
        return False

    def check_multi_values(self, arr, values):
        for value in values:
            if value not in arr:
                return                 return False
            return True

    def checkSanhRongDongHoa(self, card):
        if self.checkDongHoa(card) == True:
            if self.checkSanhRong(card) == True:
                return True
        return False

    def getAllBinh(self):
        arrXep = []
        arrTPS = self.getTPS(self.card.copy())
        for i, x in enumerate(arrTPS):
            arrXep.append({'card':x, 
             'binh':"Thùng Phá Sảnh", 
             'hang':6561, 
             'diem':(arrTPS[i][len(arrTPS[i]) - 1]) // 4})
        else:
            arrTuQui = self.getDoiXamQui(self.card.copy(), 4)
            for i, x in enumerate(arrTuQui):
                arrXep.append({'card':x, 
                 'binh':"Tứ Quí", 
                 'hang':2187, 
                 'diem':(arrTuQui[i][len(arrTuQui[i]) - 1]) // 4})
            else:
                arrCuLu = self.getCuLu(self.card.copy())
                for i, x in enumerate(arrCuLu):
                    arrXep.append({'card':x, 
                     'binh':"Cù Lũ", 
                     'hang':729, 
                     'diem':(arrCuLu[i][0]) // 4})
                else:
                    arrThung = self.getThung(self.card.copy())
                    for i, x in enumerate(arrThung):
                        arrXep.append({'card':x, 
                         'binh':"Thùng", 
                         'hang':243, 
                         'diem':arrThung[i][len(arrThung[i]) - 1]})
                    else:
                        arrSanh = self.getSanh(self.card.copy())
                        for i, x in enumerate(arrSanh):
                            arrXep.append({'card':x, 
                             'binh':"Sảnh", 
                             'hang':81, 
                             'diem':arrSanh[i][len(arrSanh[i]) - 1]})
                        else:
                            arrXam = self.getDoiXamQui(self.card.copy(), 3)
                            for i, x in enumerate(arrXam):
                                arrXep.append({'card':x, 
                                 'binh':"Xám", 
                                 'hang':27, 
                                 'diem':arrXam[0][0]})
                            else:
                                arrThu = self.getThu(self.card.copy())
                                for i, x in enumerate(arrThu):
                                    arrXep.append({'card':x, 
                                     'binh':"Thú", 
                                     'hang':9, 
                                     'diem':arrThu[i][len(arrThu[i]) - 1]})
                                else:
                                    arrDoi = self.getDoiXamQui(self.card.copy(), 2)
                                    for i, x in enumerate(arrDoi):
                                        arrXep.append({'card':x, 
                                         'binh':"Đôi", 
                                         'hang':3, 
                                         'diem':arrDoi[i][0]})
                                    else:
                                        for i in range(len(arrXep)):
                                            for j in range(len(arrXep[i]["card"])):
                                                if arrXep[i]["card"][j] > 51:
                                                    arrXep[i]["card"][j] = arrXep[i]["card"][j] - 52
                                            else:
                                                arrMau = self.getMauThau(self.card)
                                                return arrXep

    def getData(self):
        arrXep = []
        arrTPS = self.getTPS(self.card.copy())
        heso = 60
        for i, x in enumerate(arrTPS):
            arrXep.append({'card':x, 
             'binh':"Thùng Phá Sảnh", 
             'hang':heso * 2187, 
             'diem':(arrTPS[i][len(arrTPS[i]) - 1]) // 4})
        else:
            arrTuQui = self.getDoiXamQui(self.card.copy(), 4)
            for i, x in enumerate(arrTuQui):
                arrXep.append({'card':x, 
                 'binh':"Tứ Quí", 
                 'hang':heso * 729, 
                 'diem':(arrTuQui[i][len(arrTuQui[i]) - 1]) // 4})
            else:
                arrCuLu = self.getCuLu(self.card.copy())
                for i, x in enumerate(arrCuLu):
                    arrXep.append({'card':x, 
                     'binh':"Cù Lũ", 
                     'hang':heso * 243, 
                     'diem':(arrCuLu[i][0]) // 4})
                else:
                    arrThung = self.getThung(self.card.copy())
                    for i, x in enumerate(arrThung):
                        arrXep.append({'card':x, 
                         'binh':"Thùng", 
                         'hang':heso * 81, 
                         'diem':arrThung[i][len(arrThung[i]) - 1]})
                    else:
                        arrSanh = self.getSanh(self.card.copy())
                        for i, x in enumerate(arrSanh):
                            arrXep.append({'card':x, 
                             'binh':"Sảnh", 
                             'hang':heso * 27, 
                             'diem':arrSanh[i][len(arrSanh[i]) - 1]})
                        else:
                            arrXam = self.getDoiXamQui(self.card.copy(), 3)
                            for i, x in enumerate(arrXam):
                                arrXep.append({'card':x, 
                                 'binh':"Xám", 
                                 'hang':heso * 9, 
                                 'diem':arrXam[0][0]})
                            else:
                                arrThu = self.getThu(self.card.copy())
                                for i, x in enumerate(arrThu):
                                    arrXep.append({'card':x, 
                                     'binh':"Thú", 
                                     'hang':heso * 3, 
                                     'diem':arrThu[i][len(arrThu[i]) - 1]})
                                else:
                                    arrDoi = self.getDoiXamQui(self.card.copy(), 2)
                                    for i, x in enumerate(arrDoi):
                                        arrXep.append({'card':x, 
                                         'binh':"Đôi", 
                                         'hang':heso * 1, 
                                         'diem':arrDoi[i][0]})
                                    else:
                                        for i in range(len(arrXep)):
                                            for j in range(len(arrXep[i]["card"])):
                                                if arrXep[i]["card"][j] > 51:
                                                    arrXep[i]["card"][j] = arrXep[i]["card"][j] - 52
                                            else:
                                                arrMau = self.getMauThau(self.card)
                                                arrBinh = []
                                                for idx_combo in combinations(range(len(arrXep)), 3):
                                                    i, j, k = idx_combo
                                                    b1 = arrXep[i]
                                                    b2 = arrXep[j]
                                                    b3 = arrXep[k]
                                                    binh = [
                                                     copy.deepcopy(b1)]
                                                    if not any((c in b1["card"] for c in b2["card"])):
                                                        binh.append(copy.deepcopy(b2))
                                                    if len(binh) == 2:
                                                        used = set(b1["card"] + b2["card"])
                                                        if not any((c in used for c in b3["card"])):
                                                            binh.append(copy.deepcopy(b3))
                                                        if len(binh) < 3:
                                                            binh.append({'card':[],  'binh':"Mậu Thầu", 
                                                             'hang':1, 
                                                             'diem':0})
                                                    else:
                                                        arrMauCopy = arrMau.copy()
                                                        binh = copy.deepcopy(binh)
                                                        used = binh[0]["card"] + binh[1]["card"] + binh[2]["card"]
                                                        self.fillChi(binh[0], arrMauCopy, used, 5)
                                                        used += binh[0]["card"]
                                                        self.fillChi(binh[1], arrMauCopy, used, 5)
                                                        used += binh[1]["card"]
                                                        self.fillChi(binh[2], arrMauCopy, used, 3)
                                                        if binh[0]["binh"] == binh[1]["binh"] and not binh[0]["binh"] == "Sảnh":
                                                            if binh[0]["binh"] == "Thùng":
                                                                if len(self.getThung(binh[2]["card"], 3)) > 0 or len(self.getSanh(binh[2]["card"], 3)) > 0:
                                                                    binh[0]["hang"] = 131220
                                                                    binh[1]["hang"] = 131220
                                                                    binh[2]["hang"] = 131220
                                                                    binh[2]["binh"] = binh[1]["binh"]
                                                        arrBinh.append([
                                                         {'card':(binh[0]["card"].copy)(), 
                                                          'binh':binh[0]["binh"], 
                                                          'hang':binh[0]["hang"], 
                                                          'diem':binh[0]["diem"]},
                                                         {'card':(binh[1]["card"].copy)(), 
                                                          'binh':binh[1]["binh"], 
                                                          'hang':binh[1]["hang"], 
                                                          'diem':binh[1]["diem"]},
                                                         {'card':(binh[2]["card"].copy)(), 
                                                          'binh':binh[2]["binh"], 
                                                          'hang':binh[2]["hang"], 
                                                          'diem':binh[2]["diem"]}])
                                                else:
                                                    sorted_binh = sorted(arrBinh,
                                                      key=(lambda x: (
                                                     x[0]["hang"] + x[1]["hang"] + x[2]["hang"],
                                                     x[0]["hang"],
                                                     x[1]["hang"],
                                                     x[2]["diem"])),
                                                      reverse=True)
                                                    arrBaoBinh = []
                                                    arrKetQuaFilter = []
                                                    count = 0
                                                    for i, binh in enumerate(sorted_binh):
                                                        isCungDiem = False

            for binhfl in arrKetQuaFilter:
                if binh[0]["hang"] == binhfl[0]["hang"]:
                    if binh[1]["hang"] == binhfl[1]["hang"] and binh[2]["hang"] == binhfl[2]["hang"]:
                        isCungDiem = True
                    if count < 4 and isCungDiem == False:
                        arrKetQuaFilter.append(binh)
                        count += 1
                return {'xepbai':arrKetQuaFilter,  'maubinh':arrBaoBinh, 
                 'sapxep':(self.analyze_cards)(self.card.copy())}

    def fillChi(self, binh_i, arrMau, used, limit):
        """
        binh_i: dict {'card': [...], 'diem': ...}
        arrMau: toàn bộ bài còn lại
        used: các lá đã dùng ở chi khác
        limit: số lá cần fill (5 cho chi 1,2 và 3 cho chi 3)
        """
        arrCopyMau = [c for c in arrMau if c not in used]
        while len(binh_i["card"]) < limit:
            if arrCopyMau:
                if len(binh_i["card"]) == 0:
                    cardMT = arrCopyMau.pop()
                    binh_i["card"].append(cardMT)
                    binh_i["diem"] = cardMT
            else:
                cardMT = arrCopyMau.pop(0)
                binh_i["card"].append(cardMT)

    def getBinh(self, card):
        if len(self.getTPS(card)) > 0:
            return "Thùng Phá Sảnh"
        if len(self.getDoiXamQui(card, 4)):
            return "Tứ Quí"
        if len(self.getCuLu(card)) > 0:
            return "Cù Lũ"
        arrThung = self.getThung(card)
        for thung in arrThung:
len(thung) == len(card)            return "Thùng"
        else:
            arrSanh = self.getSanh(card)

        for sanh in arrSanh:
            if len(sanh) == len(card):
                return                 return "Sảnh"
            if len(self.getDoiXamQui(card, 3)):
                return "Xám"
            if len(self.getThu(card)):
                return "Thú"
            if len(self.getDoiXamQui(card, 2)):
                return "Đôi"
            return "Mậu Thầu"

    def has_two_distinct_pairs(self, arrDoi):
        ranks = [pair[0] // 4 + 1 for pair in arrDoi]
        unique_ranks = set(ranks)
        return len(unique_ranks) >= 6

    def analyze_cards(self, card, length=5):
        arrThung = self.getThung(card, 5)
        arrSanh = self.getSanh(card, 5)
        arrTQ = self.getDoiXamQui(card, 4)
        arrXam = self.getDoiXamQui(card, 3)
        arrDoi = self.getDoiXamQui(card, 2)
        arrMau = sorted([x + 52 if (0 <= x <= 3) else x for x in self.getMauThau(card)], reverse=True)
        is6Doi = self.has_two_distinct_pairs(arrDoi)

        def build_sequence(priority_groups, fallback, skip_check_overlap=True):
            seen = set()
            result = []
            for g in priority_groups:
                if skip_check_overlap and any(((c - 52 if c > 51 else c) in seen for c in g)):
                    pass
                else:
                    for c in g:
                        base = c - 52 if c > 51 else c
                        if base not in seen:
                            seen.add(base)
                            result.append(c)
                            if len(result) == 13:
                                return result
                    else:
                        for c in fallback:
                            base = c - 52 if c > 51 else c
                            if base not in seen:
                                seen.add(base)
                                result.append(c)
                                if len(result) == 13:
                                    return result
                            return result[None[:13]]

        sort_card = build_sequence((arrTQ + arrXam + arrDoi), arrMau, skip_check_overlap=True)
        thung_card = build_sequence((arrThung + arrXam + arrDoi), arrMau, skip_check_overlap=False)
        sanh_card = build_sequence((arrSanh + arrXam + arrDoi), arrMau, skip_check_overlap=True)

        def remove_duplicate_aces(cards):
            seenA = set()
            cleaned = []
            for c in cards:
                base = c - 52 if c > 51 else c
                if base in (0, 1, 2, 3):
                    if base in seenA:
                        pass
                    else:
                        seenA.add(base)
                cleaned.append(base)
            else:
                return cleaned

        return {'sort':{'card':remove_duplicate_aces(sort_card), 
          'baobinh':is6Doi}, 
         'thung':{"card": (remove_duplicate_aces(thung_card))}, 
         'sanh':{"card": (remove_duplicate_aces(sanh_card))}}


def parse_cards(card_str):
    rank_map = {
     '1': 1, , '2': 2, , '3': 3, , '4': 4, , '5': 5, 
     '6': 6, , '7': 7, , '8': 8, , '9': 9, , '10': 10, 
     'j': 11, , 'q': 12, , 'k': 13}
    suit_map = {
     'b': 0, 
     't': 1, 
     'd': 2, 
     'c': 3}
    result = []
    cards = card_str.lower().split(",")
    for card in cards:
        rank_part = card[None[:-1]]
        suit_part = card[-1]
        rank = rank_map[rank_part]
        suit = suit_map[suit_part]
        card_id = (rank - 1) * 4 + suit
        result.append(card_id)
    else:
        return result


def unparse_cards(card_ids):
    rank_map = {
     1: '"1"', , 2: '"2"', , 3: '"3"', , 4: '"4"', , 5: '"5"', 
     6: '"6"', , 7: '"7"', , 8: '"8"', , 9: '"9"', , 10: '"10"', 
     11: '"j"', , 12: '"q"', , 13: '"k"'}
    suit_map = {
     0: '"b"', 
     1: '"t"', 
     2: '"d"', 
     3: '"c"'}
    result = []
    for card_id in card_ids:
        card_id = int(card_id)
        rank = card_id // 4 + 1
        suit = card_id % 4
        card_str = rank_map[rank] + suit_map[suit]
        result.append(card_str)
    else:
        return ",".join(result)