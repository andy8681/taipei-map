import React, { useState, useMemo } from 'react';
import TaipeiMap from './components/TaipeiMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 1. 引用外部資料
import publicRatioData from './data/臺北市各行政區歷年公共化幼兒園占比統計表.json';
import taipeiPopulationData from './data/台北市學齡前設籍人數.json'; // 新增引用台北市設籍人數

// 2. 地圖與按鈕所需的 ID 與名稱對照
const districtsMapping = [
  { id: "台北市", name: "臺北市" },
  { id: "北投", name: "北投區" },
  { id: "士林", name: "士林區" },
  { id: "內湖", name: "內湖區" },
  { id: "中山", name: "中山區" },
  { id: "大同", name: "大同區" },
  { id: "松山", name: "松山區" },
  { id: "萬華", name: "萬華區" },
  { id: "中正", name: "中正區" },
  { id: "大安", name: "大安區" },
  { id: "信義", name: "信義區" },
  { id: "南港", name: "南港區" },
  { id: "文山", name: "文山區" }
];

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const handleSelectDistrict = (id) => {
    const foundData = districtsMapping.find(item => item.id === id);
    if (foundData) setSelectedDistrict(foundData);
  };

  // 3. 處理「各行政區」的公共化佔比趨勢資料
  const districtTrendData = useMemo(() => {
    if (!selectedDistrict || selectedDistrict.id === '台北市') return [];
    
    const districtTrends = publicRatioData.find(d => d.id === selectedDistrict.id);
    if (!districtTrends) return [];

    const years = ['108', '109', '110', '111', '112', '113', '114'];
    return years.map(year => ({
      year: `${year}年`,
      publicRatio: parseFloat(districtTrends.yearly_data[year].replace('%', ''))
    }));
  }, [selectedDistrict]);

  // 4. 處理「臺北市總體」的設籍人數趨勢資料
  const cityPopulationData = useMemo(() => {
    if (selectedDistrict?.id !== '台北市') return [];
    
    const years = ['108', '109', '110', '111', '112', '113', '114'];
    return years.map(year => {
      const data = taipeiPopulationData[year];
      return {
        year: `${year}年`,
        total: data['總計'],
        // 將 "-7.83%" 轉為數字，若是 null 則回傳 0 或 null
        changeRatio: data['設籍人數增減百分比'] 
          ? parseFloat(data['設籍人數增減百分比'].replace('%', '')) 
          : null,
        age0: data['0歲'],
        age1: data['1歲'],
        age2: data['2歲'],
        age3: data['3歲'],
        age4: data['4歲'],
        age5: data['5歲']
      };
    });
  }, [selectedDistrict]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center font-sans">
      <header className="text-center mb-10 w-full max-w-6xl">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-3">臺北市幼教資源整合型研究</h1>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        
        {/* 左側地圖與總表按鈕 */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => handleSelectDistrict('台北市')}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center border-2
              ${selectedDistrict?.id === '台北市' 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'}`}
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            臺北市總體資料
          </button>
          
          <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 flex-grow flex items-center justify-center min-h-[400px]">
            <TaipeiMap selectedId={selectedDistrict?.id} onSelect={handleSelectDistrict} />
          </div>
        </div>

        {/* 右側資訊面板 */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col overflow-y-auto min-h-[600px]">
          {selectedDistrict ? (
            <div className="flex flex-col gap-8">
              
              <div className="pb-4 border-b">
                <h2 className="text-4xl font-bold text-slate-800">{selectedDistrict.name}</h2>
              </div>

              {/* 根據選擇的是「台北市」還是「行政區」來渲染不同的畫面 */}
              {selectedDistrict.id === '台北市' ? (
                // ================= 台北市總體數據視圖 =================
                <>
                  {/* 歷年設籍人數與增減率折線圖 (雙Y軸) */}
                  <div className="bg-slate-50 p-6 rounded-2xl border">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                      <span className="w-1 h-5 bg-blue-500 rounded-full mr-2"></span>
                      學齡前設籍人數與增減趨勢 (108-114年)
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cityPopulationData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12}} domain={['auto', 'auto']} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12}} unit="%" />
                          <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                          <Line yAxisId="left" type="monotone" dataKey="total" name="總設籍人數" stroke="#3b82f6" strokeWidth={4} dot={{r:4}} activeDot={{r:8}} />
                          <Line yAxisId="right" type="monotone" dataKey="changeRatio" name="增減率 (%)" stroke="#ef4444" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 歷年設籍人數詳細表格 */}
                  <div className="overflow-x-auto border rounded-2xl">
                    <table className="w-full text-sm text-center whitespace-nowrap">
                      <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                          <th className="px-3 py-3">年度</th>
                          <th className="px-3 py-3 text-blue-600">總計</th>
                          <th className="px-3 py-3 text-red-500">增減率</th>
                          <th className="px-3 py-3 text-slate-500">0歲</th>
                          <th className="px-3 py-3 text-slate-500">1歲</th>
                          <th className="px-3 py-3 text-slate-500">2歲</th>
                          <th className="px-3 py-3 text-slate-500">3歲</th>
                          <th className="px-3 py-3 text-slate-500">4歲</th>
                          <th className="px-3 py-3 text-slate-500">5歲</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {cityPopulationData.map(row => (
                          <tr key={row.year} className="hover:bg-slate-50">
                            <td className="px-3 py-3 text-slate-700 font-medium">{row.year}</td>
                            <td className="px-3 py-3 font-bold text-blue-600">{row.total.toLocaleString()}</td>
                            <td className="px-3 py-3 text-red-500 font-semibold">{row.changeRatio !== null ? `${row.changeRatio}%` : '-'}</td>
                            <td className="px-3 py-3 text-slate-600">{row.age0.toLocaleString()}</td>
                            <td className="px-3 py-3 text-slate-600">{row.age1.toLocaleString()}</td>
                            <td className="px-3 py-3 text-slate-600">{row.age2.toLocaleString()}</td>
                            <td className="px-3 py-3 text-slate-600">{row.age3.toLocaleString()}</td>
                            <td className="px-3 py-3 text-slate-600">{row.age4.toLocaleString()}</td>
                            <td className="px-3 py-3 text-slate-600">{row.age5.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                // ================= 各行政區數據視圖 =================
                districtTrendData.length > 0 ? (
                  <>
                    {/* 歷年公共化佔比折線圖 */}
                    <div className="bg-slate-50 p-6 rounded-2xl border">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                        <span className="w-1 h-5 bg-pink-500 rounded-full mr-2"></span>
                        公共化佔比趨勢 (108-114年)
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={districtTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12}} unit="%" domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Line type="monotone" dataKey="publicRatio" name="公共化佔比" stroke="#3b82f6" strokeWidth={4} dot={{r:6, strokeWidth:2, fill:'#fff'}} activeDot={{r:8}} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 趨勢明細表格 */}
                    <div className="overflow-hidden border rounded-2xl">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold">
                          <tr>
                            <th className="px-4 py-3">年度</th>
                            <th className="px-4 py-3 text-right">公共化佔比 (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {districtTrendData.map(row => (
                            <tr key={row.year} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-700">{row.year}</td>
                              <td className="px-4 py-3 text-right font-semibold text-blue-600">{row.publicRatio}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-400 py-12">
                    <p className="text-lg font-medium">目前尚無此區域的統計資料</p>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-400">
              <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
              <p className="text-lg font-medium">請選擇行政區以查看詳細數據</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}