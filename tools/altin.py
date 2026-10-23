"""Truncgil Finans'tan altın fiyatlarını çekip prices.json olarak yazar.

GitHub Actions tarafından birkaç saatte bir çalıştırılır. Kaynaklardan hiçbiri
düzgün veri vermezse dosyaya dokunmaz; uygulama son bilinen fiyatı kullanmaya devam eder.
"""
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone

OUT = "prices.json"
KEYS = ["ceyrek", "yarim", "tam", "gram", "bilezik22"]

# (adres, kök nesneyi bulan fonksiyon, bizim anahtar -> kaynak anahtar, alış alanları, satış alanları)
SOURCES = [
    ("https://finans.truncgil.com/v4/today.json", lambda j: j,
     {"ceyrek": "CEYREKALTIN", "yarim": "YARIMALTIN", "tam": "TAMALTIN", "gram": "GRA", "bilezik22": "YIA"},
     ["Buying", "buying"], ["Selling", "selling"]),
    ("https://finance.truncgil.com/api/today.json", lambda j: j.get("Rates", j),
     {"ceyrek": "CEYREKALTIN", "yarim": "YARIMALTIN", "tam": "TAMALTIN", "gram": "GRA", "bilezik22": "YIA"},
     ["Buying", "buying"], ["Selling", "selling"]),
    ("https://finans.truncgil.com/today.json", lambda j: j,
     {"ceyrek": "ceyrek-altin", "yarim": "yarim-altin", "tam": "tam-altin", "gram": "gram-altin", "bilezik22": "22-ayar-bilezik"},
     ["Alış", "Alis"], ["Satış", "Satis"]),
]

# Mantıklı aralıklar (TL); bozuk veriyi yayınlamamak için
RANGES = {"ceyrek": (500, 500000), "yarim": (1000, 1000000), "tam": (2000, 2000000), "gram": (100, 200000), "bilezik22": (100, 200000)}


def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    if not isinstance(v, str):
        return None
    s = re.sub(r"[^0-9,.\-]", "", v)
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def pick(obj, names):
    for n in names:
        if isinstance(obj, dict) and n in obj:
            return num(obj[n])
    return None


def source_date(j):
    for k in ("Update_Date", "update_date", "Meta_Data"):
        v = j.get(k) if isinstance(j, dict) else None
        if isinstance(v, dict):
            v = v.get("Update_Date") or v.get("Current_Date")
        if isinstance(v, str):
            m = re.match(r"(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(:\d{2})?)", v)
            if m:
                t = m.group(2) if m.group(3) else m.group(2) + ":00"
                return m.group(1) + "T" + t + "+03:00"
    return None


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "dugun-plani/1.0 (kisisel kullanim)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def try_source(url, root, keymap, buy_f, sell_f):
    j = fetch(url)
    base = root(j)
    items = {}
    for k in KEYS:
        o = base.get(keymap[k]) if isinstance(base, dict) else None
        b, s = pick(o, buy_f), pick(o, sell_f)
        lo, hi = RANGES[k]
        if not b or not s or not (lo <= b <= hi) or not (lo <= s <= hi):
            raise ValueError(f"{k} için geçerli fiyat yok ({b}, {s})")
        items[k] = {"buy": round(b, 2), "sell": round(s, 2)}
    return {"source": "Truncgil Finans", "sourceUrl": url, "sourceDate": source_date(j) or source_date(base),
            "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "items": items}


def main():
    errors = []
    for src in SOURCES:
        try:
            data = try_source(*src)
        except Exception as e:  # bir sonraki kaynağı dene
            errors.append(f"{src[0]}: {e}")
            continue
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("Yazıldı:", json.dumps(data["items"], ensure_ascii=False))
        return 0
    print("Hiçbir kaynaktan geçerli fiyat alınamadı:\n" + "\n".join(errors), file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
