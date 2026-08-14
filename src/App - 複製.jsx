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

// 圖表樣式變數定義
const barRadius = 4;
const horizontalBarRadius = 4;
// 修正：domain 必須是陣列格式 [最小值, 最大值]
const scoreDomain = [0, 5]; 
const yearsList = ['108年', '109年', '110年', '111年', '112年', '113年'];

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState(districtsMapping[0]); 
  const [activeTab, setActiveTab] = useState('supply'); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [selectedSubYear, setSelectedSubYear] = useState('113年'); 

  const handleSelectDistrict = (id) => {
    const foundData = districtsMapping.find(item => item.id === id);
    if (foundData) {
      setSelectedDistrict(foundData);
      if (id !== '台北市' && activeTab === 'population') {
        setActiveTab('supply');
      }
    }
  };

  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districtsMapping;
    return districtsMapping.filter(d => d.name.includes(searchQuery.trim()) || d.id.includes(searchQuery.trim()));
  }, [searchQuery]);

  const currentDistrictData = useMemo(() => {
    if (!selectedDistrict) return null;
    return supplyDemandData.find(d => d.id === selectedDistrict.id) || null;
  }, [selectedDistrict]);

  const currentSupplyData = currentDistrictData?.yearly_stats || [];
  const rawSubDistricts = currentDistrictData?.sub_districts || [];
  const currentSatisfaction = currentDistrictData?.satisfaction || null;

  const currentSubDistrictsForYear = useMemo(() => {
    if (!rawSubDistricts || rawSubDistricts.length === 0) return [];
    
    return rawSubDistricts.map(sub => {
      const yearStat = sub.yearly_stats?.find(y => y.year === selectedSubYear) 
        || (sub.yearly_stats ? sub.yearly_stats[sub.yearly_stats.length - 1] : sub);
        
      return {
        name: sub.name,
        appEnroll: yearStat.appEnroll || 0,
        stuAmount: yearStat.stuAmount || 0,
        occupancyRate: yearStat.occupancyRate || 0,
        kindergartenCount: yearStat.kindergartenCount || 0
      };
    });
  }, [rawSubDistricts, selectedSubYear]);

  const combinedSatisfactionData = useMemo(() => {
    if (!currentSatisfaction) return [];
    const parentList = currentSatisfaction.parent || [];
    const staffList = currentSatisfaction.staff || [];

    return parentList.map(item => {
      const staffItem = staffList.find(s => s.dimension === item.dimension);
      return {
        dimension: item.dimension,
        家長滿意度: item.score,
        教保員滿意度: staffItem ? staffItem.score : 0
      };
    });
  }, [currentSatisfaction]);

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

  const latestSupply = currentSupplyData[currentSupplyData.length - 1] || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center font-sans">
      
      <header className="text-center mb-8 w-full max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2">
          臺北市幼兒教育資源與人口供需整合儀表板
        </h1>
        <p className="text-slate-500 text-sm md:text-base">
          整合設籍人口學齡趨勢、次分區涵蓋率與準公共教保服務品質滿意度調查
        </p>
      </header>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                選擇行政區
              </label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                對應：{selectedDistrict.name}
              </span>
            </div>

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

        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">SELECTED REGION</span>
              <h2 className="text-3xl font-bold text-slate-800">{selectedDistrict.name}</h2>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap gap-1">
              <button 
                onClick={() => setActiveTab('supply')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'supply' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                供給招生
              </button>
              
              {selectedDistrict.id !== '台北市' && rawSubDistricts.length > 0 && (
                <button 
                  onClick={() => setActiveTab('subdistrict')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'subdistrict' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  次分區概況
                </button>
              )}

              <button 
                onClick={() => setActiveTab('satisfaction')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'satisfaction' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                品質滿意度
              </button>

              {selectedDistrict.id === '台北市' ? (
                <button 
                  onClick={() => setActiveTab('population')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'population' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  人口趨勢
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('ratio')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'ratio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  公共化占比
                </button>
              )}
            </div>
          </div>

          {activeTab === 'supply' && (
            <div className="flex flex-col gap-6">
              
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
                    <p className="text-xs text-amber-600 font-semibold">招收入園率</p>
                    <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded">113學年</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{latestSupply.occupancyRate ? `${latestSupply.occupancyRate}%` : '-'}</p>
                </div>
              </div>

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
                      <Bar dataKey="appEnroll" name="核定招收人數" fill="#93c5fd" radius={barRadius} />
                      <Bar dataKey="stuAmount" name="實際在園人數" fill="#3b82f6" radius={barRadius} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-center whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2.5">學年度</th>
                      <th className="px-3 py-2.5">幼兒人口</th>
                      <th className="px-3 py-2.5">核定名額</th>
                      <th className="px-3 py-2.5">在園人數</th>
                      <th className="px-3 py-2.5">入園率</th>
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

          {activeTab === 'subdistrict' && selectedDistrict.id !== '台北市' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-100 p-2.5 rounded-2xl border gap-2">
                <span className="text-xs font-bold text-slate-600 px-1">選擇檢視學年度：</span>
                <div className="flex gap-1 flex-wrap">
                  {yearsList.map(y => (
                    <button
                      key={y}
                      onClick={() => setSelectedSubYear(y)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedSubYear === y 
                          ? 'bg-purple-600 text-white shadow-sm' 
                          : 'bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-600 border border-slate-200'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-1.5 h-4 bg-purple-500 rounded-full mr-2"></span>
                    {selectedDistrict.name} 各次分區幼兒園招收概況 ({selectedSubYear})
                  </span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    {selectedSubYear}
                  </span>
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentSubDistrictsForYear}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} tick={{fill:'#64748b', fontSize:11}} />
                      <YAxis tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Legend wrapperStyle={{fontSize:'12px', paddingTop:'8px'}} />
                      <Bar dataKey="appEnroll" name="核定招收人數" fill="#c084fc" radius={barRadius} />
                      <Bar dataKey="stuAmount" name="實際在園人數" fill="#a855f7" radius={barRadius} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-center whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">次分區名稱</th>
                      <th className="px-4 py-2.5">核定名額 ({selectedSubYear})</th>
                      <th className="px-4 py-2.5">在園人數 ({selectedSubYear})</th>
                      <th className="px-4 py-2.5">入園率 (%)</th>
                      <th className="px-4 py-2.5">園所總數</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {currentSubDistrictsForYear.map(sub => (
                      <tr key={sub.name} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-left font-semibold text-slate-800">{sub.name}</td>
                        <td className="px-4 py-2 text-purple-600 font-semibold">{sub.appEnroll.toLocaleString()}</td>
                        <td className="px-4 py-2 text-blue-600 font-semibold">{sub.stuAmount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-amber-600 font-bold">{sub.occupancyRate}%</td>
                        <td className="px-4 py-2">{sub.kindergartenCount} 所</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'satisfaction' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border">
                {/* 修正：移除了「5分滿分制」的 span */}
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-1.5 h-4 bg-teal-500 rounded-full mr-2"></span>
                    準公共幼兒園教保服務品質滿意度（家長 vs. 教保員 6大構面）
                  </span>
                </h3>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={combinedSatisfactionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" domain={scoreDomain} tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis type="category" dataKey="dimension" tickLine={false} tick={{fill:'#334155', fontSize:11}} width={140} />
                      <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Legend wrapperStyle={{fontSize:'12px', paddingTop:'8px'}} />
                      <Bar dataKey="家長滿意度" fill="#14b8a6" radius={horizontalBarRadius} />
                      <Bar dataKey="教保員滿意度" fill="#f59e0b" radius={horizontalBarRadius} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-center whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">評估構面維度</th>
                      <th className="px-4 py-2.5 text-teal-600">家長滿意度平均</th>
                      <th className="px-4 py-2.5 text-amber-600">教保員滿意度平均</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {combinedSatisfactionData.map(row => (
                      <tr key={row.dimension} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-left font-medium text-slate-800">{row.dimension}</td>
                        <td className="px-4 py-2 font-bold text-teal-600">{row.家長滿意度.toFixed(2)} / 5.0</td>
                        <td className="px-4 py-2 font-bold text-amber-600">{row.教保員滿意度.toFixed(2)} / 5.0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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