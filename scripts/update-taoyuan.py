"""Refresh a small attributed Taoyuan dinner snapshot from official open data.

Run manually: python scripts/update-taoyuan.py
Only pages 1-3 are selected; this is a starter list, not a citywide directory.
"""
import concurrent.futures
import datetime
import html
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://travel.tycg.gov.tw/open-api/zh-tw/Shop/Consume?regions=taoyuan&page='

def download_json(page):
    request = urllib.request.Request(BASE + str(page), headers={'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.load(response)
    return data['Infos']['Info']

def get_name(row):
    if row.get('Name'):
        return row
    # The official API currently omits some names. Use the matching official
    # detail page's title; never guess a name from an address or photograph.
    with urllib.request.urlopen('https://' + row['TYWebsite'], timeout=20) as response:
        page = response.read().decode('utf-8')
    match = re.search(r'<title>(.*?)</title>', page, re.I | re.S)
    if not match:
        raise ValueError('Missing official name for ' + row['Id'])
    row['Name'] = html.unescape(match[1]).strip().split(' | ')[0]
    return row

def build(rows):
    places = []
    for row in rows:
        name = row.get('Name', '')
        if not name or re.search(r'會館|飯店|廣場|商圈|夜市|蛋糕|糕餅|烘焙|伴手禮|手信|茶行|茶莊|豆干|豆乾|冰店|冰品|咖啡|禮坊|麵包|餅舖|餅店|果舖|甜點|手工皂|電玩|夢工廠|花生糖|正記中崎|郭祿食品|郭記名點|Egogo|果樹園', name):
            continue
        lat, lon = float(row['North-Latitude']), float(row['East-Longitude'])
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        category = '鍋物' if re.search(r'鍋|涮', name) else '日韓' if re.search(r'壽司|日式|韓|丼', name) else '麵類' if re.search(r'麵|米粉|米干|餛飩', name) else '飯類' if re.search(r'飯|便當|自助餐', name) else '西式' if re.search(r'義式|牛排|美式|披薩', name) else '其他'
        address = row.get('Address', '')
        if '桃園市' not in address:
            address = '桃園市' + row.get('District', '桃園區') + address
        places.append({'id': 'tycg:' + row['Id'], 'name': name, 'lat': lat, 'lon': lon, 'address': address, 'category': category, 'price': None, 'openingHours': row.get('Open-Time', ''), 'menu': '', 'source': 'tycg', 'sourceUrl': 'https://' + row['TYWebsite'], 'snapshotDate': datetime.date.today().isoformat()})
    return {'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'source': '桃園市政府觀光旅遊局／桃園觀光導覽網', 'license': '政府資料開放授權條款-第1版', 'dataset': 'https://opendata.tycg.gov.tw/datalist/8dc035f1-0770-4522-8c98-96d98bb0530e', 'coverage': '桃園區官方美食資料前 3 頁，排除部分非正餐場所；不是全市完整清單。', 'places': places}

if __name__ == '__main__':
    rows = []
    for page in (1, 2, 3):
        rows.extend(download_json(page))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        rows = list(executor.map(get_name, rows))
    result = build(rows)
    (ROOT / 'taoyuan-dinner.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Saved', len(result['places']), 'verified official entries to taoyuan-dinner.json')
