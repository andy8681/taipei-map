import React, { useState, useMemo } from 'react';
import TaipeiMap from './components/TaipeiMap';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// 引用三份資料源
import publicRatioData from './data/臺北市各行政區歷年公共化幼兒園占比統計表.json';
import taipeiPopulationData from './data/台北市學齡前設籍人數.json';
import supplyDemandData from './data/臺北市各行政區幼兒園供給與招生概況.json';

// 行政區對照表
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
  const [selectedDistrict, setSelectedDistrict] = useState(districtsMapping[0]); // 預設臺北市
  const [activeTab, setActiveTab] = useState('supply'); // 'supply', 'population', 或 'ratio'
  const [searchQuery, setSearchQuery] = useState(''); // 搜尋關鍵字

  // 切換選擇行政區
  const handleSelectDistrict = (id) => {
    const foundData = districtsMapping.find(item => item.id === id);
    if (foundData) {
      setSelectedDistrict(foundData);
      if (id !== '台北市' && activeTab === 'population') {
        setActiveTab('supply');
      }
    }
  };

  // 搜尋過濾行政區列表
  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districtsMapping;
    return districtsMapping.filter(d => d.name.includes(searchQuery.trim()) || d.id.includes(searchQuery.trim()));
  }, [searchQuery]);

  // 1. 取得幼兒園供給與招生概況資料 (Excel轉化資料)
  const currentSupplyData = useMemo(() => {
    if (!selectedDistrict) return [];
    const districtInfo = supplyDemandData.find(d => d.id === selectedDistrict.id);
    return districtInfo ? districtInfo.yearly_stats : [];
  }, [selectedDistrict]);

  // 2. 取得公共化占比趨勢資料 (行政區)
  const districtTrendData = useMemo(() => {
    if (!selectedDistrict || selectedDistrict.id === '台北市') return [];
    const districtTrends = publicRatioData.find(d => d.id === selectedDistrict.id);
    if (!districtTrends) return [];

    const years = ['108', '109', '110', '111', '112', '113', '114'];
    return years.map(year => ({
      year: `${year}年`,
      publicRatio: districtTrends.yearly_data[year] 
        ? parseFloat(districtTrends.yearly_data[year].replace('%', '')) 
        : null
    }));
  }, [selectedDistrict]);

  // 3. 取得臺北市總體設籍人數資料
  const cityPopulationData = useMemo(() => {
    if (selectedDistrict?.id !== '台北市') return [];
    const years = ['108', '109', '110', '111', '112', '113', '114'];
    return years.map(year => {
      const data = taipeiPopulationData[year];
      return {
        year: `${year}年`,
        total: data['總計'],
        changeRatio: data['設籍人數增減百分比'] 
          ? parseFloat(data['設籍人數增減百分比'].replace('%', '')) 
          : null,
        age0: data['0歲'], age1: data['1歲'], age2: data['2歲'],
        age3: data['3歲'], age4: data['4歲'], age5: data['5歲']
      };
    });
  }, [selectedDistrict]);

  // 最新學年度（113年）數據
  const latestSupply = currentSupplyData[currentSupplyData.length - 1] || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center font-sans">
      
      {/* 頁面標頭 */}
      <header className="text-center mb-8 w-full max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2">
          臺北市幼教縱貫性分析
        </h1>
        <p className="text-slate-500 text-sm md:text-base">
        </p>
      </header>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 左側：搜尋、區名選取面板與地圖 (5 欄) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* 行政區選取與關鍵字搜尋區 */}
          <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                選擇行政區
              </label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                對應：{selectedDistrict.name}
              </span>
            </div>

            {/* 關鍵字搜尋框 */}
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋區名 (如: 大安, 北投)..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>

            {/* 清爽標準按鈕網格 (選中藍底白字，未選中簡潔白底) */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 max-h-52 overflow-y-auto">
              {filteredDistricts.map(item => {
                const isSelected = selectedDistrict?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectDistrict(item.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 border text-center
                      ${isSelected 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'}`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 地圖呈現 */}
          <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 flex-grow flex items-center justify-center min-h-[360px]">
            <TaipeiMap 
              selectedId={selectedDistrict?.id}
              selectedName={selectedDistrict?.name}
              activeId={selectedDistrict?.id}
              selectedDistrict={selectedDistrict}
              onSelect={handleSelectDistrict} 
            />
          </div>
        </div>

        {/* 右側：詳細數據與圖表儀表板 (7 欄) */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 flex flex-col gap-6">
          
          {/* 行政區標題與頁籤切換 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">SELECTED REGION</span>
              <h2 className="text-3xl font-bold text-slate-800">{selectedDistrict.name}</h2>
            </div>

            {/* 視圖切換 Tab */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button 
                onClick={() => setActiveTab('supply')}
                className={`px-3.5 py-2 rounded-lg transition-all ${activeTab === 'supply' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                供給與招生 (108-113)
              </button>
              {selectedDistrict.id === '台北市' ? (
                <button 
                  onClick={() => setActiveTab('population')}
                  className={`px-3.5 py-2 rounded-lg transition-all ${activeTab === 'population' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  人口增減趨勢
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('ratio')}
                  className={`px-3.5 py-2 rounded-lg transition-all ${activeTab === 'ratio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  公共化占比趨勢
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: 幼兒園供給與招生概況 */}
          {activeTab === 'supply' && (
            <div className="flex flex-col gap-6">
              
              {/* 113 學年度最新指標卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-blue-600 font-semibold">2-5歲幼兒人口</p>
                    <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.5 rounded">113學年</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{latestSupply.childPopulation?.toLocaleString() || '-'}</p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-indigo-600 font-semibold">核定招收名額</p>
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 font-bold px-1.5 py-0.5 rounded">113學年</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{latestSupply.appEnroll?.toLocaleString() || '-'}</p>
                </div>

                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-teal-600 font-semibold">實際在園人數</p>
                    <span className="text-[10px] bg-teal-200 text-teal-800 font-bold px-1.5 py-0.5 rounded">113學年</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{latestSupply.stuAmount?.toLocaleString() || '-'}</p>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-amber-600 font-semibold">招收滿載率</p>
                    <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded">113學年</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{latestSupply.occupancyRate ? `${latestSupply.occupancyRate}%` : '-'}</p>
                </div>
              </div>

              {/* 趨勢圖表 */}
              <div className="bg-slate-50 p-5 rounded-2xl border">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></span>
                  歷年幼兒園核定招收量 vs. 實際在園人數 (108-113年)
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentSupplyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="year" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Legend wrapperStyle={{fontSize:'12px', paddingTop:'8px'}} />
                      <Bar dataKey="appEnroll" name="核定招收人數" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="stuAmount" name="實際在園人數" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 明細表格 */}
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-center whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2.5">學年度</th>
                      <th className="px-3 py-2.5">幼兒人口</th>
                      <th className="px-3 py-2.5">核定名額</th>
                      <th className="px-3 py-2.5">在園人數</th>
                      <th className="px-3 py-2.5">滿載率</th>
                      <th className="px-3 py-2.5">公立</th>
                      <th className="px-3 py-2.5">非營利</th>
                      <th className="px-3 py-2.5">準公共</th>
                      <th className="px-3 py-2.5">私立</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {currentSupplyData.map(row => (
                      <tr key={row.year} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{row.year}</td>
                        <td className="px-3 py-2">{row.childPopulation.toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold text-indigo-600">{row.appEnroll.toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold text-blue-600">{row.stuAmount.toLocaleString()}</td>
                        <td className="px-3 py-2 text-amber-600 font-bold">{row.occupancyRate}%</td>
                        <td className="px-3 py-2">{row.publicCount}</td>
                        <td className="px-3 py-2">{row.nonProfitCount}</td>
                        <td className="px-3 py-2">{row.quasiPublicCount}</td>
                        <td className="px-3 py-2">{row.privateCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: 人口增減趨勢 (包含折線圖 + 詳細表格) */}
          {activeTab === 'population' && selectedDistrict.id === '台北市' && (
            <div className="flex flex-col gap-5">
              <div className="bg-slate-50 p-5 rounded-2xl border">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></span>
                  學齡前設籍人數與增減趨勢 (108-114年)
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cityPopulationData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="year" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis yAxisId="left" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} tick={{fill:'#64748b', fontSize:12}} unit="%" />
                      <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Legend wrapperStyle={{fontSize:'12px', paddingTop:'8px'}} />
                      <Line yAxisId="left" type="monotone" dataKey="total" name="總設籍人數" stroke="#3b82f6" strokeWidth={3} dot={{r:3}} />
                      <Line yAxisId="right" type="monotone" dataKey="changeRatio" name="增減率 (%)" stroke="#ef4444" strokeWidth={2} dot={{r:3}} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 人口明細數據表格 */}
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-center whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2.5">年度</th>
                      <th className="px-3 py-2.5 text-blue-600">總設籍數</th>
                      <th className="px-3 py-2.5 text-red-500">增減率</th>
                      <th className="px-3 py-2.5">0歲</th>
                      <th className="px-3 py-2.5">1歲</th>
                      <th className="px-3 py-2.5">2歲</th>
                      <th className="px-3 py-2.5">3歲</th>
                      <th className="px-3 py-2.5">4歲</th>
                      <th className="px-3 py-2.5">5歲</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {cityPopulationData.map(row => (
                      <tr key={row.year} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{row.year}</td>
                        <td className="px-3 py-2 font-bold text-blue-600">{row.total.toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold text-red-500">{row.changeRatio !== null ? `${row.changeRatio}%` : '-'}</td>
                        <td className="px-3 py-2">{row.age0.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.age1.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.age2.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.age3.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.age4.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.age5.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: 公共化占比趨勢 (包含折線圖 + 詳細表格) */}
          {activeTab === 'ratio' && selectedDistrict.id !== '台北市' && (
            <div className="flex flex-col gap-5">
              <div className="bg-slate-50 p-5 rounded-2xl border">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                  <span className="w-1.5 h-4 bg-pink-500 rounded-full mr-2"></span>
                  {selectedDistrict.name}歷年公共化佔比趨勢 (108-114年)
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={districtTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="year" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis tickLine={false} tick={{fill:'#64748b', fontSize:12}} unit="%" />
                      <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Line type="monotone" dataKey="publicRatio" name="公共化佔比 (%)" stroke="#ec4899" strokeWidth={3} dot={{r:4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 公共化占比明細表格 */}
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-center whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="px-4 py-2.5">年度</th>
                      <th className="px-4 py-2.5 text-pink-600 font-bold">公共化佔比 (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {districtTrendData.map(row => (
                      <tr key={row.year} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{row.year}</td>
                        <td className="px-4 py-2 text-pink-600 font-bold">{row.publicRatio !== null ? `${row.publicRatio}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}