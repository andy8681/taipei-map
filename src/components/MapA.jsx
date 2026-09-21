import React, { useState, useMemo, useEffect, useRef } from 'react';

// 1. 引入地圖元件
import TaipeiMap from './TaipeiMap'; 

// 🎯 新增：引入我們要拆分出去的 A 版本自訂圖表元件
import CustomChartA from './CustomChartA';

import { 
  LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

// 2. 引入資料
import supplyDemandData from '../data/臺北市各行政區幼兒園供給與招生概況.json'; 
import enrollmentData from '../data/1141219-子計畫一 各類型教保服務機構入園人數統計表.json'; 
import institutionCountData from '../data/1141219-子計畫一各類型教保服務機構數量統計表.json'; 
import populationData from '../data/1141219-子計畫學齡前設籍人數與增減趨勢.json'; 
import surveyData from '../data/統計結果_前端專用.json';

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

const SURVEY_QUESTIONS = [
  { id: "01", text: "01.良好的環境與設備", short: "01.環境與設備" },
  { id: "02", text: "02.數位科技融入教學", short: "02.數位科技融入" },
  { id: "03", text: "03.合宜延長照顧服務(含課後或寒暑假收托)", short: "03.合宜延長收托" },
  { id: "04", text: "04.延長照顧服務收費合理(含課後或寒暑假收托)", short: "04.延長收托費用" },
  { id: "05", text: "05.師資的穩定與流動", short: "05.師資穩定" },
  { id: "06", text: "06.教師學經歷與專業", short: "06.教師專業能力" },
  { id: "07", text: "07.幼兒園安全與管理", short: "07.安全與管理" },
  { id: "08", text: "08.衛生防疫措施落實", short: "08.衛生防疫" },
  { id: "09", text: "09.餐點安全及可溯源", short: "09.餐點食材" },
  { id: "10", text: "10.每日大肌肉活動量", short: "10.大肌肉活動" },
  { id: "11", text: "11.安全教育課程實施", short: "11.安全教育課程" },
  { id: "12", text: "12.特色課程實施情形", short: "12.特色課程" },
  { id: "13", text: "13.戶外體驗活動多元", short: "13.戶外體驗活動" },
  { id: "14", text: "14.家長接送方便程度", short: "14.接送方便" },
  { id: "15", text: "15.親師溝通管道暢通", short: "15.親師溝通" },
  { id: "16", text: "16.親子活動充分參與", short: "16.親子活動" },
  { id: "17", text: "17.教師友善關心幼兒", short: "17.教師友善" }
];

const COLORS_PALETTE = ['#818cf8', '#34d399', '#fbbf24', '#fb7185', '#c084fc', '#2dd4bf', '#f472b6', '#a78bfa', '#f87171', '#60a5fa'];
const INST_COLORS = { '全部': '#64748b', '公立': '#3b82f6', '非營利': '#10b981', '準公共': '#f59e0b', '私立': '#ec4899', '職場互助教保服務中心': '#8b5cf6' };

const barRadius = 4;
const yearsList = ['112年', '113年', '114年'];
const rawYears = ['112', '113', '114'];
const instTypesList = ['全部', '公立', '非營利', '準公共', '私立', '職場互助教保服務中心'];

const norm = (str) => String(str || '').replace(/臺/g, '台').trim();
const safeParse = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/,/g, '');
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
};

// 計算 GAP 顏色
const getGapColor = (val) => {
  if (val === null || val === undefined || val === '-') return 'inherit';
  const num = Number(val);
  if (isNaN(num)) return 'inherit';
  if (num < 0) return '#ef4444'; // 紅色 (負的落差)
  if (num === 0) return '#f59e0b'; // 黃色 (零落差)
  return '#10b981'; // 綠色 (正向落差)
};

// 繪製自訂點狀標記
const renderShapeDot = (props, shape, isGapLine = false) => {
  const { cx, cy, value, stroke, key } = props;
  const fill = isGapLine ? getGapColor(value) : '#ffffff';
  const borderStroke = isGapLine ? getGapColor(value) : stroke;

  if (shape === 'diamond') {
    return <polygon key={key} points={`${cx},${cy-6} ${cx+6},${cy} ${cx},${cy+6} ${cx-6},${cy}`} fill={fill} stroke={borderStroke} strokeWidth={2} />;
  }
  if (shape === 'circle') {
    return <circle key={key} cx={cx} cy={cy} r={5} fill={fill} stroke={borderStroke} strokeWidth={2} />;
  }
  if (shape === 'square') {
    return <rect key={key} x={cx-5} y={cy-5} width={10} height={10} fill={fill} stroke={borderStroke} strokeWidth={2} />;
  }
  if (shape === 'triangle') {
    return <polygon key={key} points={`${cx},${cy-6} ${cx+6},${cy+6} ${cx-6},${cy+6}`} fill={fill} stroke={borderStroke} strokeWidth={2} />;
  }
  return <circle key={key} cx={cx} cy={cy} r={5} fill={fill} stroke={borderStroke} strokeWidth={2} />;
};

const toJSONInst = (val) => val === '職場互助教保服務中心' ? '教保中心' : val;

