import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // 1. 設定 CORS 標頭，允許來自您的 GitHub Pages 跨域存取
  res.setHeader('Access-Control-Allow-Origin', 'https://andy8681.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 2. 攔截並回應瀏覽器的 OPTIONS 預檢請求 (解決 405 Method Not Allowed)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. 阻擋非 POST 的實質請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允許 POST 請求' });
  }

  try {
    const { dataString } = req.body;
    
    // 初始化 Gemini API 客戶端
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 4. 設定具體、嚴格限制風格的 Prompt
    const prompt = `你是一個內建於儀表板中的數據分析系統。請針對以下臺北市幼兒教育資源與人口供需的 JSON 數據，產出客觀的文字描述。

【輸出規範】
1. 絕對客觀：僅描述數據呈現的具體事實與變化（如：趨勢增減、佔比、落差最大/最小的構面與具體數值）。
2. 禁用修辭：不可使用主觀或情緒性形容詞（如「驚人的」、「表現優異」、「令人擔憂」、「極度不佳」）。
3. 嚴禁對話：不要包含任何開場白（如「您好」、「為您分析」）、結語或引導提問（如「如有其他問題請隨時發問」）。請直接輸出分析結果。
4. 格式要求：請直接歸納出 3 點最重要的數據事實，以繁體中文條列式輸出。

【當前頁面數據】
${dataString}`;

    // 呼叫 Gemini 模型進行生成
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    // 回傳成功結果
    return res.status(200).json({ result: response.text });
    
  } catch (error) {
    console.error('AI 分析發生錯誤:', error);
    return res.status(500).json({ 
      error: '資料解析失敗',
      details: error.message || error.toString() 
    });
  }
} 