#!/usr/bin/env python3
"""
Скрапер официального реестра лицензированных врачей Лекарской палаты Сербии (LKS).
Источник: https://www.lks.org.rs/clanovi-lks
Извлекает: ID, Номер лицензии, Титул, Имя, Фамилию, Специализацию, Срок действия лицензии.
Нормализует имена в сербскую латиницу и кириллицу для сопоставления с базой RuDoctors.
"""

import sys
import os
import json
import ssl
import urllib.request
import re
import fitz  # PyMuPDF

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

LKS_PDF_FILES = [
    ('A-D', 'https://www.lks.org.rs/images/Clanovi/2026/Oktobar/A-D.pdf'),
    ('Dj-J', 'https://www.lks.org.rs/images/Clanovi/2026/Oktobar/Dj-J.pdf'),
    ('K-M', 'https://www.lks.org.rs/images/Clanovi/2026/Oktobar/K-M.pdf'),
    ('N-R', 'https://www.lks.org.rs/images/Clanovi/2026/Oktobar/N-R.pdf'),
    ('S-Sh', 'https://www.lks.org.rs/images/Clanovi/2026/Oktobar/S-Sh.pdf'),
]

# Таблица транслитерации сербской кириллицы в латиницу (Вуковица)
CYR_TO_LAT = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Đ', 'Е': 'E', 'Ж': 'Ž',
    'З': 'Z', 'И': 'I', 'Ј': 'J', 'К': 'K', 'Л': 'L', 'Љ': 'Lj', 'М': 'M', 'Н': 'N',
    'Њ': 'Nj', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'Ћ': 'Ć', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č', 'Џ': 'Dž', 'Ш': 'Š',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ', 'е': 'e', 'ж': 'ž',
    'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n',
    'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'ć', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č', 'џ': 'dž', 'ш': 'š',
}

def cyr_to_lat(text: str) -> str:
    res = []
    for ch in text:
        res.append(CYR_TO_LAT.get(ch, ch))
    return ''.join(res)

def normalize_name(first: str, last: str) -> str:
    """Удаляет диакритики и пробелы для нечёткого поиска"""
    full = f"{first} {last}".lower()
    full = cyr_to_lat(full)
    for c, r in [('č', 'c'), ('ć', 'c'), ('ž', 'z'), ('š', 's'), ('đ', 'dj')]:
        full = full.replace(c, r)
    return re.sub(r'[^a-z0-9]', '', full)

def parse_pdf(stream_data, max_pages=None):
    doc = fitz.open(stream=stream_data, filetype='pdf')
    total_pages = len(doc)
    limit = total_pages if max_pages is None else min(max_pages, total_pages)
    
    records = []
    
    # Регулярное выражение для строки с номером лицензии:
    # 6 цифр ИД, 6 цифр Лицензия, Титул, Имя, Фамилия
    # Пример: 210103 210103 Др мед.  Сандра Аасар 15.11.2024. 15.11.2031.
    entry_re = re.compile(
        r'(\d{5,7})\s+(\d{5,7})\s+([^\d\n]+?)\s+([А-ЯЉЊЋЏЂа-яљњћџђ]+)\s+([А-ЯЉЊЋЏЂа-яљњћџђ]+)\s+(\d{2}\.\d{2}\.\d{4}\.)\s+(\d{2}\.\d{2}\.\d{4}\.)'
    )
    
    for page_num in range(limit):
        text = doc[page_num].get_text()
        matches = entry_re.findall(text)
        for m in matches:
            idb, lic_num, title, first_name, last_name, issued, valid_until = m
            first_lat = cyr_to_lat(first_name.strip())
            last_lat = cyr_to_lat(last_name.strip())
            norm_key = normalize_name(first_lat, last_lat)
            
            records.append({
                'licenseNumber': lic_num,
                'idb': idb,
                'title': title.strip(),
                'nameCyr': f"{first_name.strip()} {last_name.strip()}",
                'nameLat': f"{first_lat} {last_lat}",
                'firstName': first_lat,
                'lastName': last_lat,
                'issued': issued,
                'validUntil': valid_until,
                'normKey': norm_key,
                'authority': 'Lekarska komora Srbije',
                'verified': True
            })
            
    return records

def main():
    quick_mode = '--quick' in sys.argv
    max_pages = 5 if quick_mode else None
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(script_dir, '..', 'src', 'data', 'sources', 'serbian')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'lks-licenses-index.json')
    
    all_licenses = {}
    total_parsed = 0
    
    files_to_process = LKS_PDF_FILES[:2] if quick_mode else LKS_PDF_FILES
    
    for label, url in files_to_process:
        print(f"[*] Скачивание и обработка реестра LKS {label} ({url})...")
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30, context=CTX) as resp:
                data = resp.read()
            recs = parse_pdf(data, max_pages=max_pages)
            print(f"    -> Извлечено {len(recs)} лицензий из {label}")
            for r in recs:
                # Индексируем по нормализованному ключу (например, dragancirovic)
                all_licenses[r['normKey']] = r
                # Также индексируем по прямому номеру лицензии
                all_licenses[r['licenseNumber']] = r
            total_parsed += len(recs)
        except Exception as e:
            print(f"    [!] Ошибка при обработке {label}: {e}")
            
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(all_licenses, f, ensure_ascii=False, indent=2)
        
    print(f"[✓] Готово! Всего проиндексировано {total_parsed} записей лицензий LKS.")
    print(f"[✓] Сохранено в: {out_path}")

if __name__ == '__main__':
    main()
