import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允許 POST 請求' });
  }

  try {
    const { dataString } = req.body;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      你是一位專業的資料分析師。以下是臺北市相關的統計數據 (JSON 格式)：
      ${dataString}
      
      請幫我分析這份資料，歸納出 3 個最重要的數據洞察與趨勢，並以繁體中文條列式說明。
    `;

    // 💡 變更點 1：先改用 gemini-1.5-flash 測試，排除 2.5 權限未開通問題
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.status(200).json({ result: response.text });
    
  } catch (error) {
    // 💡 變更點 2：將真實錯誤訊息 (error.message) 一併回傳，讓我們在 Terminal 就能看到
    res.status(500).json({ 
      error: '資料解析失敗',
      details: error.message || error.toString() 
    });
  }
}