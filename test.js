// 檔案：test.js
async function testAI() {
  console.log("⏳ 正在呼叫遠端 Vercel API...");
  
  try {
    const response = await fetch('https://taipei-map.vercel.app/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // 隨便捏造一段測試用的 JSON 或字串餵給 AI
      body: JSON.stringify({ 
        dataString: '{"區域": "信義區", "狀態": "天氣晴朗", "測試數據": 999}' 
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ 測試成功！AI 回覆如下：\n");
      console.log(data.result);
    } else {
      console.error("❌ 伺服器回報錯誤：", data);
    }
  } catch (error) {
    console.error("❌ 網路請求失敗：", error);
  }
}

testAI();