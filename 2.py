import json
import os

# 檔案路徑設定
DATA_DIR = r"C:\Users\ecdes\Desktop\工作\程式\台北市\taipei-map\src\data"
SURVEY_FILE = '統計結果_前端專用.json'

def norm(s):
    # 完全仿照前端的 norm 邏輯
    return str(s).replace('臺', '台').strip()

def safe_get(d, keys, default='-'):
    """安全地讀取巢狀字典的值"""
    for k in keys:
        if isinstance(d, dict):
            d = d.get(k, default)
        else:
            return default
    return d if d is not None else default

def generate_survey_summary():
    path = os.path.join(DATA_DIR, SURVEY_FILE)
    if not os.path.exists(path):
        print(f"找不到檔案，請確認路徑: {path}")
        return
    
    with open(path, 'r', encoding='utf-8-sig') as f:
        survey_data = json.load(f)

    print("====== 終端機輸出總結：教保服務品質調查數據 (112-114學年度) ======\n")

    for target in ["台北市整體", "大安區"]:
        print(f"[{target} - 滿意度品質落差(Gap)與優先關注因素]")
        
        # 1. 依照前端邏輯，過濾「分區」 (容許台/臺的差異)
        region_data = [d for d in survey_data if norm(d.get('分區', '')) == norm(target)]
        
        if not region_data:
            print("此區域完全找不到資料，請檢查 JSON 內的 '分區' 欄位名稱。")
            print("")
            continue

        for year in ['112', '113', '114']:
            # 2. 依照前端邏輯，濾掉「年」字眼再做比對
            yd = next((d for d in region_data if str(d.get('年份', '')).replace('年', '').strip() == year), None)
            
            if yd:
                sample_size = yd.get('資料筆數', 0)
                
                # 擷取四大構面 Gap (滿意度 - 需求度)
                gap_base = safe_get(yd, ['構面', '教保基礎條件', 'Gap'], '-')
                gap_action = safe_get(yd, ['構面', '教保作為', 'Gap'], '-')
                gap_extend = safe_get(yd, ['構面', '延長收托安置', 'Gap'], '-')
                gap_other = safe_get(yd, ['構面', '其他', 'Gap'], '-')
                
                # 擷取並排序「優先關注因素」，取出前 3 名
                factors = yd.get('優先關注因素', {})
                sorted_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)
                top_3_factors = [f"{k.split(')')[-1]}({v}人)" for k, v in sorted_factors[:3]]
                
                print(f"--- {year}學年度 (有效樣本: {sample_size}人) ---")
                print(f"四大構面Gap值: 基礎條件({gap_base}), 教保作為({gap_action}), 延長收托({gap_extend}), 其他({gap_other})")
                print(f"家長前三大關注因素: {', '.join(top_3_factors)}")
            else:
                print(f"--- {year}學年度 --- 無資料")
        print("")
        
    print("======================================================================")

if __name__ == "__main__":
    generate_survey_summary()