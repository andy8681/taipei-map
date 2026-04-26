import { useState } from 'react'
import taipeiData from './data/taipeiData.json'
import TaipeiMap from './components/TaipeiMap' // 確保路徑與檔名正確

function App() {
  // 建立狀態：用來儲存目前點擊到的行政區完整資料物件
  const [selectedDistrict, setSelectedDistrict] = useState(null)

  // 當地圖上的 path 被點擊時執行的函式
  const handleSelectDistrict = (id) => {
    // 從 JSON 資料中找出 ID 相符的區塊資料
    const foundData = taipeiData.find(item => item.id === id)
    if (foundData) {
      setSelectedDistrict(foundData)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center">
      {/* 標題區 */}
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2">
          台北市幼教資源數據看板
        </h1>
        <p className="text-slate-500 text-lg">
          互動式地圖視覺化專案
        </p>
      </header>

      {/* 主要內容區：左右並排 (手機版改為上下) */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* 左側：地圖展示區 */}
        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center">
          <div className="w-full h-auto">
            <TaipeiMap 
              selectedId={selectedDistrict?.id} 
              onSelect={handleSelectDistrict} 
            />
          </div>
        </div>

        {/* 右側：數據詳細資訊區 */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 min-h-[400px] flex flex-col">
          {selectedDistrict ? (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center mb-8">
                <span className="w-2 h-10 bg-blue-600 rounded-full mr-4"></span>
                <h2 className="text-4xl font-bold text-slate-800">
                  {selectedDistrict.name}
                </h2>
              </div>

              {/* 數據小卡片 */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <p className="text-blue-600 text-sm font-semibold mb-1 uppercase tracking-wider">設籍幼兒數</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedDistrict.residenceData.childResidenceCount.toLocaleString()} <span className="text-base font-normal">人</span>
                  </p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <p className="text-emerald-600 text-sm font-semibold mb-1 uppercase tracking-wider">幼兒園總數</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedDistrict.schoolLocationData.count.toLocaleString()} <span className="text-base font-normal">間</span>
                  </p>
                </div>
              </div>

              {/* 區域描述改為：幼兒園類型分佈 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex-grow">
                <h3 className="text-slate-700 font-bold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                  </svg>
                  幼兒園類型分佈
                </h3>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-slate-700">
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-500">公立</span>
                    <span className="font-semibold">{selectedDistrict.preschoolTypes.public.count} 間 <span className="text-xs text-slate-400 font-normal">({selectedDistrict.preschoolTypes.public.districtRatio}%)</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-500">私立</span>
                    <span className="font-semibold">{selectedDistrict.preschoolTypes.private.count} 間 <span className="text-xs text-slate-400 font-normal">({selectedDistrict.preschoolTypes.private.districtRatio}%)</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-500">非營利</span>
                    <span className="font-semibold">{selectedDistrict.preschoolTypes.nonProfit.count} 間 <span className="text-xs text-slate-400 font-normal">({selectedDistrict.preschoolTypes.nonProfit.districtRatio}%)</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-500">準公共</span>
                    <span className="font-semibold">{selectedDistrict.preschoolTypes.quasiPublic.count} 間 <span className="text-xs text-slate-400 font-normal">({selectedDistrict.preschoolTypes.quasiPublic.districtRatio}%)</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-500">職場</span>
                    <span className="font-semibold">{selectedDistrict.preschoolTypes.workplace.count} 間 <span className="text-xs text-slate-400 font-normal">({selectedDistrict.preschoolTypes.workplace.districtRatio}%)</span></span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 未選擇時的預設畫面
            <div className="flex-grow flex flex-col items-center justify-center text-slate-400 space-y-4">
              <svg className="w-24 h-24 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-xl font-medium">請在左側點選地圖行政區</p>
              <p className="text-sm">點擊後即可查看該區詳細的幼兒與幼兒園數據</p>
            </div>
          )}
        </div>

      </div>

      {/* 底部腳註 (可選) */}
      <footer className="mt-12 text-slate-400 text-sm italic">
        數據來源：台北市教育數據庫
      </footer>
    </div>
  )
}

export default App