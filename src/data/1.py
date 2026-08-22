import os
import json
import pandas as pd

# ==========================================
# 1. 設定檔案名稱與目標篩選條件
# ==========================================
current_dir = os.path.dirname(os.path.abspath(__file__))

file_enroll = os.path.join(current_dir, '1141219-子計畫一 各類型教保服務機構入園人數統計表.json')
file_pop = os.path.join(current_dir, '1141219-子計畫學齡前設籍人數與增減趨勢.json')
file_inst = os.path.join(current_dir, '1141219-子計畫一各類型教保服務機構數量統計表.json')
file_survey = os.path.join(current_dir, '統計結果_前端專用.json')

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# 鎖定年份與行政區 (統一格式，方便後續比對)
TARGET_YEARS = ['112', '113', '114']
DISTRICTS = ['北投區', '士林區', '內湖區', '中山區', '大同區', '松山區', 
             '萬華區', '中正區', '大安區', '信義區', '南港區', '文山區']

# ==========================================
# 2. 處理資料函數
# ==========================================

# (A) 處理入園率資料
def get_enrollment_data():
    raw_data = load_json(file_enroll)
    records = []
    for d in raw_data:
        year = str(d.get('學年度', '')).replace('年', '').strip()
        dist = str(d.get('行政區', '')).replace('臺', '台').replace('台北市', '臺北市').strip()
        
        # 統一行政區名稱 (把 '台' 轉回 '臺' 以防萬一，並確保在 12 區清單內)
        dist = dist.replace('台', '臺') 
        
        if year in TARGET_YEARS and dist in DISTRICTS:
            app = pd.to_numeric(str(d.get('核定招生人數', '0')).replace(',', ''), errors='coerce')
            stu = pd.to_numeric(str(d.get('入園人數', '0')).replace(',', ''), errors='coerce')
            records.append({'學年度': year, '行政區': dist, '核定招收': app, '實際在園': stu})
    
    df = pd.DataFrame(records).groupby(['學年度', '行政區']).sum().reset_index()
    df['入園率(%)'] = (df['實際在園'] / df['核定招收']) * 100
    return df

# (B) 處理學齡前設籍人數資料
def get_population_data():
    raw_data = load_json(file_pop)
    records = []
    districts_data = raw_data.get('districts', {})
    
    for dist, dist_records in districts_data.items():
        dist_clean = dist.replace('台', '臺').strip()
        if dist_clean in DISTRICTS:
            for d in dist_records:
                year = str(d.get('year', '')).strip()
                if year in TARGET_YEARS:
                    total_pop = pd.to_numeric(str(d.get('total', '0')).replace(',', ''), errors='coerce')
                    records.append({'學年度': year, '行政區': dist_clean, '學齡前設籍人數': total_pop})
                    
    return pd.DataFrame(records)

# (C) 處理機構數與公共化比例資料
def get_institution_data():
    raw_data = load_json(file_inst)
    records = []
    
    for dist_key, dist_records in raw_data.items():
        dist_clean = dist_key.replace('台', '臺').strip()
        if dist_clean in DISTRICTS:
            for d in dist_records:
                year = str(d.get('學年度', '')).replace('年', '').strip()
                if year in TARGET_YEARS:
                    ratio = pd.to_numeric(str(d.get('公共化占比', '0')).replace('%', ''), errors='coerce')
                    records.append({
                        '學年度': year,
                        '行政區': dist_clean,
                        '機構_公立': pd.to_numeric(d.get('公立', 0), errors='coerce'),
                        '機構_非營利': pd.to_numeric(d.get('非營利', 0), errors='coerce'),
                        '機構_準公共': pd.to_numeric(d.get('準公共', 0), errors='coerce'),
                        '機構_教保中心': pd.to_numeric(d.get('教保中心', 0), errors='coerce'),
                        '機構_私立': pd.to_numeric(d.get('私立', 0), errors='coerce'),
                        '機構_合計': pd.to_numeric(d.get('合計', 0), errors='coerce'),
                        '公共化占比(%)': ratio
                    })
                    
    return pd.DataFrame(records)

# (D) 處理問卷滿意度資料 (動態展開所有構面與所有題目)
def get_survey_data():
    raw_data = load_json(file_survey)
    records = []
    
    for d in raw_data:
        year = str(d.get('年份', '')).replace('年', '').strip()
        dist = str(d.get('分區', '')).replace('台', '臺').strip()
        
        if year in TARGET_YEARS and dist in DISTRICTS:
            row_data = {'學年度': year, '行政區': dist, '問卷_樣本數': d.get('資料筆數', 0)}
            
            # 展開所有構面
            dims = d.get('構面', {})
            for dim_name, dim_scores in dims.items():
                row_data[f'構面_{dim_name}_需求度'] = dim_scores.get('需求度')
                row_data[f'構面_{dim_name}_滿意度'] = dim_scores.get('滿意度')
                row_data[f'構面_{dim_name}_Gap'] = dim_scores.get('Gap')
                
            # 展開所有逐題 (01 到 17)
            questions = d.get('逐題', {})
            for q_id, q_scores in questions.items():
                row_data[f'題{q_id}_需求度'] = q_scores.get('需求度')
                row_data[f'題{q_id}_滿意度'] = q_scores.get('滿意度')
                row_data[f'題{q_id}_Gap'] = q_scores.get('Gap')
                
            records.append(row_data)
            
    return pd.DataFrame(records)

# ==========================================
# 3. 執行抓取與資料合併 (Merge)
# ==========================================
print("開始讀取並清洗資料...")

df_enroll = get_enrollment_data()
df_pop = get_population_data()
df_inst = get_institution_data()
df_survey = get_survey_data()

# 依序使用 '學年度' 與 '行政區' 進行外部合併 (Outer Join)，確保沒有資料遺漏
df_final = pd.merge(df_enroll, df_pop, on=['學年度', '行政區'], how='outer')
df_final = pd.merge(df_final, df_inst, on=['學年度', '行政區'], how='outer')
df_final = pd.merge(df_final, df_survey, on=['學年度', '行政區'], how='outer')

# 排序：先依年度，再依行政區
df_final = df_final.sort_values(by=['學年度', '行政區']).reset_index(drop=True)

# ==========================================
# 4. 匯出完整報表
# ==========================================
output_excel = os.path.join(current_dir, '112_114_臺北市幼教綜合數據(含全問卷).xlsx')

# 產出 Excel
df_final.to_excel(output_excel, index=False, float_format="%.2f")

print(f"處理完成！資料已匯出至：{output_excel}")
print(f"共計產生 {len(df_final)} 筆（列）資料，包含 {len(df_final.columns)} 個欄位（變數）。")