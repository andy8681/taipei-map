// 檔案路徑：api/analyze.js
import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // 安全性檢查：只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允許 POST 請求' });
  }

  try {
    // 從前端接收 JSON 字串
    const { dataString } = req.body;

    // 初始化 API (這段程式碼會在 Vercel 伺服器上執行，前端絕對看不到金鑰)
    // 注意：後端讀取環境變數是用 process.env
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      你是一位專業的資料分析師。以下是臺北市相關的統計數據 (JSON 格式)：
      ${dataString}
      
      請幫我分析這份資料，歸納出 3 個最重要的數據洞察與趨勢，並以繁體中文條列式說明。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // 將 AI 回覆傳回給前端
    res.status(200).json({ result: response.text });
    
  } catch (error) {
    console.error("後端解析錯誤:", error);
    res.status(500).json({ error: '資料解析失敗，請稍後再試。' });
  }
}