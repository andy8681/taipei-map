import json
import os
def safe_int(val):
    if val is None: return 0
    s = str(val).replace(',', '').strip()
    if s == 'None' or s == '': return 0
    try: return int(s)
    except: return 0
# 檔案路徑設定 (已更新為您的實際資料夾位置)
DATA_DIR = r"C:\Users\ecdes\Desktop\工作\程式\台北市\taipei-map\src\data"

FILES = {
    'enrollment': '1141219-子計畫一 各類型教保服務機構入園人數統計表.json',
    'institution': '1141219-子計畫一各類型教保服務機構數量統計表.json',
    'population': '1141219-子計畫學齡前設籍人數與增減趨勢.json'
}

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"找不到檔案，請確認路徑與檔名: {path}")
        return None
    with open(path, 'r', encoding='utf-8-sig') as f: # 加入 utf-8-sig 防範BOM
        return json.load(f)

def generate_summary():
    enrollment_data = load_json(FILES['enrollment'])
    inst_data = load_json(FILES['institution'])
    pop_data = load_json(FILES['population'])
    
    print("====== 終端機輸出總結：臺北市與大安區供需數據 (112-114學年度) ======\n")
    
    # 1. 處理機構數量與公共化佔比
    print("[一、機構數與公共化佔比]")
    if inst_data:
        for target in ["台北市", "大安區"]: # 配合資料可能的 key 名稱
            # 尋找對應的 key (可能包含臺或台)
            target_key = next((k for k in inst_data.keys() if target.replace('台', '臺') in k or target.replace('臺', '台') in k), None)
            if target_key:
                print(f"--- {target} ---")
                for row in inst_data[target_key]:
                    year = str(row.get('學年度', '')).replace('年', '')
                    if year in ['112', '113', '114']:
                        print(f"{year}學年度: 總機構數 {row.get('合計', 0)} 所, 公共化占比 {row.get('公共化占比', '-')} (公立{row.get('公立',0)}/非營利{row.get('非營利',0)}/準公共{row.get('準公共',0)}/私立{row.get('私立',0)}/教保中心{row.get('教保中心',0)})")
            print("")

    # 2. 處理人口趨勢
    print("[二、學齡前設籍人口與增減趨勢]")
    if pop_data:
        print("--- 臺北市 ---")
        taipei_pop = pop_data.get('taipei_city_total', [])
        for row in taipei_pop:
            year = str(row.get('year', ''))
            if year in ['112', '113', '114']:
                print(f"{year}學年度: 總人數 {row.get('total', 0)} 人, 增減率 {row.get('growth_rate', '-')} %")
        
        print("--- 大安區 ---")
        daan_pop = pop_data.get('districts', {}).get('大安區', [])
        for row in daan_pop:
            year = str(row.get('year', ''))
            if year in ['112', '113', '114']:
                print(f"{year}學年度: 總人數 {row.get('total', 0)} 人, 增減率 {row.get('growth_rate', '-')} %")
        print("")

    # 3. 處理供給與招生概況
    print("[三、核定招收與實際在園人數 (不分機構別加總)]")
    if enrollment_data:
        for target in ["臺北市", "大安區"]:
            print(f"--- {target} ---")
            for year in ['112', '113', '114']:
                # 篩選年份
                year_data = [d for d in enrollment_data if str(d.get('學年度', '')).replace('年', '') == year]
                
                # 若為特定行政區，則再篩選行政區
                if target != "臺北市":
                    year_data = [d for d in year_data if target in str(d.get('行政區', ''))]
                else:
                    # 排除不屬於12行政區的雜訊 (若有)
                    valid_districts = ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"]
                    year_data = [d for d in year_data if any(dist in str(d.get('行政區', '')) for dist in valid_districts)]
                
                total_app = sum(safe_int(d.get('核定招生人數', 0)) for d in year_data)
                total_stu = sum(safe_int(d.get('入園人數', 0)) for d in year_data)
                occupancy = round((total_stu / total_app * 100), 2) if total_app > 0 else 0
                
                print(f"{year}學年度: 核定招收 {total_app} 人, 實際在園 {total_stu} 人, 招生率 {occupancy}%")
            print("")
    
    print("==================================================================")

if __name__ == "__main__":
    generate_summary()