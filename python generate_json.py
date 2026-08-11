# -*- coding: utf-8 -*-
import json
import os
import pandas as pd
import numpy as np

def convert_int(val):
    """確保數值轉為原生 int，避免 JSON 序列化失敗"""
    return int(val) if pd.notna(val) else 0

print("正在讀取資料庫檔案 kdbms.mdb.xls...")
# 1. 讀取 Excel 檔案中的各個資料表
file_path = 'kdbms.mdb.xls'
xls = pd.ExcelFile(file_path)

t_pop = pd.read_excel(xls, 'T_POP')
t_k_adm = pd.read_excel(xls, 'T_K_ADMISS')
t_k_basic = pd.read_excel(xls, 'T_K_BASIC')
t_k_info = pd.read_excel(xls, 'T_K_INFO')
t_adm = pd.read_excel(xls, 'T_ADM')
t_sub = pd.read_excel(xls, 'T_SUB')

# 2. 建立對應字典
# 行政區 ID -> 名稱 (例如 1 -> '松山區')
adm_map = dict(zip(t_adm['ID_ADM'], t_adm['ADM_NAME']))
# 次分區 ID -> 名稱 (例如 101 -> '三民次分區')
sub_map = dict(zip(t_sub['ID_SUB'], t_sub['SUB_NAME']))
# 幼兒園類別對應
type_map = {1: 'public', 2: 'nonProfit', 3: 'quasiPublic', 4: 'workplace', 5: 'private'}

years = [108, 109, 110, 111, 112, 113]

print("正在關聯與運算數據...")
# 3. 整理幼兒人口資料 (取 2~5 歲)
t_pop['childPopulation'] = t_pop[['AGE_2', 'AGE_3', 'AGE_4', 'AGE_5']].sum(axis=1)
pop_agg = t_pop.groupby(['ID_YEAR', 'ID_ADM', 'ID_SUB'])['childPopulation'].sum().reset_index()
pop_agg_adm = t_pop.groupby(['ID_YEAR', 'ID_ADM'])['childPopulation'].sum().reset_index()

# 4. 整理幼兒園供給與招生資料
# 將基本資料(含行政區、次分區)合併進招生資料
k_admiss = pd.merge(t_k_adm, t_k_basic[['ID_KIN', 'ID_ADM', 'ID_SUB']], on='ID_KIN', how='left')
# 將幼兒園類別合併進來
k_admiss = pd.merge(k_admiss, t_k_info[['ID_YEAR', 'ID_KIN', 'KIN_TYPE']], on=['ID_YEAR', 'ID_KIN'], how='left')
k_admiss['type_str'] = k_admiss['KIN_TYPE'].map(type_map)

# 依年份、行政區、次分區統計核定數與招生數
adm_agg_sub = k_admiss.groupby(['ID_YEAR', 'ID_ADM', 'ID_SUB']).agg(
    appEnroll=('APP_ENROLL', 'sum'),
    stuAmount=('STU_AMOUNT', 'sum'),
    kindergartenCount=('ID_KIN', 'nunique')
).reset_index()

# 依年份、行政區統計
adm_agg_adm = k_admiss.groupby(['ID_YEAR', 'ID_ADM']).agg(
    appEnroll=('APP_ENROLL', 'sum'),
    stuAmount=('STU_AMOUNT', 'sum')
).reset_index()

# 統計各行政區、各年份的各類別幼兒園數量
type_agg = k_admiss.groupby(['ID_YEAR', 'ID_ADM', 'type_str'])['ID_KIN'].nunique().unstack(fill_value=0).reset_index()
for t in type_map.values(): # 確保所有類別欄位都存在
    if t not in type_agg.columns:
        type_agg[t] = 0

# 沿用原本的滿意度分數
satisfaction_scores = {
    "parent": [
        {"dimension": "師資培育與專業知能", "score": 4.54},
        {"dimension": "課程教學與環境品質", "score": 4.50},
        {"dimension": "行政與經營管理", "score": 4.53},
        {"dimension": "家園合作", "score": 4.57},
        {"dimension": "社區連結與資源運用", "score": 4.37},
        {"dimension": "整體評價與精進建議", "score": 4.59}
    ],
    "staff": [
        {"dimension": "師資培育與專業知能", "score": 4.15},
        {"dimension": "課程教學與環境品質", "score": 4.30},
        {"dimension": "行政與經營管理", "score": 4.33},
        {"dimension": "家園合作", "score": 4.43},
        {"dimension": "社區連結與資源運用", "score": 4.08},
        {"dimension": "整體評價與精進建議", "score": 4.27}
    ]
}

output_data = []