const exportToExcel = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const exportToPNG = async (elementRef, filename) => {
  if (elementRef.current) {
    const el = elementRef.current;
    const rect = el.getBoundingClientRect();
    const originalWidth = el.style.width;
    const originalHeight = el.style.height;
    
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;

    try {
      const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("圖片匯出失敗：", err);
    } finally {
      el.style.width = originalWidth;
      el.style.height = originalHeight;
    }
  }
};

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState(districtsMapping[0]); 
  const [activeTab, setActiveTab] = useState('supply'); 
  const [searchQuery, setSearchQuery] = useState(''); 
  
  const [mainSelectedInstType, setMainSelectedInstType] = useState('全部'); 
  const [selectedSubYears, setSelectedSubYears] = useState(['113年']); 
  const [selectedSubDistricts, setSelectedSubDistricts] = useState([]);
  
  const [surveySubTab, setSurveySubTab] = useState('dimension'); 
  const [selectedQuestion, setSelectedQuestion] = useState('01');
  const [selectedPriorityYears, setSelectedPriorityYears] = useState(['112年', '113年', '114年']);

  const supplyChartRef = useRef(null);
  const institutionChartRef = useRef(null);
  const subDistrictChartRef = useRef(null);
  const populationChartRef = useRef(null);
  const surveyChartRef = useRef(null);

  // --- 👇 加入絕對鎖定順序的 Custom Legend 元件 👇 ---
  const CustomSupplyLegend = () => (
    <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600 font-bold">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 bg-[#f59e0b] rounded-sm"></div>
        <span>核定招收({mainSelectedInstType})</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 bg-[#3b82f6] rounded-sm"></div>
        <span>實際在園({mainSelectedInstType})</span>
      </div>
    </div>
  );

  const CustomDimensionLegend = () => (
    <div className="flex justify-center gap-5 mt-4 text-sm font-bold flex-wrap">
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ overflow: 'visible' }}><polygon points="7,1 13,7 7,13 1,7" fill="#ffffff" stroke="#3b82f6" strokeWidth={2} /></svg>
        <span style={{color: '#3b82f6'}}>基礎條件</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ overflow: 'visible' }}><circle cx="7" cy="7" r="5.5" fill="#ffffff" stroke="#ec4899" strokeWidth={2} /></svg>
        <span style={{color: '#ec4899'}}>教保作為Gap</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ overflow: 'visible' }}><rect x="1.5" y="1.5" width="11" height="11" fill="#ffffff" stroke="#f59e0b" strokeWidth={2} /></svg>
        <span style={{color: '#f59e0b'}}>延長收托Gap</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ overflow: 'visible' }}><polygon points="7,1.5 13.5,12 0.5,12" fill="#ffffff" stroke="#8b5cf6" strokeWidth={2} /></svg>
        <span style={{color: '#8b5cf6'}}>其他Gap</span>
      </div>
    </div>
  );
  // --- 👆 加入絕對鎖定順序的 Custom Legend 元件 👆 ---

  const handleSelectDistrict = (id) => {
    const foundData = districtsMapping.find(item => item.id === id);
    if (foundData) setSelectedDistrict(foundData);
  };

  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districtsMapping;
    return districtsMapping.filter(d => d.name.includes(searchQuery.trim()) || d.id.includes(searchQuery.trim()));
  }, [searchQuery]);

  const currentDistrictData = useMemo(() => {
    if (!selectedDistrict) return null;
    return supplyDemandData.find(d => d.id === selectedDistrict.id) || null;
  }, [selectedDistrict]);

  const rawSubDistricts = currentDistrictData?.sub_districts || [];
  const validDistrictNames = useMemo(() => districtsMapping.filter(d => d.id !== '台北市').map(d => norm(d.name)), []);

  useEffect(() => {
    if (rawSubDistricts && rawSubDistricts.length > 0) {
      setSelectedSubDistricts([rawSubDistricts[0].name]);
    } else {
      setSelectedSubDistricts([]);
    }
  }, [selectedDistrict, rawSubDistricts]);

  const toggleSubDistrict = (name) => {
    setSelectedSubDistricts(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };
  const toggleSubYear = (year) => {
    setSelectedSubYears(prev => prev.includes(year) && prev.length > 1 ? prev.filter(y => y !== year) : (!prev.includes(year) ? [...prev, year] : prev));
  };
  const togglePriorityYear = (year) => {
    setSelectedPriorityYears(prev => prev.includes(year) && prev.length > 1 ? prev.filter(y => y !== year) : (!prev.includes(year) ? [...prev, year].sort() : prev));
  };

  const currentSupplyData = useMemo(() => {
    if (!enrollmentData || !populationData) return [];
    let popDataArray = selectedDistrict.id === '台北市' ? populationData.taipei_city_total || [] : populationData.districts?.[selectedDistrict.name] || [];
    return rawYears.map(year => {
      let yearData = enrollmentData.filter(d => String(d.學年度).replace('年','') === year);
      if (selectedDistrict.id !== '台北市') yearData = yearData.filter(d => norm(d.行政區) === norm(selectedDistrict.name));
      else yearData = yearData.filter(d => validDistrictNames.includes(norm(d.行政區)));
      
      let childPop = '-';
      const currentYearPopData = popDataArray.find(d => String(d.year) === year);
      if (currentYearPopData) {
        const sum = safeParse(currentYearPopData.age_2) + safeParse(currentYearPopData.age_3) + safeParse(currentYearPopData.age_4) + safeParse(currentYearPopData.age_5);
        childPop = sum > 0 ? sum : '-';
      }

      let entry = { year: `${year}年`, childPopulation: childPop };
      let hasData = false;

      const inst = mainSelectedInstType;
      const jsonInst = toJSONInst(inst); 
      
      let app = 0, stu = 0;
      yearData.forEach(d => {
        if (inst === '全部' || norm(d.設立別) === norm(jsonInst)) {
          app += safeParse(d.核定招生人數);
          stu += safeParse(d.入園人數);
        }
      });
      if (app > 0 || stu > 0) hasData = true;
      entry[`appEnroll_${inst}`] = app;
      entry[`stuAmount_${inst}`] = stu;
      entry[`occupancyRate_${inst}`] = app > 0 ? Number(((stu / app) * 100).toFixed(2)) : 0;

      entry.hasData = hasData;
      return entry;
    }).filter(d => d.hasData || d.childPopulation !== '-'); 
  }, [selectedDistrict, validDistrictNames, mainSelectedInstType]);

  const institutionData = useMemo(() => {
    if (!institutionCountData || !selectedDistrict) return [];
    const distKey = Object.keys(institutionCountData).find(k => norm(k) === norm(selectedDistrict.id === '台北市' ? '台北市' : selectedDistrict.name));
    const data = institutionCountData[distKey] || [];
    return data.filter(d => rawYears.includes(String(d.學年度).replace('年',''))).map(d => ({
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

  const currentSubDistrictsForYear = useMemo(() => {
    if (!rawSubDistricts || rawSubDistricts.length === 0) return [];
    let result = [];
    rawSubDistricts.filter(sub => selectedSubDistricts.includes(sub.name)).forEach(sub => {
        selectedSubYears.forEach(year => {
           const cleanYear = year.replace('年', ''); 
           const yearStat = sub.yearly_stats?.find(y => String(y.year).replace('年', '') === cleanYear);
           if (yearStat) result.push({ name: `${sub.name} (${year})`, subName: sub.name, year: year, appEnroll: safeParse(yearStat.appEnroll), stuAmount: safeParse(yearStat.stuAmount), occupancyRate: yearStat.occupancyRate || 0 });
        });
      });
    return result;
  }, [rawSubDistricts, selectedSubYears, selectedSubDistricts]);

  const cityPopulationData = useMemo(() => {
    if (!populationData || !selectedDistrict) return [];
    let popDataArray = selectedDistrict.id === '台北市' ? populationData.taipei_city_total || [] : populationData.districts?.[selectedDistrict.name] || [];
    if (!Array.isArray(popDataArray)) return [];
    return popDataArray
      .filter(data => rawYears.includes(String(data.year)))
      .map(data => ({
        year: `${data.year}年`, total: safeParse(data.total), changeRatio: data.growth_rate !== null ? data.growth_rate : null, age0: safeParse(data.age_0), age1: safeParse(data.age_1), age2: safeParse(data.age_2), age3: safeParse(data.age_3), age4: safeParse(data.age_4), age5: safeParse(data.age_5)
      }));
  }, [selectedDistrict]);

  const surveyStats = useMemo(() => {
    if (!surveyData || !selectedDistrict) return [];
    const targetName = selectedDistrict.id === '台北市' ? '台北市整體' : selectedDistrict.name;
    const filtered = surveyData.filter(d => norm(d.分區) === norm(targetName) && rawYears.includes(String(d.年份).replace('年',''))).sort((a, b) => a.年份 - b.年份);
    
    return rawYears.map(year => {
      const yearData = filtered.find(d => String(d.年份) === year);
      let entry = { year: `${year}年`, raw: yearData };
      let totalSample = 0;
      
      const inst = mainSelectedInstType;
      const jsonInst = toJSONInst(inst); 
      const source = inst === '全部' ? yearData : yearData?.機構別?.[jsonInst];
      
      const sample = source?.資料筆數 || 0;
      totalSample += sample;
      entry[`sampleSize_${inst}`] = sample;
      
      const calcGap = (perf, req) => (perf != null && req != null) ? Number((perf - req).toFixed(2)) : null;
      entry[`gapBase_${inst}`] = calcGap(source?.構面?.['教保基礎條件']?.滿意度, source?.構面?.['教保基礎條件']?.需求度) ?? source?.構面?.['教保基礎條件']?.Gap ?? null;
      entry[`gapAction_${inst}`] = calcGap(source?.構面?.['教保作為']?.滿意度, source?.構面?.['教保作為']?.需求度) ?? source?.構面?.['教保作為']?.Gap ?? null;
      entry[`gapExtend_${inst}`] = calcGap(source?.構面?.['延長收托安置']?.滿意度, source?.構面?.['延長收托安置']?.需求度) ?? source?.構面?.['延長收托安置']?.Gap ?? null;
      entry[`gapOther_${inst}`] = calcGap(source?.構面?.['其他']?.滿意度, source?.構面?.['其他']?.需求度) ?? source?.構面?.['其他']?.Gap ?? null;
      
      entry.sampleSize = totalSample;
      return entry;
    });
  }, [selectedDistrict, mainSelectedInstType]);

  const questionStats = useMemo(() => {
    if (!surveyData || !selectedDistrict) return [];
    const targetName = selectedDistrict.id === '台北市' ? '台北市整體' : selectedDistrict.name;
    const filtered = surveyData.filter(d => norm(d.分區) === norm(targetName) && rawYears.includes(String(d.年份).replace('年','')));
    
    return rawYears.map(year => {
      const yearData = filtered.find(d => String(d.年份) === year);
      let entry = { year: `${year}年` };
      let hasData = false;
      
      const inst = mainSelectedInstType;
      const jsonInst = toJSONInst(inst); 
      const source = inst === '全部' ? yearData : yearData?.機構別?.[jsonInst];
      
      const req = source?.逐題?.[selectedQuestion]?.需求度 ?? 0;
      const perf = source?.逐題?.[selectedQuestion]?.滿意度 ?? 0;
      const gap = (perf !== 0 && req !== 0) ? Number((perf - req).toFixed(2)) : 0;
      if (req > 0) hasData = true;
      entry[`req_${inst}`] = req;
      entry[`perf_${inst}`] = perf;
      entry[`gap_${inst}`] = gap;
      
      entry.hasData = hasData;
      return entry;
    });
  }, [selectedDistrict, mainSelectedInstType, selectedQuestion]);

  const priorityStats = useMemo(() => {
    if (!surveyData || !selectedDistrict) return [];
    const targetName = selectedDistrict.id === '台北市' ? '台北市整體' : selectedDistrict.name;
    const filtered = surveyData.filter(d => norm(d.分區) === norm(targetName) && rawYears.includes(String(d.年份).replace('年','')));
    
    const shortKeys = {
      "(01)公立或私立": "公私立", "(02)接送方便": "接送方便", "(03)收托時間長短（含寒暑假）": "收托時間",
      "(04)網路評價": "網路評價", "(05)課後延托費用高低": "延托費用", "(06)班級幼兒數多寡": "班級人數",
      "(07)幼兒對學校好感度": "幼兒好感", "(08)辦學特色": "辦學特色", "(09)親友推薦": "親友推薦",
      "(10)學校獲得獎項肯定": "獲獎肯定", "(11)活動空間": "活動空間", "(12)學雜費多寡": "學雜費", "(13)其他": "其他"
    };

    let result = Object.keys(shortKeys).map(k => ({ name: shortKeys[k], originalKey: k }));
    
    result.forEach(r => {
      selectedPriorityYears.forEach(yearStr => {
        r[yearStr] = 0;
        const d = filtered.find(x => `${x.年份}年` === yearStr);
        if (d) {
          const jsonInst = toJSONInst(mainSelectedInstType); 
          const source = mainSelectedInstType === '全部' ? d : d.機構別?.[jsonInst];
          r[yearStr] = source?.優先關注因素?.[r.originalKey] || 0;
        }
      });
    });

    result.sort((a, b) => {
       const sumA = selectedPriorityYears.reduce((acc, y) => acc + a[y], 0);
       const sumB = selectedPriorityYears.reduce((acc, y) => acc + b[y], 0);
       return sumB - sumA;
    });

    return result.filter(r => selectedPriorityYears.some(y => r[y] > 0)); 
  }, [selectedDistrict, mainSelectedInstType, selectedPriorityYears]);


  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center font-sans">
      
      <header className="text-center mb-8 w-full max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2">臺北市幼兒教育資源與人口供需整合儀表板</h1>
        <p className="text-slate-500 text-sm md:text-base mb-2">資料年份限定: 112年 ~ 114年 - 整合機構數量與次分區招生概況</p>
      </header>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">選擇行政區</label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">對應：{selectedDistrict.name}</span>
            </div>

            <button 
              onClick={() => handleSelectDistrict('台北市')}
              className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all border text-center shadow-sm ${selectedDistrict?.id === '台北市' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}
            >
              臺北市 (全區)
            </button>

            <div className="flex flex-col gap-2 mt-2">
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋區名..." className="w-full pl-3 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 max-h-52 overflow-y-auto">
                {filteredDistricts.filter(d => d.id !== '台北市').map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => handleSelectDistrict(item.id)} 
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 border text-center ${selectedDistrict?.id === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className={`bg-white p-4 rounded-3xl shadow-md border border-slate-100 flex-grow flex items-center justify-center min-h-[360px] taipei-map-container ${selectedDistrict?.id === '台北市' ? 'highlight-all' : ''}`}>
            {selectedDistrict?.id === '台北市' && (
              <style>{`
                .taipei-map-container.highlight-all svg path {
                  fill: #93c5fd !important;
                  stroke: #ffffff !important;
                  transition: all 0.3s ease;
                }
                .taipei-map-container.highlight-all svg path:hover {
                  fill: #3b82f6 !important;
                }
              `}</style>
            )}
            <TaipeiMap selectedId={selectedDistrict?.id} selectedName={selectedDistrict?.name} activeId={selectedDistrict?.id} selectedDistrict={selectedDistrict} onSelect={handleSelectDistrict} />
          </div>
        </div>

        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">SELECTED REGION</span>
              <h2 className="text-3xl font-bold text-slate-800">{selectedDistrict.name}</h2>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap gap-1">
              <button onClick={() => setActiveTab('supply')} className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'supply' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>供給招生</button>
              <button onClick={() => setActiveTab('institutions')} className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'institutions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>機構數與公共化</button>
              {selectedDistrict.id !== '台北市' && rawSubDistricts.length > 0 && <button onClick={() => setActiveTab('subdistrict')} className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'subdistrict' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>次分區概況</button>}
              <button onClick={() => setActiveTab('population')} className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'population' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>人口趨勢</button>
              <button onClick={() => setActiveTab('survey')} className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'survey' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-200' : 'text-slate-500 hover:text-emerald-500'}`}>滿意度分析</button>
            </div>
          </div>

          {activeTab === 'supply' && (
            <div className="flex flex-col gap-6 bg-white p-2">
              <div className="flex justify-between items-center border-b pb-3 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">機構切換：</span>
                  {instTypesList.map(type => (
                    <button 
                      key={type} 
                      onClick={() => setMainSelectedInstType(type)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${mainSelectedInstType === type ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportToExcel(currentSupplyData, `供給招生_${selectedDistrict.name}`)} className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                  <button onClick={() => exportToPNG(supplyChartRef, `供給招生_${selectedDistrict.name}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
                </div>
              </div>
              <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                <div ref={supplyChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">歷年幼兒園核定招收量 vs. 實際在園人數 {`(${mainSelectedInstType})`}</h3>
                  <div className="h-56">
                    {currentSupplyData.length > 0 && currentSupplyData.some(d => d[`appEnroll_${mainSelectedInstType}`] > 0 || d[`stuAmount_${mainSelectedInstType}`] > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentSupplyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                          <YAxis tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                          <Tooltip formatter={(value, name) => [`${value} 人`, name]} />
                          
                          {/* 📌 使用強制覆寫的自訂圖例元件 */}
                          <Legend content={<CustomSupplyLegend />} />

                          <Bar isAnimationActive={false} dataKey={`appEnroll_${mainSelectedInstType}`} name={`核定招收(${mainSelectedInstType})`} fill="#f59e0b" radius={[4,4,0,0]} />
                          <Bar isAnimationActive={false} dataKey={`stuAmount_${mainSelectedInstType}`} name={`實際在園(${mainSelectedInstType})`} fill="#3b82f6" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域或所選機構尚無符合年份之資料</div>)}
                  </div>
                  
                  {currentSupplyData.length > 0 && currentSupplyData.some(d => d[`appEnroll_${mainSelectedInstType}`] > 0 || d[`stuAmount_${mainSelectedInstType}`] > 0) && (
                    <div className="mt-6 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                      <table className="w-full text-sm text-center text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                          <tr>
                            <th className="px-4 py-3 text-left border-r border-slate-100">年份</th>
                            <th className="px-4 py-3 border-r border-slate-100">機構類型</th>
                            <th className="px-4 py-3 border-r border-slate-100">核定招收人數</th>
                            <th className="px-4 py-3 border-r border-slate-100">實際在園人數</th>
                            <th className="px-4 py-3">招生率(%)<div className="text-[10px] font-normal text-slate-500 mt-0.5">招生率＝實際招收÷核定招收</div></th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSupplyData.flatMap(row => {
                              const inst = mainSelectedInstType;
                              if (row[`appEnroll_${inst}`] > 0 || row[`stuAmount_${inst}`] > 0) {
                                return (
                                  <tr key={`${row.year}-${inst}`} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                                    <td className="px-4 py-3 font-semibold text-left border-r border-slate-100">{row.year}</td>
                                    <td className="px-4 py-3 font-bold border-r border-slate-100" style={{color: INST_COLORS[inst]}}>{inst}</td>
                                    <td className="px-4 py-3 border-r border-slate-100">{row[`appEnroll_${inst}`]}</td>
                                    <td className="px-4 py-3 border-r border-slate-100">{row[`stuAmount_${inst}`]}</td>
                                    <td className="px-4 py-3 font-medium" style={{color: INST_COLORS[inst]}}>{row[`occupancyRate_${inst}`]}%</td>
                                  </tr>
                                );
                              }
                              return null;
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {activeTab === 'institutions' && (
            <div className="flex flex-col gap-5 bg-white p-2">
              <div className="flex justify-end gap-2">
                <button onClick={() => exportToExcel(institutionData, `機構與公共化_${selectedDistrict.name}`)} className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                <button onClick={() => exportToPNG(institutionChartRef, `機構與公共化_${selectedDistrict.name}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
              </div>
              <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                <div ref={institutionChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{selectedDistrict.name} 歷年機構數量與公共化佔比</h3>
                  <div className="text-rose-600 text-xs md:text-sm font-bold bg-rose-50 p-2.5 rounded-lg mb-4 border border-rose-200">
                    💡 特別註明：公共化占比是「機構數量占比」，不是公共化幼兒園招生名額占比，也不是幼兒就讀公共化機構的人數占比。
                  </div>
                  <div className="h-72">
                    {institutionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={institutionData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" tickLine={false} />
                          <YAxis yAxisId="left" tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tickLine={false} unit="%" />
                          <Tooltip formatter={(value, name) => name.includes('佔比') ? [`${value}%`, name] : [`${value} 間`, name]} />
                          <Legend />
                          <Bar isAnimationActive={false} yAxisId="left" dataKey="publicCount" stackId="a" name="公立" fill="#3b82f6" />
                          <Bar isAnimationActive={false} yAxisId="left" dataKey="nonProfitCount" stackId="a" name="非營利" fill="#10b981" />
                          <Bar isAnimationActive={false} yAxisId="left" dataKey="quasiPublicCount" stackId="a" name="準公共" fill="#f59e0b" />
                          <Bar isAnimationActive={false} yAxisId="left" dataKey="educareCount" stackId="a" name="職場互助教保服務中心" fill="#8b5cf6" />
                          <Bar isAnimationActive={false} yAxisId="left" dataKey="privateCount" stackId="a" name="私立" fill="#ec4899" radius={[4, 4, 0, 0]} />
                          <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="publicRatio" name="公共化佔比 (%)" stroke="#64748b" strokeWidth={4} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域尚無符合年份之資料</div>)}
                  </div>

                  {institutionData.length > 0 && (
                    <div className="mt-6 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                      <table className="w-full text-sm text-center text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                          <tr>
                            <th className="px-3 py-3 text-left border-r border-slate-100">年份</th>
                            <th className="px-3 py-3 border-r border-slate-100">公立</th>
                            <th className="px-3 py-3 border-r border-slate-100">非營利</th>
                            <th className="px-3 py-3 border-r border-slate-100">準公共</th>
                            <th className="px-3 py-3 border-r border-slate-100">職場互助教保服務中心</th>
                            <th className="px-3 py-3 border-r border-slate-100">私立</th>
                            <th className="px-3 py-3 border-r border-slate-100">合計</th>
                            <th className="px-3 py-3">公共化佔比</th>
                          </tr>
                        </thead>
                        <tbody>
                          {institutionData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                              <td className="px-3 py-3 font-semibold text-left border-r border-slate-100">{row.year}</td>
                              <td className="px-3 py-3 border-r border-slate-100">{row.publicCount}</td>
                              <td className="px-3 py-3 border-r border-slate-100">{row.nonProfitCount}</td>
                              <td className="px-3 py-3 border-r border-slate-100">{row.quasiPublicCount}</td>
                              <td className="px-3 py-3 border-r border-slate-100">{row.educareCount}</td>
                              <td className="px-3 py-3 border-r border-slate-100">{row.privateCount}</td>
                              <td className="px-3 py-3 border-r border-slate-100 font-bold">{row.totalCount}</td>
                              <td className="px-3 py-3 font-medium text-slate-700">{row.rawRatio}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {activeTab === 'subdistrict' && selectedDistrict.id !== '台北市' && (
            <div className="flex flex-col gap-6 bg-white p-2">
              <div className="flex justify-between flex-col md:flex-row gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs font-bold">選擇年份(可多選)：</span>
                    {yearsList.map(y => <button key={y} onClick={() => toggleSubYear(y)} className={`px-2 py-1 rounded text-xs transition-all ${selectedSubYears.includes(y) ? 'bg-purple-600 text-white shadow' : 'bg-slate-200 hover:bg-purple-100'}`}>{y}</button>)}
                  </div>
                  {/* 新增了次分區選擇器，可自由勾選要顯示的次分區 */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs font-bold">選擇次分區(多選)：</span>
                    <button 
                      onClick={() => {
                        if (selectedSubDistricts.length === rawSubDistricts.length) setSelectedSubDistricts([]);
                        else setSelectedSubDistricts(rawSubDistricts.map(s => s.name));
                      }}
                      className="px-2 py-1 rounded text-xs transition-all bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                    >
                      {selectedSubDistricts.length === rawSubDistricts.length ? '全取消' : '全選'}
                    </button>
                    {rawSubDistricts.map(sub => (
                      <button 
                        key={sub.name} 
                        onClick={() => toggleSubDistrict(sub.name)} 
                        className={`px-2 py-1 rounded text-xs transition-all ${selectedSubDistricts.includes(sub.name) ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 h-fit">
                  <button onClick={() => exportToExcel(currentSubDistrictsForYear, `次分區_${selectedSubYears.join('_')}`)} className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                  <button onClick={() => exportToPNG(subDistrictChartRef, `次分區_${selectedSubYears.join('_')}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
                </div>
              </div>
              <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                <div ref={subDistrictChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{selectedDistrict.name} 次分區招生概況</h3>
                  <div className="h-56">
                    {currentSubDistrictsForYear.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentSubDistrictsForYear}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tickLine={false} tick={{fontSize: 11}} />
                          <YAxis tickLine={false} />
                          <Tooltip formatter={(value, name) => name.includes('率') ? [`${value}%`, name] : [`${value} 人`, name]} />
                          <Legend />
                          <Bar isAnimationActive={false} dataKey="appEnroll" name="核定招收人數" fill="#c084fc" radius={barRadius} />
                          <Bar isAnimationActive={false} dataKey="stuAmount" name="實際在園人數" fill="#a855f7" radius={barRadius} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">請至少選擇一個次分區與年份</div>)}
                  </div>

                  {currentSubDistrictsForYear.length > 0 && (
                    <div className="mt-6 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                      <table className="w-full text-sm text-center text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                          <tr>
                            <th className="px-4 py-3 text-left border-r border-slate-100">次分區(年份)</th>
                            <th className="px-4 py-3 border-r border-slate-100">核定招收人數</th>
                            <th className="px-4 py-3 border-r border-slate-100">實際在園人數</th>
                            <th className="px-4 py-3">招生率(%)<div className="text-[10px] font-normal text-slate-500 mt-0.5">招生率＝實際招收÷核定招收</div></th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSubDistrictsForYear.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                              <td className="px-4 py-3 font-semibold text-left border-r border-slate-100">{row.name}</td>
                              <td className="px-4 py-3 border-r border-slate-100">{row.appEnroll}</td>
                              <td className="px-4 py-3 border-r border-slate-100">{row.stuAmount}</td>
                              <td className="px-4 py-3 font-medium text-purple-600">{row.occupancyRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {activeTab === 'population' && (
            <div className="flex flex-col gap-5 bg-white p-2">
              <div className="flex justify-end gap-2">
                <button onClick={() => exportToExcel(cityPopulationData, `人口趨勢_${selectedDistrict.name}`)} className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                <button onClick={() => exportToPNG(populationChartRef, `人口趨勢_${selectedDistrict.name}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
              </div>
              <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                <div ref={populationChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{selectedDistrict.name} 學齡前設籍人數與增減趨勢</h3>
                  <div className="h-56">
                    {cityPopulationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cityPopulationData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="year" tickLine={false} />
                          <YAxis yAxisId="left" tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tickLine={false} unit="%" />
                          <Tooltip formatter={(value, name) => name.includes('率') ? [`${value}%`, name] : [`${value} 人`, name]} />
                          <Legend />
                          <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="total" name="學齡前設籍人數" stroke="#3b82f6" strokeWidth={3} />
                          <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="changeRatio" name="學齡前設籍人口增減率（%）" stroke="#ef4444" strokeWidth={2} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域尚無符合年份之資料</div>)}
                  </div>

                  {cityPopulationData.length > 0 && (
                    <div className="mt-6 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                      <table className="w-full text-sm text-center text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                          <tr>
                            <th className="px-4 py-3 text-left border-r border-slate-100">年份</th>
                            <th className="px-4 py-3 border-r border-slate-100">學齡前設籍人數</th>
                            <th className="px-4 py-3">學齡前設籍人口增減率（%）</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cityPopulationData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                              <td className="px-4 py-3 font-semibold text-left border-r border-slate-100">{row.year}</td>
                              <td className="px-4 py-3 border-r border-slate-100">{row.total}</td>
                              <td className="px-4 py-3 font-medium text-red-500">{row.changeRatio !== null ? `${row.changeRatio}%` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {activeTab === 'survey' && (
            <div className="flex flex-col gap-5 bg-white p-2">
              
              <div className="flex justify-between items-center border-b pb-3 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">機構切換：</span>
                  {instTypesList.map(type => (
                    <button 
                      key={type} 
                      onClick={() => setMainSelectedInstType(type)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${mainSelectedInstType === type ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {(surveySubTab === 'dimension' || surveySubTab === 'question') && (
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="text-sm text-slate-700 w-full">
                    <p className="font-bold text-slate-800 flex justify-between items-center">
                      <span>Gap 品質落差公式：滿意度 － 需求度</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center border-b pb-2 mt-2">
                <div className="flex">
                  <button onClick={() => setSurveySubTab('dimension')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${surveySubTab === 'dimension' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-emerald-400'}`}>四大構面趨勢</button>
                  <button onClick={() => setSurveySubTab('question')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${surveySubTab === 'question' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-emerald-400'}`}>逐題檢視(柱狀圖)</button>
                  <button onClick={() => setSurveySubTab('priority')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${surveySubTab === 'priority' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-emerald-400'}`}>最在意因素(長條圖)</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportToExcel(
                    surveySubTab === 'dimension' ? surveyStats : 
                    surveySubTab === 'question' ? questionStats : priorityStats, 
                    `滿意度_${surveySubTab}_${selectedDistrict.name}`)} 
                    className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                  <button onClick={() => exportToPNG(surveyChartRef, `滿意度_${surveySubTab}_${selectedDistrict.name}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
                </div>
              </div>

              {surveySubTab === 'dimension' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                    <div ref={surveyChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                      <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{selectedDistrict.name} {`(${mainSelectedInstType})`} 歷年四大構面 品質落差 (Gap)</h3>
                      <div className="h-64">
                        {surveyStats.length > 0 && surveyStats.some(d => d.sampleSize > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={surveyStats}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="year" tickLine={false} />
                              <YAxis tickLine={false} />
                              <Tooltip formatter={(value, name) => [`${value} 分`, name]} />
                              
                              {/* 📌 使用強制覆寫的自訂圖例元件 */}
                              <Legend content={<CustomDimensionLegend />} />

                              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Line isAnimationActive={false} type="monotone" dataKey={`gapBase_${mainSelectedInstType}`} name={`基礎條件`} stroke="#3b82f6" strokeWidth={3} strokeDasharray="" dot={(props) => renderShapeDot(props, 'diamond', true)} legendType="diamond" />
                              <Line isAnimationActive={false} type="monotone" dataKey={`gapAction_${mainSelectedInstType}`} name={`教保作為Gap`} stroke="#ec4899" strokeWidth={3} strokeDasharray="5 5" dot={(props) => renderShapeDot(props, 'circle', true)} legendType="circle" />
                              <Line isAnimationActive={false} type="monotone" dataKey={`gapExtend_${mainSelectedInstType}`} name={`延長收托Gap`} stroke="#f59e0b" strokeWidth={3} strokeDasharray="3 3" dot={(props) => renderShapeDot(props, 'square', true)} legendType="square" />
                              <Line isAnimationActive={false} type="monotone" dataKey={`gapOther_${mainSelectedInstType}`} name={`其他Gap`} stroke="#8b5cf6" strokeWidth={3} strokeDasharray="10 5" dot={(props) => renderShapeDot(props, 'triangle', true)} legendType="triangle" />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域或所選機構尚無滿意度問卷資料</div>)}
                      </div>

                      {surveyStats.length > 0 && surveyStats.some(d => d.sampleSize > 0) && (
                        <div className="mt-6 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                          <table className="w-full text-sm text-center text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                <th className="px-4 py-3 text-left border-r border-slate-100">年份</th>
                                <th className="px-4 py-3 border-r border-slate-100">機構類型</th>
                                <th className="px-4 py-3 border-r border-slate-100">有效樣本數</th>
                                <th className="px-4 py-3 border-r border-slate-100">基礎條件</th>
                                <th className="px-4 py-3 border-r border-slate-100">教保作為Gap</th>
                                <th className="px-4 py-3 border-r border-slate-100">延長收托Gap</th>
                                <th className="px-4 py-3">其他Gap</th>
                              </tr>
                            </thead>
                            <tbody>
                              {surveyStats.flatMap(row => {
                                  const inst = mainSelectedInstType;
                                  if (row[`sampleSize_${inst}`] > 0) {
                                    return (
                                      <tr key={`${row.year}-${inst}`} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                                        <td className="px-4 py-3 font-semibold text-left border-r border-slate-100">{row.year}</td>
                                        <td className="px-4 py-3 font-bold border-r border-slate-100" style={{color: INST_COLORS[inst]}}>{inst}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">{row[`sampleSize_${inst}`]}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 font-bold" style={{ color: row[`gapBase_${inst}`] !== null ? getGapColor(row[`gapBase_${inst}`]) : 'inherit' }}>{row[`gapBase_${inst}`] !== null ? row[`gapBase_${inst}`] : '-'}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 font-bold" style={{ color: row[`gapAction_${inst}`] !== null ? getGapColor(row[`gapAction_${inst}`]) : 'inherit' }}>{row[`gapAction_${inst}`] !== null ? row[`gapAction_${inst}`] : '-'}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 font-bold" style={{ color: row[`gapExtend_${inst}`] !== null ? getGapColor(row[`gapExtend_${inst}`]) : 'inherit' }}>{row[`gapExtend_${inst}`] !== null ? row[`gapExtend_${inst}`] : '-'}</td>
                                        <td className="px-4 py-3 font-bold" style={{ color: row[`gapOther_${inst}`] !== null ? getGapColor(row[`gapOther_${inst}`]) : 'inherit' }}>{row[`gapOther_${inst}`] !== null ? row[`gapOther_${inst}`] : '-'}</td>
                                      </tr>
                                    );
                                  }
                                  return null;
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

              {surveySubTab === 'question' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border flex flex-col gap-4">
                    <select value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)} className="p-2 border rounded-lg max-w-md text-sm font-semibold text-slate-700">
                      {SURVEY_QUESTIONS.map(q => <option key={q.id} value={q.id}>{q.text}</option>)}
                    </select>
                    <div ref={surveyChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                      <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{SURVEY_QUESTIONS.find(q=>q.id===selectedQuestion)?.short} 滿意度分析 {`(${mainSelectedInstType})`}</h3>
                      <div className="h-64">
                        {questionStats.length > 0 && questionStats.some(d => d.hasData) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={questionStats} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="year" tickLine={false} />
                              <YAxis tickLine={false} />
                              <Tooltip formatter={(value, name) => [`${value} 分`, name]} />
                              <Legend />
                              <Bar isAnimationActive={false} dataKey={`req_${mainSelectedInstType}`} name={`需求(${mainSelectedInstType})`} fill={INST_COLORS[mainSelectedInstType] || '#ec4899'} fillOpacity={0.4} radius={[4,4,0,0]} />
                              <Bar isAnimationActive={false} dataKey={`perf_${mainSelectedInstType}`} name={`滿意(${mainSelectedInstType})`} fill={INST_COLORS[mainSelectedInstType] || '#3b82f6'} fillOpacity={0.8} radius={[4,4,0,0]} />
                              <Bar isAnimationActive={false} dataKey={`gap_${mainSelectedInstType}`} name={`落差(${mainSelectedInstType})`} radius={[4,4,0,0]}>
                                {questionStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={getGapColor(entry[`gap_${mainSelectedInstType}`])} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域或所選機構尚無此題問卷資料</div>)}
                      </div>

                      {questionStats.length > 0 && questionStats.some(d => d.hasData) && (
                        <div className="mt-6 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                          <table className="w-full text-sm text-center text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                <th className="px-4 py-3 text-left border-r border-slate-100">年份</th>
                                <th className="px-4 py-3 border-r border-slate-100">機構類型</th>
                                <th className="px-4 py-3 border-r border-slate-100">需求程度</th>
                                <th className="px-4 py-3 border-r border-slate-100">滿意程度</th>
                                <th className="px-4 py-3">品質落差 (Gap)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {questionStats.flatMap(row => {
                                  const inst = mainSelectedInstType;
                                  if (row[`req_${inst}`] > 0) {
                                    return (
                                      <tr key={`${row.year}-${inst}`} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                                        <td className="px-4 py-3 font-semibold text-left border-r border-slate-100">{row.year}</td>
                                        <td className="px-4 py-3 font-bold border-r border-slate-100" style={{color: INST_COLORS[inst]}}>{inst}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 font-medium" style={{color: INST_COLORS[inst], opacity: 0.7}}>{row[`req_${inst}`]}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 font-medium" style={{color: INST_COLORS[inst]}}>{row[`perf_${inst}`]}</td>
                                        <td className="px-4 py-3 font-bold" style={{color: getGapColor(row[`gap_${inst}`])}}>{row[`gap_${inst}`]}</td>
                                      </tr>
                                    );
                                  }
                                  return null;
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

              {surveySubTab === 'priority' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border flex flex-col gap-4">
                    <div className="flex gap-2 items-center flex-wrap mb-1 border-b border-slate-200 pb-3">
                      <span className="text-xs font-bold text-slate-600">選擇年份(影響排序與堆疊)：</span>
                      {yearsList.map(y => (
                        <button 
                          key={y} 
                          onClick={() => togglePriorityYear(y)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${selectedPriorityYears.includes(y) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>

                    <div ref={surveyChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                      <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{selectedDistrict.name} 家長最在意因素年度比較 {`(${mainSelectedInstType})`}</h3>
                      <div className="h-96">
                        {priorityStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityStats} layout="vertical" margin={{ top: 10, right: 30, bottom: 20, left: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                              <XAxis type="number" tickLine={false} />
                              <YAxis type="category" dataKey="name" tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#475569'}} width={80} />
                              <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value, name) => [`${value} 人`, name]} />
                              <Legend wrapperStyle={{paddingTop: '10px'}} />
                              {selectedPriorityYears.map((year, i) => (
                                <Bar key={year} stackId="a" isAnimationActive={false} dataKey={year} name={year} fill={COLORS_PALETTE[i % COLORS_PALETTE.length]} />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域、年份或所選機構尚無最在意因素資料</div>)}
                      </div>

                      {priorityStats.length > 0 && (
                        <div className="mt-6 overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                          <table className="w-full text-sm text-center text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                <th className="px-4 py-3 text-left border-r border-slate-100">關注因素</th>
                                {selectedPriorityYears.map((year, i) => (
                                  <th key={year} className="px-4 py-3 border-r border-slate-100 last:border-r-0" style={{color: COLORS_PALETTE[i % COLORS_PALETTE.length]}}>{year}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {priorityStats.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                                  <td className="px-4 py-3 font-semibold text-left border-r border-slate-100">{row.name}</td>
                                  {selectedPriorityYears.map(year => (
                                    <td key={year} className="px-4 py-3 border-r border-slate-100 last:border-r-0">{row[year]}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 自訂圖表元件已抽離至 CustomChartA.jsx，這裡直接呼叫它 */}
      <CustomChartA />

    </div>
  );
}