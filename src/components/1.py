import os

current_dir = os.path.dirname(os.path.abspath(__file__))
input_file = os.path.join(current_dir, 'TaipeiMap.jsx')
output_file = os.path.join(current_dir, 'TaipeiMap_Interactive.jsx')

print(f"準備執行！\n正在讀取: {input_file}")

if not os.path.exists(input_file):
    print("找不到 TaipeiMap.jsx！")
else:
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 直接用 '<path' 當作菜刀，把整個檔案切成一塊一塊
    parts = content.split('<path')
    new_parts = [parts[0]] # 第一塊是 SVG 開頭的程式碼，保留不動

    count = 0
    # 從第二塊開始，每一塊都是從 <path 到下一個 <path 之間的內容
    for part in parts[1:]:
        # 我們完全不找 '>' 了，直接在這整塊文字裡面找 id 和 fill
        id_start = part.find('id="')
        fill_start = part.find('fill="')
        
        if id_start != -1 and fill_start != -1:
            # 萃取出 id 名稱和原來的顏色
            id_val = part[id_start+4:].split('"')[0]
            fill_val = part[fill_start+6:].split('"')[0]
            
            # 準備要替換的字串
            old_fill_str = f'fill="{fill_val}"'
            new_fill_str = f"fill={{(!selectedId || selectedId === '{id_val}') ? '{fill_val}' : '#e2e8f0'}}"
            
            # 執行精準替換 (只替換一次)
            part = part.replace(old_fill_str, new_fill_str, 1)
            count += 1
            
        # 把修改後的區塊組裝回去
        new_parts.append('<path' + part)

    # 寫入新檔案
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("".join(new_parts))

    print(f"大功告成！成功修改了 {count} 個區塊！")
    print(f"請在資料夾查看新檔案：TaipeiMap_Interactive.jsx")