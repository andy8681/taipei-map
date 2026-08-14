import React, { useState, useMemo } from 'react';
import TaipeiMap from './components/TaipeiMap';
import { 
  LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// 引用資料源
import supplyDemandData from './data/臺北市各行政區幼兒園供給與招生概況.json'; // 保留供次分區概況使用
import enrollmentData from './data/1141219-子計畫一 各類型教保服務機構入園人數統計表.json'; // 入園統計資料
import institutionCountData from './data/1141219-子計畫一各類型教保服務機構數量統計表.json'; // 機構數量統計資料
import populationData from './data/1141219-子計畫學齡前設籍人數與增減趨勢.json'; // 更新的學齡前設籍人口資料

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
const yearsList = ['108年', '109年', '110年', '111年', '112年', '113年'];

// 安全解析數字（處理含有逗號的字串或 null）
const safeParse = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/,/g, '');
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
};

// 安全格式化千分位
const safeFormat = (val) => {
  if (val === null || val === undefined || val === '-' || isNaN(Number(val))) return '-';
  return Number(val).toLocaleString();
};

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState(districtsMapping[0]); 
  const [activeTab, setActiveTab] = useState('supply'); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [selectedSubYear, setSelectedSubYear] = useState('113年'); 

  const handleSelectDistrict = (id) => {
    const foundData = districtsMapping.find(item => item.id === id);
    if (foundData) {
      setSelectedDistrict(foundData);
    }
  };

  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districtsMapping;
    return districtsMapping.filter(d => d.name.includes(searchQuery.trim()) || d.id.includes(searchQuery.trim()));
  }, [searchQuery]);

  // 取舊資料：僅供「次分區(sub_districts)」使用
  const currentDistrictData = useMemo(() => {
    if (!selectedDistrict) return null;
    return supplyDemandData.find(d => d.id === selectedDistrict.id) || null;
  }, [selectedDistrict]);

  const rawSubDistricts = currentDistrictData?.sub_districts || [];

  // 供給與招生數據 (來源: 入園人數統計表，並動態結合新的人口統計)
  const currentSupplyData = useMemo(() => {
    if (!enrollmentData || !populationData) return [];
    const years = ['108', '109', '110', '111', '112', '113', '114'];
    
    // 取得當前所選區域的人口陣列資料
    let popDataArray = [];
    if (selectedDistrict.id === '台北市') {
      popDataArray = populationData.taipei_city_total || [];
    } else {
      popDataArray = populationData.districts?.[selectedDistrict.name] || [];
    }

    return years.map(year => {
      let yearData = enrollmentData.filter(d => String(d.學年度) === year);
      
      if (selectedDistrict.id !== '台北市') {
        yearData = yearData.filter(d => d.行政區 === selectedDistrict.name);
      } else {
        const hasTaipei = yearData.some(d => d.行政區 === '臺北市' || d.行政區 === '台北市');
        if (hasTaipei) {
          yearData = yearData.filter(d => d.行政區 === '臺北市' || d.行政區 === '台北市');
        }
      }

      let appEnroll = 0;
      let stuAmount = 0;
      
      let publicCount = 0;
      let nonProfitCount = 0;
      let quasiPublicCount = 0;
      let educareCount = 0;
      let privateCount = 0;
      
      let age2Count = 0;
      let age3Count = 0;
      let age4Count = 0;
      let age5Count = 0;

      yearData.forEach(d => {
        appEnroll += safeParse(d.核定招生人數);
        stuAmount += safeParse(d.入園人數);

        if (d.設立別 === '公立') publicCount += safeParse(d.入園人數);
        if (d.設立別 === '非營利') nonProfitCount += safeParse(d.入園人數);
        if (d.設立別 === '準公共') quasiPublicCount += safeParse(d.入園人數);
        if (d.設立別 === '教保中心') educareCount += safeParse(d.入園人數);
        if (d.設立別 === '私立') privateCount += safeParse(d.入園人數);
        
        age2Count += safeParse(d['2歲入園人數']);
        age3Count += safeParse(d['3歲入園人數']);
        age4Count += safeParse(d['4歲入園人數']);
        age5Count += safeParse(d['5歲入園人數']);
      });

      const occupancyRate = appEnroll > 0 ? ((stuAmount / appEnroll) * 100).toFixed(2) : 0;
      
      // 計算該年該區的 2~5歲幼兒人口總數
      let childPop = '-';
      const currentYearPopData = popDataArray.find(d => String(d.year) === year);
      if (currentYearPopData) {
        // 使用新 JSON 的 key: age_2, age_3, age_4, age_5
        const sum = safeParse(currentYearPopData.age_2) + 
                    safeParse(currentYearPopData.age_3) + 
                    safeParse(currentYearPopData.age_4) + 
                    safeParse(currentYearPopData.age_5);
        childPop = sum > 0 ? sum : '-';
      }

      return {
        year: `${year}年`,
        childPopulation: childPop,
        appEnroll,
        stuAmount,
        occupancyRate,
        publicCount,
        nonProfitCount,
        quasiPublicCount,
        educareCount,
        privateCount,
        age2Count,
        age3Count,
        age4Count,
        age5Count
      };
    }).filter(d => d.appEnroll > 0 || d.stuAmount > 0); 
  }, [selectedDistrict]);

  // 新資料整合：機構數量與公共化佔比
  const institutionData = useMemo(() => {
    if (!institutionCountData || !selectedDistrict) return [];
    const districtKey = selectedDistrict.id === '台北市' ? '臺北市' : selectedDistrict.name;
    const data = institutionCountData[districtKey] || [];
    
    return data.map(d => ({
      year: `${d.學年度}年`,
      publicCount: safeParse(d.公立),
      nonProfitCount: safeParse(d.非營利),
      quasiPublicCount: safeParse(d.準公共),
      educareCount: safeParse(d.教保中心),
      privateCount: safeParse(d.私立),
      totalCount: safeParse(d.合計),
      publicRatio: d.公共化占比 ? parseFloat(String(d.公共化占比).replace('%', '')) : null,
      rawRatio: d.公共化占比 || '-'
    }));
  }, [selectedDistrict]);

  // 處理次分區資料
  const currentSubDistrictsForYear = useMemo(() => {
    if (!rawSubDistricts || rawSubDistricts.length === 0) return [];
    
    return rawSubDistricts.map(sub => {
      const yearStat = sub.yearly_stats?.find(y => y.year === selectedSubYear) 
        || (sub.yearly_stats ? sub.yearly_stats[sub.yearly_stats.length - 1] : sub);
        
      return {
        name: sub.name,
        appEnroll: safeParse(yearStat?.appEnroll),
        stuAmount: safeParse(yearStat?.stuAmount),
        occupancyRate: yearStat?.occupancyRate || 0,
        kindergartenCount: safeParse(yearStat?.kindergartenCount)
      };
    });
  }, [rawSubDistricts, selectedSubYear]);

  // 人口統計資料 (來源: 更新後的學齡前設籍人數 JSON)
  const cityPopulationData = useMemo(() => {
    if (!populationData || !selectedDistrict) return [];
    
    let popDataArray = [];
    if (selectedDistrict.id === '台北市') {
      popDataArray = populationData.taipei_city_total || [];
    } else {
      popDataArray = populationData.districts?.[selectedDistrict.name] || [];
    }

    if (!Array.isArray(popDataArray)) return [];

    return popDataArray.map(data => {
      return {
        year: `${data.year}年`,
        total: safeParse(data.total),
        changeRatio: data.growth_rate !== null ? data.growth_rate : null,
        age0: safeParse(data.age_0), 
        age1: safeParse(data.age_1), 
        age2: safeParse(data.age_2),
        age3: safeParse(data.age_3), 
        age4: safeParse(data.age_4), 
        age5: safeParse(data.age_5)
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
          {populationData?.metadata?.title || '學齡前設籍人口趨勢'} 
          (資料年份: {populationData?.metadata?.data_range || '歷年'}) - 整合機構數量與次分區入園概況
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

              <button 
                onClick={() => setActiveTab('institutions')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'institutions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                機構數與公共化
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
                onClick={() => setActiveTab('population')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'population' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                人口趨勢
              </button>
            </div>
          </div>

          {activeTab === 'supply' && (
            <div className="flex flex-col gap-6">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-blue-600 font-semibold">2-5歲幼兒人口</p>
                    <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.5 rounded">{latestSupply.year || '無年份'}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{safeFormat(latestSupply.childPopulation)}</p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-indigo-600 font-semibold">核定招收名額</p>
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 font-bold px-1.5 py-0.5 rounded">{latestSupply.year || '無年份'}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{safeFormat(latestSupply.appEnroll)}</p>
                </div>

                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-teal-600 font-semibold">實際在園人數</p>
                    <span className="text-[10px] bg-teal-200 text-teal-800 font-bold px-1.5 py-0.5 rounded">{latestSupply.year || '無年份'}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{safeFormat(latestSupply.stuAmount)}</p>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-amber-600 font-semibold">招收入園率</p>
                    <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded">{latestSupply.year || '無年份'}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{latestSupply.occupancyRate ? `${latestSupply.occupancyRate}%` : '-'}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></span>
                  歷年幼兒園核定招收量 vs. 實際在園人數
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
                      <th className="px-2 py-2 border-b" rowSpan="2">學年度</th>
                      <th className="px-2 py-2 border-b" rowSpan="2">核定名額</th>
                      <th className="px-2 py-2 border-b" rowSpan="2">在園人數</th>
                      <th className="px-2 py-2 border-b" rowSpan="2">入園率</th>
                      <th className="px-2 py-2 border-b border-l bg-slate-200" colSpan="5">各設立別入園人數</th>
                      <th className="px-2 py-2 border-b border-l bg-slate-200" colSpan="4">各年齡層入園人數</th>
                    </tr>
                    <tr>
                      <th className="px-2 py-2 border-l bg-slate-100">公立</th>
                      <th className="px-2 py-2 bg-slate-100">非營利</th>
                      <th className="px-2 py-2 bg-slate-100">準公共</th>
                      <th className="px-2 py-2 bg-slate-100">教保中心</th>
                      <th className="px-2 py-2 bg-slate-100">私立</th>
                      <th className="px-2 py-2 border-l bg-slate-100">2歲</th>
                      <th className="px-2 py-2 bg-slate-100">3歲</th>
                      <th className="px-2 py-2 bg-slate-100">4歲</th>
                      <th className="px-2 py-2 bg-slate-100">5歲</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {currentSupplyData.map(row => (
                      <tr key={row.year} className="hover:bg-slate-50">
                        <td className="px-2 py-2 font-medium">{row.year}</td>
                        <td className="px-2 py-2 font-semibold text-indigo-600">{safeFormat(row.appEnroll)}</td>
                        <td className="px-2 py-2 font-semibold text-blue-600">{safeFormat(row.stuAmount)}</td>
                        <td className="px-2 py-2 text-amber-600 font-bold">{row.occupancyRate}%</td>
                        
                        <td className="px-2 py-2 border-l">{safeFormat(row.publicCount)}</td>
                        <td className="px-2 py-2">{safeFormat(row.nonProfitCount)}</td>
                        <td className="px-2 py-2">{safeFormat(row.quasiPublicCount)}</td>
                        <td className="px-2 py-2">{safeFormat(row.educareCount)}</td>
                        <td className="px-2 py-2">{safeFormat(row.privateCount)}</td>

                        <td className="px-2 py-2 border-l">{safeFormat(row.age2Count)}</td>
                        <td className="px-2 py-2">{safeFormat(row.age3Count)}</td>
                        <td className="px-2 py-2">{safeFormat(row.age4Count)}</td>
                        <td className="px-2 py-2">{safeFormat(row.age5Count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'institutions' && (
            <div className="flex flex-col gap-5">
              <div className="bg-slate-50 p-5 rounded-2xl border">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                  <span className="w-1.5 h-4 bg-pink-500 rounded-full mr-2"></span>
                  {selectedDistrict.name} 歷年各類型教保服務機構數量與公共化佔比
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={institutionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="year" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis yAxisId="left" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} tick={{fill:'#64748b', fontSize:12}} unit="%" />
                      <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Legend wrapperStyle={{fontSize:'12px', paddingTop:'8px'}} />
                      <Bar yAxisId="left" dataKey="publicCount" stackId="a" name="公立" fill="#93c5fd" />
                      <Bar yAxisId="left" dataKey="nonProfitCount" stackId="a" name="非營利" fill="#3b82f6" />
                      <Bar yAxisId="left" dataKey="quasiPublicCount" stackId="a" name="準公共" fill="#f59e0b" />
                      <Bar yAxisId="left" dataKey="educareCount" stackId="a" name="教保中心" fill="#14b8a6" />
                      <Bar yAxisId="left" dataKey="privateCount" stackId="a" name="私立" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="publicRatio" name="公共化佔比 (%)" stroke="#ec4899" strokeWidth={3} dot={{r:4}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-center whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="px-4 py-2.5">學年度</th>
                      <th className="px-4 py-2.5">公立</th>
                      <th className="px-4 py-2.5">非營利</th>
                      <th className="px-4 py-2.5">準公共</th>
                      <th className="px-4 py-2.5">教保中心</th>
                      <th className="px-4 py-2.5">私立</th>
                      <th className="px-4 py-2.5 text-blue-600">合計</th>
                      <th className="px-4 py-2.5 text-pink-600 font-bold">公共化佔比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {institutionData.map(row => (
                      <tr key={row.year} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{row.year}</td>
                        <td className="px-4 py-2">{safeFormat(row.publicCount)}</td>
                        <td className="px-4 py-2">{safeFormat(row.nonProfitCount)}</td>
                        <td className="px-4 py-2">{safeFormat(row.quasiPublicCount)}</td>
                        <td className="px-4 py-2">{safeFormat(row.educareCount)}</td>
                        <td className="px-4 py-2">{safeFormat(row.privateCount)}</td>
                        <td className="px-4 py-2 font-bold text-blue-600">{safeFormat(row.totalCount)}</td>
                        <td className="px-4 py-2 text-pink-600 font-bold">{row.rawRatio}</td>
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
                        <td className="px-4 py-2 text-purple-600 font-semibold">{safeFormat(sub.appEnroll)}</td>
                        <td className="px-4 py-2 text-blue-600 font-semibold">{safeFormat(sub.stuAmount)}</td>
                        <td className="px-4 py-2 text-amber-600 font-bold">{sub.occupancyRate}%</td>
                        <td className="px-4 py-2">{safeFormat(sub.kindergartenCount)} 所</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'population' && (
            <div className="flex flex-col gap-5">
              <div className="bg-slate-50 p-5 rounded-2xl border">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></span>
                  {selectedDistrict.name} 學齡前設籍人數與增減趨勢
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
                        <td className="px-3 py-2 font-bold text-blue-600">{safeFormat(row.total)}</td>
                        <td className="px-3 py-2 font-semibold text-red-500">{row.changeRatio !== null ? `${row.changeRatio}%` : '-'}</td>
                        <td className="px-3 py-2">{safeFormat(row.age0)}</td>
                        <td className="px-3 py-2">{safeFormat(row.age1)}</td>
                        <td className="px-3 py-2">{safeFormat(row.age2)}</td>
                        <td className="px-3 py-2">{safeFormat(row.age3)}</td>
                        <td className="px-3 py-2">{safeFormat(row.age4)}</td>
                        <td className="px-3 py-2">{safeFormat(row.age5)}</td>
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