# --- 5. 組合 臺北市總體統計 ---
taipei_yearly = []
for y in years:
    pop_y = int(pop_agg[pop_agg['ID_YEAR'] == y]['childPopulation'].sum())
    app_y = int(adm_agg_adm[adm_agg_adm['ID_YEAR'] == y]['appEnroll'].sum())
    stu_y = int(adm_agg_adm[adm_agg_adm['ID_YEAR'] == y]['stuAmount'].sum())
    
    t_y_df = type_agg[type_agg['ID_YEAR'] == y]
    pub = int(t_y_df['public'].sum()) if 'public' in t_y_df else 0
    non = int(t_y_df['nonProfit'].sum()) if 'nonProfit' in t_y_df else 0
    qua = int(t_y_df['quasiPublic'].sum()) if 'quasiPublic' in t_y_df else 0
    wor = int(t_y_df['workplace'].sum()) if 'workplace' in t_y_df else 0
    pri = int(t_y_df['private'].sum()) if 'private' in t_y_df else 0
    tot_kg = pub + non + qua + wor + pri
    
    occ_rate = round((stu_y / app_y) * 100, 1) if app_y > 0 else 0
    
    taipei_yearly.append({
        "year": f"{y}年",
        "childPopulation": pop_y,
        "appEnroll": app_y,
        "stuAmount": stu_y,
        "occupancyRate": occ_rate,
        "publicCount": pub,
        "nonProfitCount": non,
        "quasiPublicCount": qua,
        "workplaceCount": wor,
        "privateCount": pri,
        "totalKindergartens": tot_kg
    })

output_data.append({
    "id": "台北市",
    "name": "臺北市",
    "yearly_stats": taipei_yearly,
    "sub_districts": [],
    "satisfaction": satisfaction_scores
})

# --- 6. 組合 各行政區與次分區 ---
for adm_id, adm_name in adm_map.items():
    dist_id = adm_name.replace("區", "") # "松山"
    if dist_id == "臺北": continue
    
    dist_yearly_stats = []
    for y in years:
        p_row = pop_agg_adm[(pop_agg_adm['ID_YEAR'] == y) & (pop_agg_adm['ID_ADM'] == adm_id)]
        a_row = adm_agg_adm[(adm_agg_adm['ID_YEAR'] == y) & (adm_agg_adm['ID_ADM'] == adm_id)]
        t_row = type_agg[(type_agg['ID_YEAR'] == y) & (type_agg['ID_ADM'] == adm_id)]
        
        pop = convert_int(p_row['childPopulation'].values[0]) if not p_row.empty else 0
        app = convert_int(a_row['appEnroll'].values[0]) if not a_row.empty else 0
        stu = convert_int(a_row['stuAmount'].values[0]) if not a_row.empty else 0
        
        pub = convert_int(t_row['public'].values[0]) if not t_row.empty else 0
        non = convert_int(t_row['nonProfit'].values[0]) if not t_row.empty else 0
        qua = convert_int(t_row['quasiPublic'].values[0]) if not t_row.empty else 0
        wor = convert_int(t_row['workplace'].values[0]) if not t_row.empty else 0
        pri = convert_int(t_row['private'].values[0]) if not t_row.empty else 0
        tot = pub + non + qua + wor + pri
        
        occ = round((stu / app) * 100, 1) if app > 0 else 0
        
        dist_yearly_stats.append({
            "year": f"{y}年",
            "childPopulation": pop,
            "appEnroll": app,
            "stuAmount": stu,
            "occupancyRate": occ,
            "publicCount": pub,
            "nonProfitCount": non,
            "quasiPublicCount": qua,
            "workplaceCount": wor,
            "privateCount": pri,
            "totalKindergartens": tot
        })

    # 次分區資料
    enhanced_sub_list = []
    sub_df = t_sub[t_sub['ID_SUB'].astype(str).str.startswith(str(int(adm_id)))]
    for _, sub_row in sub_df.iterrows():
        sub_id = sub_row['ID_SUB']
        sub_name = sub_row['SUB_NAME']
        
        sub_y_stats = []
        for y in years:
            sa_row = adm_agg_sub[(adm_agg_sub['ID_YEAR'] == y) & (adm_agg_sub['ID_SUB'] == sub_id)]
            
            s_app = convert_int(sa_row['appEnroll'].values[0]) if not sa_row.empty else 0
            s_stu = convert_int(sa_row['stuAmount'].values[0]) if not sa_row.empty else 0
            s_kg = convert_int(sa_row['kindergartenCount'].values[0]) if not sa_row.empty else 0
            s_occ = round((s_stu / s_app) * 100, 1) if s_app > 0 else 0
            
            sub_y_stats.append({
                "year": f"{y}年",
                "appEnroll": s_app,
                "stuAmount": s_stu,
                "occupancyRate": s_occ,
                "kindergartenCount": s_kg
            })
            
        enhanced_sub_list.append({
            "name": sub_name,
            "yearly_stats": sub_y_stats
        })

    output_data.append({
        "id": dist_id,
        "name": adm_name,
        "yearly_stats": dist_yearly_stats,
        "sub_districts": enhanced_sub_list,
        "satisfaction": satisfaction_scores
    })

# 輸出 JSON 檔案
output_path = os.path.join("src", "data", "臺北市各行政區幼兒園供給與招生概況_真實數據版.json")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"✅ 成功依據 kdbms.mdb.xls 生成真實數據 JSON 檔案：{output_path}")