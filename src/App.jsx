import React, { useState, useMemo, useEffect, useRef } from 'react';
import TaipeiMap from './components/TaipeiMap';
import { 
  LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

import supplyDemandData from './data/臺北市各行政區幼兒園供給與招生概況.json'; 
import enrollmentData from './data/1141219-子計畫一 各類型教保服務機構入園人數統計表.json'; 
import institutionCountData from './data/1141219-子計畫一各類型教保服務機構數量統計表.json'; 
import populationData from './data/1141219-子計畫學齡前設籍人數與增減趨勢.json'; 
import surveyData from './data/統計結果_前端專用.json'; 

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

const SURVEY_G1 = ['01', '06', '07', '08', '09', '14']; 
const SURVEY_G2 = ['02', '05', '10', '11', '12', '15', '16']; 
const SURVEY_G3 = ['03', '04']; 
const SURVEY_G4 = ['13', '17']; 

const CATEGORY_OPTIONS = [
  { value: 'basic', label: '📊 基本資訊' },
  { value: 'inst', label: '🏫 機構數與公共化' },
  { value: 'survey', label: '⭐ 滿意度分析' }
];

const BASIC_SUB_OPTIONS = [
  { id: 'appEnroll', name: '核定招收' },
  { id: 'stuAmount', name: '實際在園' },
  { id: 'occupancyRate', name: '入園率(%)' },
  { id: 'popTotal', name: '學齡前設籍' }
];

const INST_SUB_OPTIONS = [
  { id: 'public', name: '公立' },
  { id: 'nonProfit', name: '非營利' },
  { id: 'quasiPublic', name: '準公共' },
  { id: 'educare', name: '教保中心' },
  { id: 'private', name: '私立' },
  { id: 'total', name: '總計' },
  { id: 'publicRatio', name: '公共化佔比(%)' }
];

const getSurveyShortName = (val) => {
  if (val.startsWith('dim_')) return val.replace('dim_', '');
  const qId = val.replace('q_', '');
  const q = SURVEY_QUESTIONS.find(x => x.id === qId);
  return q ? q.short : val;
};

const SURVEY_SUB_OPTIONS = [
  { id: 'all', name: '全部加入 (需求/滿意/Gap)' },
  { id: 'req', name: '需求程度' },
  { id: 'perf', name: '滿意程度' },
  { id: 'gap', name: '品質落差 (Gap)' }
];

const COLORS_PALETTE = ['#818cf8', '#34d399', '#fbbf24', '#fb7185', '#c084fc', '#2dd4bf', '#f472b6', '#a78bfa', '#f87171', '#60a5fa'];
const barRadius = 4;
const yearsList = ['112年', '113年', '114年'];
const rawYears = ['112', '113', '114'];
const norm = (str) => String(str || '').replace(/臺/g, '台').trim();
const safeParse = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/,/g, '');
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
};

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
      alert("圖片匯出時發生錯誤，請檢查開發者工具(Console)。");
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
  
  const [selectedSubYears, setSelectedSubYears] = useState(['113年']); 
  const [selectedSubDistricts, setSelectedSubDistricts] = useState([]);
  
  const [surveySubTab, setSurveySubTab] = useState('dimension'); 
  const [selectedQuestion, setSelectedQuestion] = useState('01');

  const [customSelectedYears, setCustomSelectedYears] = useState(['112年', '113年', '114年']);
  const [customSelectedRegions, setCustomSelectedRegions] = useState(['臺北市']);
  const [customSelectedMainDistrict, setCustomSelectedMainDistrict] = useState('');
  
  const [activeCategory, setActiveCategory] = useState('basic'); 
  const [activeSubItem, setActiveSubItem] = useState(BASIC_SUB_OPTIONS[0].id);
  const [activeSurveyMetric, setActiveSurveyMetric] = useState(SURVEY_SUB_OPTIONS[0].id);

  const [hoveredMetricId, setHoveredMetricId] = useState(null);

  const [activeMetrics, setActiveMetrics] = useState([
    { id: 'basic___appEnroll', name: '基本: 核定招收', axisId: 'people', color: '#818cf8', chartType: 'line' },
    { id: 'basic___stuAmount', name: '基本: 實際在園', axisId: 'people', color: '#34d399', chartType: 'line' },
    { id: 'basic___occupancyRate', name: '基本: 入園率(%)', axisId: 'percent', color: '#fb7185', chartType: 'line' }
  ]);

  const supplyChartRef = useRef(null);
  const institutionChartRef = useRef(null);
  const subDistrictChartRef = useRef(null);
  const populationChartRef = useRef(null);
  const surveyChartRef = useRef(null);
  const customChartRef = useRef(null);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const itemsToDisplay = hoveredMetricId 
        ? payload.filter(p => p.dataKey === hoveredMetricId)
        : payload;

      return (
        <div className="bg-white p-3 border rounded-xl shadow-lg text-sm z-50 relative">
          <p className="font-bold text-slate-700 mb-2">{label}</p>
          {itemsToDisplay.map((entry, index) => (
            <div key={index} className="font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

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
  const toggleArrayItem = (setState, item) => {
    setState(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setActiveCategory(cat);
    if (cat === 'basic') setActiveSubItem(BASIC_SUB_OPTIONS[0].id);
    else if (cat === 'inst') setActiveSubItem(INST_SUB_OPTIONS[0].id);
    else if (cat === 'survey') setActiveSubItem('dim_教保基礎條件'); 
  };

  const handleAddMetric = () => {
    if (activeCategory === 'survey' && activeSurveyMetric === 'all') {
      const shortName = getSurveyShortName(activeSubItem);
      const metricsToAdd = ['req', 'perf', 'gap'];
      const newMetrics = [];
      
      metricsToAdd.forEach((metricId) => {
        const mId = `survey___${activeSubItem}___${metricId}`;
        const mOpt = SURVEY_SUB_OPTIONS.find(o => o.id === metricId);
        
        if (!activeMetrics.find(m => m.id === mId)) {
          newMetrics.push({
            id: mId,
            name: `${shortName}: ${mOpt.name}`,
            axisId: 'score', 
            color: COLORS_PALETTE[(activeMetrics.length + newMetrics.length) % COLORS_PALETTE.length],
            chartType: 'line'
          });
        }
      });
      
      if (newMetrics.length > 0) setActiveMetrics(prev => [...prev, ...newMetrics]);
      return;
    }

    let metricId = '';
    let newName = '';
    let axisId = 'people'; 

    if (activeCategory === 'basic') {
      metricId = `basic___${activeSubItem}`;
      const opt = BASIC_SUB_OPTIONS.find(o => o.id === activeSubItem);
      newName = `基本: ${opt.name}`;
      if (activeSubItem === 'occupancyRate') axisId = 'percent';
      else axisId = 'people';
    } else if (activeCategory === 'inst') {
      metricId = `inst___${activeSubItem}`;
      const opt = INST_SUB_OPTIONS.find(o => o.id === activeSubItem);
      newName = `機構: ${opt.name}`;
      if (activeSubItem === 'publicRatio') axisId = 'percent';
      else axisId = 'inst';
    } else if (activeCategory === 'survey') {
      metricId = `survey___${activeSubItem}___${activeSurveyMetric}`;
      const shortName = getSurveyShortName(activeSubItem);
      const metricOpt = SURVEY_SUB_OPTIONS.find(o => o.id === activeSurveyMetric);
      newName = `${shortName}: ${metricOpt.name}`;
      axisId = 'score';
    }

    if (activeMetrics.find(m => m.id === metricId)) return;

    setActiveMetrics(prev => [...prev, {
      id: metricId,
      name: newName,
      axisId: axisId,
      color: COLORS_PALETTE[prev.length % COLORS_PALETTE.length],
      chartType: 'line' 
    }]);
  };

  const updateMetricChartType = (id, newType) => {
    setActiveMetrics(prev => prev.map(m => m.id === id ? { ...m, chartType: newType } : m));
  };

  const handleLegendClick = (e) => {
    const metricId = e.dataKey;
    setActiveMetrics(prev => prev.map(m => {
      if (m.id === metricId) {
        const currentColorIndex = COLORS_PALETTE.indexOf(m.color);
        const nextColorIndex = (currentColorIndex + 1) % COLORS_PALETTE.length;
        return { ...m, color: COLORS_PALETTE[nextColorIndex] };
      }
      return m;
    }));
  };

  const currentSupplyData = useMemo(() => {
    if (!enrollmentData || !populationData) return [];
    let popDataArray = selectedDistrict.id === '台北市' ? populationData.taipei_city_total || [] : populationData.districts?.[selectedDistrict.name] || [];
    return rawYears.map(year => {
      let yearData = enrollmentData.filter(d => String(d.學年度).replace('年','') === year);
      if (selectedDistrict.id !== '台北市') yearData = yearData.filter(d => norm(d.行政區) === norm(selectedDistrict.name));
      else yearData = yearData.filter(d => validDistrictNames.includes(norm(d.行政區)));
      let appEnroll = 0, stuAmount = 0, publicCount = 0, nonProfitCount = 0, quasiPublicCount = 0, educareCount = 0, privateCount = 0;
      let age2Count = 0, age3Count = 0, age4Count = 0, age5Count = 0;
      yearData.forEach(d => {
        appEnroll += safeParse(d.核定招生人數); stuAmount += safeParse(d.入園人數);
        if (d.设立別 === '公立') publicCount += safeParse(d.入園人數);
        if (d.设立別 === '非營利') nonProfitCount += safeParse(d.入園人數);
        if (d.设立別 === '準公共') quasiPublicCount += safeParse(d.入園人數);
        if (d.设立別 === '教保中心') educareCount += safeParse(d.入園人數);
        if (d.设立別 === '私立') privateCount += safeParse(d.入園人數);
        age2Count += safeParse(d['2歲入園人數']); age3Count += safeParse(d['3歲入園人數']);
        age4Count += safeParse(d['4歲入園人數']); age5Count += safeParse(d['5歲入園人數']);
      });
      const occupancyRate = appEnroll > 0 ? ((stuAmount / appEnroll) * 100).toFixed(2) : 0;
      let childPop = '-';
      const currentYearPopData = popDataArray.find(d => String(d.year) === year);
      if (currentYearPopData) {
        const sum = safeParse(currentYearPopData.age_2) + safeParse(currentYearPopData.age_3) + safeParse(currentYearPopData.age_4) + safeParse(currentYearPopData.age_5);
        childPop = sum > 0 ? sum : '-';
      }
      return { year: `${year}年`, childPopulation: childPop, appEnroll, stuAmount, occupancyRate, publicCount, nonProfitCount, quasiPublicCount, educareCount, privateCount, age2Count, age3Count, age4Count, age5Count };
    }).filter(d => d.appEnroll > 0 || d.stuAmount > 0 || d.childPopulation !== '-'); 
  }, [selectedDistrict, validDistrictNames]);

  const institutionData = useMemo(() => {
    if (!institutionCountData || !selectedDistrict) return [];
    const distKey = Object.keys(institutionCountData).find(k => norm(k) === norm(selectedDistrict.id === '台北市' ? '台北市' : selectedDistrict.name));
    const data = institutionCountData[distKey] || [];
    return data.filter(d => rawYears.includes(String(d.學年度).replace('年',''))).map(d => ({
      year: `${d.學年度}年`, publicCount: safeParse(d.公立), nonProfitCount: safeParse(d.非營利), quasiPublicCount: safeParse(d.準公共), educareCount: safeParse(d.教保中心), privateCount: safeParse(d.私立), totalCount: safeParse(d.合計), publicRatio: d.公共化占比 ? parseFloat(String(d.公共化占比).replace('%', '')) : null, rawRatio: d.公共化占比 || '-'
    }));
  }, [selectedDistrict]);

  const currentSubDistrictsForYear = useMemo(() => {
    if (!rawSubDistricts || rawSubDistricts.length === 0) return [];
    let result = [];
    rawSubDistricts.filter(sub => selectedSubDistricts.includes(sub.name)).forEach(sub => {
        selectedSubYears.forEach(year => {
           const yearStat = sub.yearly_stats?.find(y => y.year === year);
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
    return filtered.map(d => {
      const calcGap = (perf, req) => (perf != null && req != null) ? Number((perf - req).toFixed(2)) : null;
      return {
        year: `${d.年份}年`, sampleSize: d.資料筆數, gapBase: calcGap(d.構面['教保基礎條件']?.滿意度, d.構面['教保基礎條件']?.需求度) ?? d.構面['教保基礎條件']?.Gap ?? null, gapAction: calcGap(d.構面['教保作為']?.滿意度, d.構面['教保作為']?.需求度) ?? d.構面['教保作為']?.Gap ?? null, gapExtend: calcGap(d.構面['延長收托安置']?.滿意度, d.構面['延長收托安置']?.需求度) ?? d.構面['延長收托安置']?.Gap ?? null, gapOther: calcGap(d.構面['其他']?.滿意度, d.構面['其他']?.需求度) ?? d.構面['其他']?.Gap ?? null, raw: d 
      };
    });
  }, [selectedDistrict]);

  const questionStats = useMemo(() => {
    return surveyStats.map(d => {
      const 需求程度 = d.raw.逐題[selectedQuestion]?.需求度 ?? 0;
      const 滿意程度 = d.raw.逐題[selectedQuestion]?.滿意度 ?? 0;
      const 品質落差 = Number((滿意程度 - 需求程度).toFixed(2));
      return { year: d.year, 需求程度, 滿意程度, 品質落差 };
    });
  }, [surveyStats, selectedQuestion]);

  const customChartData = useMemo(() => {
    let result = [];
    customSelectedYears.forEach(year => {
      const yearStr = year.replace('年', '');
      customSelectedRegions.forEach(regionName => {
        let entry = { name: `${regionName} (${year})`, year, region: regionName };
        const isTaipei = norm(regionName) === '台北市';
        const isDistrict = districtsMapping.some(d => norm(d.name) === norm(regionName));

        let eData = enrollmentData.filter(d => String(d.學年度).replace('年','') === yearStr);
        if (isTaipei) eData = eData.filter(d => validDistrictNames.includes(norm(d.行政區)));
        else if (isDistrict) eData = eData.filter(d => norm(d.行政區) === norm(regionName));

        const distKey = Object.keys(institutionCountData).find(k => norm(k) === norm(isTaipei ? '台北市' : regionName));
        const iData = institutionCountData[distKey]?.find(d => String(d.學年度).replace('年','') === yearStr);

        const pArray = isTaipei ? populationData.taipei_city_total : populationData.districts?.[regionName];
        const pData = pArray?.find(d => String(d.year) === yearStr);

        const sName = isTaipei ? '台北市整體' : regionName; 
        const sData = surveyData.find(d => norm(d.分區) === norm(sName) && String(d.年份).replace('年','') === yearStr);

        let subStat = null;
        if (!isTaipei && !isDistrict) {
          for (let dist of supplyDemandData) {
            subStat = dist.sub_districts?.find(s => norm(s.name) === norm(regionName))?.yearly_stats?.find(y => String(y.year).includes(yearStr));
            if (subStat) break;
          }
        }

        activeMetrics.forEach(metric => {
          const parts = metric.id.split('___');
          const cat = parts[0];
          const detail = parts[1];
          if (cat === 'basic') {
            if (detail === 'appEnroll' || detail === 'stuAmount' || detail === 'occupancyRate') {
              if (isTaipei || isDistrict) {
                let app = 0, stu = 0;
                eData.forEach(d => { app += safeParse(d.核定招生人數); stu += safeParse(d.入園人數); });
                if (detail === 'appEnroll') entry[metric.id] = app;
                if (detail === 'stuAmount') entry[metric.id] = stu;
                if (detail === 'occupancyRate') entry[metric.id] = app > 0 ? Number(((stu / app) * 100).toFixed(2)) : 0;
              } else if (subStat) {
                if (detail === 'appEnroll') entry[metric.id] = safeParse(subStat.appEnroll);
                if (detail === 'stuAmount') entry[metric.id] = safeParse(subStat.stuAmount);
                if (detail === 'occupancyRate') entry[metric.id] = subStat.occupancyRate || 0;
              } else entry[metric.id] = 0;
            }
            if (detail === 'popTotal') entry[metric.id] = (isTaipei || isDistrict) && pData ? safeParse(pData.total) : 0;
          } else if (cat === 'inst') {
            if (isTaipei || isDistrict) {
              if (detail === 'public') entry[metric.id] = safeParse(iData?.公立);
              if (detail === 'nonProfit') entry[metric.id] = safeParse(iData?.非營利);
              if (detail === 'quasiPublic') entry[metric.id] = safeParse(iData?.準公共);
              if (detail === 'educare') entry[metric.id] = safeParse(iData?.教保中心);
              if (detail === 'private') entry[metric.id] = safeParse(iData?.私立);
              if (detail === 'total') entry[metric.id] = safeParse(iData?.合計);
              if (detail === 'publicRatio') entry[metric.id] = iData && iData.公共化占比 ? parseFloat(String(iData.公共化占比).replace('%', '')) : 0;
            } else {
              entry[metric.id] = 0; 
            }
          } else if (cat === 'survey') {
            const surveyMetric = parts[2]; 
            let req = 0, perf = 0;
            if (sData) {
              if (detail.startsWith('dim_')) {
                const dimName = detail.replace('dim_', '');
                req = sData.構面?.[dimName]?.需求度 ?? 0;
                perf = sData.構面?.[dimName]?.滿意度 ?? 0;
              } else if (detail.startsWith('q_')) {
                const qId = detail.replace('q_', '');
                req = sData.逐題?.[qId]?.需求度 ?? 0;
                perf = sData.逐題?.[qId]?.滿意度 ?? 0;
              }
            }
            if (surveyMetric === 'req') entry[metric.id] = req;
            if (surveyMetric === 'perf') entry[metric.id] = perf;
            if (surveyMetric === 'gap') entry[metric.id] = (req !== 0 || perf !== 0) ? Number((perf - req).toFixed(2)) : 0;
          }
        });
        result.push(entry);
      });
    });
    return result;
  }, [customSelectedYears, customSelectedRegions, validDistrictNames, activeMetrics]);

  const handleExportCustomExcel = () => {
    const formattedData = customChartData.map(row => {
      let newRow = { '地區與年份': row.name, '年份': row.year, '行政區': row.region };
      activeMetrics.forEach(m => { newRow[m.name] = row[m.id]; });
      return newRow;
    });
    exportToExcel(formattedData, '自訂圖表資料');
  };

  const activeAxisIds = [...new Set(activeMetrics.map(m => m.axisId))];
  const sortedActiveAxisIds = activeAxisIds.sort((a, b) => {
    const order = { people: 1, inst: 2, percent: 3, score: 4 };
    return order[a] - order[b];
  });
  
  const axisSettings = {
    people: { name: '人數 (人)', color: '#3b82f6' },
    inst: { name: '單位數 (間)', color: '#8b5cf6' },
    percent: { name: '百分比 (%)', color: '#f43f5e' },
    score: { name: '滿意度 (分)', color: '#10b981' }
  };

  const getOrientation = (id) => {
    const index = sortedActiveAxisIds.indexOf(id);
    const total = sortedActiveAxisIds.length;
    if (total === 1) return 'left';
    if (total === 2) return index === 0 ? 'left' : 'right';
    if (total === 3) return index < 2 ? 'left' : 'right';
    return index < 2 ? 'left' : 'right';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center font-sans">
      
      <header className="text-center mb-8 w-full max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2">臺北市幼兒教育資源與人口供需整合儀表板</h1>
        <p className="text-slate-500 text-sm md:text-base">資料年份限定: 112年 ~ 114年 - 整合機構數量與次分區入園概況</p>
      </header>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">選擇行政區</label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">對應：{selectedDistrict.name}</span>
            </div>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋區名..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 max-h-52 overflow-y-auto">
              {filteredDistricts.map(item => (
                <button key={item.id} onClick={() => handleSelectDistrict(item.id)} className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 border text-center ${selectedDistrict?.id === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}>{item.name}</button>
              ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 flex-grow flex items-center justify-center min-h-[360px]">
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
              <div className="flex justify-end gap-2">
                <button onClick={() => exportToExcel(currentSupplyData, `供給招生_${selectedDistrict.name}`)} className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                <button onClick={() => exportToPNG(supplyChartRef, `供給招生_${selectedDistrict.name}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
              </div>
              <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                <div ref={supplyChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">歷年幼兒園核定招收量 vs. 實際在園人數</h3>
                  <div className="h-56">
                    {currentSupplyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentSupplyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                          <YAxis tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                          <Tooltip />
                          <Legend />
                          <Bar isAnimationActive={false} dataKey="appEnroll" name="核定招收人數" fill="#93c5fd" radius={barRadius} />
                          <Bar isAnimationActive={false} dataKey="stuAmount" name="實際在園人數" fill="#3b82f6" radius={barRadius} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域尚無符合年份之資料</div>)}
                  </div>
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
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={institutionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="year" tickLine={false} />
                        <YAxis yAxisId="left" tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tickLine={false} unit="%" />
                        <Tooltip />
                        <Legend />
                        <Bar isAnimationActive={false} yAxisId="left" dataKey="publicCount" stackId="a" name="公立" fill="#93c5fd" />
                        <Bar isAnimationActive={false} yAxisId="left" dataKey="nonProfitCount" stackId="a" name="非營利" fill="#3b82f6" />
                        <Bar isAnimationActive={false} yAxisId="left" dataKey="quasiPublicCount" stackId="a" name="準公共" fill="#f59e0b" />
                        <Bar isAnimationActive={false} yAxisId="left" dataKey="educareCount" stackId="a" name="教保中心" fill="#14b8a6" />
                        <Bar isAnimationActive={false} yAxisId="left" dataKey="privateCount" stackId="a" name="私立" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="publicRatio" name="公共化佔比 (%)" stroke="#ec4899" strokeWidth={3} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subdistrict' && selectedDistrict.id !== '台北市' && (
            <div className="flex flex-col gap-6 bg-white p-2">
              <div className="flex justify-between">
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-xs font-bold">選擇年份(可多選)：</span>
                  {yearsList.map(y => <button key={y} onClick={() => toggleSubYear(y)} className={`px-2 py-1 rounded text-xs transition-all ${selectedSubYears.includes(y) ? 'bg-purple-600 text-white shadow' : 'bg-slate-200 hover:bg-purple-100'}`}>{y}</button>)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportToExcel(currentSubDistrictsForYear, `次分區_${selectedSubYears.join('_')}`)} className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                  <button onClick={() => exportToPNG(subDistrictChartRef, `次分區_${selectedSubYears.join('_')}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
                </div>
              </div>
              <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                <div ref={subDistrictChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{selectedDistrict.name} 次分區招收概況</h3>
                  <div className="h-56">
                    {currentSubDistrictsForYear.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentSubDistrictsForYear}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tickLine={false} tick={{fontSize: 11}} />
                          <YAxis tickLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar isAnimationActive={false} dataKey="appEnroll" name="核定招收人數" fill="#c084fc" radius={barRadius} />
                          <Bar isAnimationActive={false} dataKey="stuAmount" name="實際在園人數" fill="#a855f7" radius={barRadius} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">請至少選擇一個次分區與年份</div>)}
                  </div>
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
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cityPopulationData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tickLine={false} />
                        <YAxis yAxisId="left" tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tickLine={false} unit="%" />
                        <Tooltip />
                        <Legend />
                        <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="total" name="總設籍人數" stroke="#3b82f6" strokeWidth={3} />
                        <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="changeRatio" name="增減率 (%)" stroke="#ef4444" strokeWidth={2} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'survey' && (
            <div className="flex flex-col gap-5 bg-white p-2">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex">
                  <button onClick={() => setSurveySubTab('dimension')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${surveySubTab === 'dimension' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-emerald-400'}`}>四大構面趨勢</button>
                  <button onClick={() => setSurveySubTab('question')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${surveySubTab === 'question' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-emerald-400'}`}>逐題檢視(柱狀圖)</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportToExcel(surveySubTab === 'dimension' ? surveyStats : questionStats, `滿意度_${surveySubTab}_${selectedDistrict.name}`)} className="text-xs bg-green-500 text-white px-3 py-1 rounded shadow hover:bg-green-600">輸出 Excel</button>
                  <button onClick={() => exportToPNG(surveyChartRef, `滿意度_${surveySubTab}_${selectedDistrict.name}`)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600">輸出 PNG</button>
                </div>
              </div>

              {surveySubTab === 'dimension' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border">
                    <div ref={surveyChartRef} className="bg-white p-2 md:p-4 rounded-xl">
                      <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{selectedDistrict.name} 歷年四大構面 品質落差 (Gap)</h3>
                      <div className="h-64">
                        {surveyStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={surveyStats}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="year" tickLine={false} />
                              <YAxis tickLine={false} />
                              <Tooltip />
                              <Legend />
                              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Line isAnimationActive={false} type="monotone" dataKey="gapBase" name="教保基礎條件 Gap" stroke="#3b82f6" strokeWidth={2} />
                              <Line isAnimationActive={false} type="monotone" dataKey="gapAction" name="教保作為 Gap" stroke="#ec4899" strokeWidth={2} />
                              <Line isAnimationActive={false} type="monotone" dataKey="gapExtend" name="延長收托安置 Gap" stroke="#f59e0b" strokeWidth={2} />
                              <Line isAnimationActive={false} type="monotone" dataKey="gapOther" name="其他 Gap" stroke="#10b981" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域尚無滿意度問卷資料</div>)}
                      </div>
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
                      <h3 className="text-sm font-bold text-slate-700 mb-3 text-center md:text-left">{SURVEY_QUESTIONS.find(q=>q.id===selectedQuestion)?.short} 滿意度分析</h3>
                      <div className="h-64">
                        {questionStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={questionStats} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="year" tickLine={false} />
                              <YAxis tickLine={false} />
                              <Tooltip />
                              <Legend />
                              <Bar isAnimationActive={false} dataKey="需求程度" name="需求程度" fill="#ec4899" radius={barRadius} />
                              <Bar isAnimationActive={false} dataKey="滿意程度" name="滿意程度" fill="#3b82f6" radius={barRadius} />
                              <Bar isAnimationActive={false} dataKey="品質落差" name="品質落差 (Gap)" fill="#f59e0b" radius={barRadius} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (<div className="w-full h-full flex items-center justify-center text-slate-400">目前區域尚無此題問卷資料</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 自訂圖表 */}
      <div className="w-full max-w-7xl bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-200 flex flex-col gap-6">
        
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">🛠️ 自訂圖表比較分析</h2>
          <div className="flex gap-2">
            <button onClick={handleExportCustomExcel} className="text-xs bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors font-bold">輸出 Excel</button>
            <button onClick={() => exportToPNG(customChartRef, `自訂圖表分析`)} className="text-xs bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors font-bold">輸出 PNG</button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col gap-5">
            <h3 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">1. 選擇基礎變數 (時空)</h3>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500">📅 選擇對比年份：</span>
              <div className="flex gap-2 flex-wrap">
                {yearsList.map(y => (
                  <button 
                    key={y} onClick={() => toggleArrayItem(setCustomSelectedYears, y)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${customSelectedYears.includes(y) ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-600 hover:bg-indigo-50 border-slate-300'}`}
                  >{y}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500">📍 選擇比較區域：</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <select 
                  className="p-2 border border-slate-300 rounded-lg text-sm bg-white flex-1 font-medium"
                  value={customSelectedMainDistrict}
                  onChange={(e) => setCustomSelectedMainDistrict(e.target.value)}
                >
                  <option value="">-- ① 先選主分區 --</option>
                  <option value="臺北市">臺北市 (整體)</option>
                  {districtsMapping.filter(d => d.id !== '台北市').map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select 
                  className="p-2 border border-slate-300 rounded-lg text-sm bg-white flex-1 font-medium disabled:opacity-50 disabled:bg-slate-100"
                  disabled={!customSelectedMainDistrict}
                  value="" 
                  onChange={(e) => {
                    if(e.target.value && !customSelectedRegions.includes(e.target.value)) {
                      setCustomSelectedRegions(prev => [...prev, e.target.value]);
                    }
                  }}
                >
                  <option value="">-- ② 加入清單 --</option>
                  {customSelectedMainDistrict === '臺北市' && <option value="臺北市">臺北市 (整體)</option>}
                  {customSelectedMainDistrict && customSelectedMainDistrict !== '臺北市' && (
                    <>
                      <option value={districtsMapping.find(d => d.id === customSelectedMainDistrict)?.name}>
                        {districtsMapping.find(d => d.id === customSelectedMainDistrict)?.name} (全區)
                      </option>
                      {supplyDemandData.find(d => d.id === customSelectedMainDistrict)?.sub_districts.map(sub => (
                        <option key={sub.name} value={sub.name}>{sub.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {customSelectedRegions.map(r => (
                  <span key={r} className="px-2.5 py-1 bg-white text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm border border-indigo-200">
                    {r} <button onClick={() => toggleArrayItem(setCustomSelectedRegions, r)} className="text-slate-400 hover:text-red-500 ml-1">✖</button>
                  </span>
                ))}
                {customSelectedRegions.length === 0 && <span className="text-xs text-slate-400">尚無選擇區域</span>}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col gap-5">
            <h3 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">2. 選擇資料指標 (類別)</h3>
            <div className="flex flex-col gap-3">
              <select 
                value={activeCategory}
                onChange={handleCategoryChange}
                className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-700 shadow-sm w-full"
              >
                {CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              
              <div className="flex flex-col gap-3 w-full">
                <select 
                  value={activeSubItem}
                  onChange={(e) => setActiveSubItem(e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold text-slate-700 w-full"
                >
                  {activeCategory === 'basic' && BASIC_SUB_OPTIONS.map(subOpt => (
                    <option key={subOpt.id} value={subOpt.id}>{subOpt.name}</option>
                  ))}
                  {activeCategory === 'inst' && INST_SUB_OPTIONS.map(subOpt => (
                    <option key={subOpt.id} value={subOpt.id}>{subOpt.name}</option>
                  ))}
                  
                  {activeCategory === 'survey' && (
                    <>
                      <optgroup label="🌟 教保基礎條件 (01,06,07,08,09,14)">
                        <option value="dim_教保基礎條件">⭐ 構面整體：教保基礎條件</option>
                        {SURVEY_QUESTIONS.filter(q => SURVEY_G1.includes(q.id)).map(q => <option key={q.id} value={`q_${q.id}`}>📝 逐題：{q.text}</option>)}
                      </optgroup>
                      <optgroup label="🌟 教保作為 (02,05,10,11,12,15,16)">
                        <option value="dim_教保作為">⭐ 構面整體：教保作為</option>
                        {SURVEY_QUESTIONS.filter(q => SURVEY_G2.includes(q.id)).map(q => <option key={q.id} value={`q_${q.id}`}>📝 逐題：{q.text}</option>)}
                      </optgroup>
                      <optgroup label="🌟 延長收托安置 (03,04)">
                        <option value="dim_延長收托安置">⭐ 構面整體：延長收托安置</option>
                        {SURVEY_QUESTIONS.filter(q => SURVEY_G3.includes(q.id)).map(q => <option key={q.id} value={`q_${q.id}`}>📝 逐題：{q.text}</option>)}
                      </optgroup>
                      <optgroup label="🌟 其他 (13,17)">
                        <option value="dim_其他">⭐ 構面整體：其他</option>
                        {SURVEY_QUESTIONS.filter(q => SURVEY_G4.includes(q.id)).map(q => <option key={q.id} value={`q_${q.id}`}>📝 逐題：{q.text}</option>)}
                      </optgroup>
                    </>
                  )}
                </select>

                {activeCategory === 'survey' && (
                  <select 
                    value={activeSurveyMetric}
                    onChange={(e) => setActiveSurveyMetric(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold text-slate-700 w-full"
                  >
                    {SURVEY_SUB_OPTIONS.map(subOpt => (
                      <option key={subOpt.id} value={subOpt.id}>{subOpt.name}</option>
                    ))}
                  </select>
                )}

                <button 
                  onClick={handleAddMetric} 
                  className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 shadow-sm transition-all w-full mt-1"
                >
                  ➕ 加入圖表
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <span className="text-sm font-bold text-slate-700 mb-3 block">3. 已選擇之對比指標 (可個別自訂圖表類型)：</span>
          <div className="flex gap-3 flex-wrap">
            {activeMetrics.length === 0 ? <span className="text-sm text-slate-400 bg-white px-3 py-1 rounded">尚未加入任何指標</span> : 
              activeMetrics.map(m => (
                <div key={m.id} className="flex flex-col border-2 rounded-xl p-2 bg-white shadow-sm" style={{borderColor: m.color}}>
                  <div className="flex justify-between items-center mb-2 gap-3">
                    <span className="text-xs font-bold" style={{color: m.color}}>{m.name}</span>
                    <button onClick={() => setActiveMetrics(prev => prev.filter(item => item.id !== m.id))} className="text-slate-400 hover:text-red-500 text-xs font-bold bg-slate-50 px-1.5 py-0.5 rounded transition-colors">✖</button>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => updateMetricChartType(m.id, 'bar')} className={`flex-1 text-[10px] font-bold px-2 py-1 rounded transition-all ${m.chartType==='bar'?'bg-slate-700 text-white shadow':'text-slate-500 hover:bg-slate-200'}`}>柱狀圖</button>
                    <button onClick={() => updateMetricChartType(m.id, 'line')} className={`flex-1 text-[10px] font-bold px-2 py-1 rounded transition-all ${m.chartType==='line'?'bg-slate-700 text-white shadow':'text-slate-500 hover:bg-slate-200'}`}>曲線圖</button>
                  </div>
                </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border mt-2">
          {/* ✅ 下修了 maxWidth 限制，讓只有 1 個區域時可縮至 350px 左右 */}
          <div ref={customChartRef} className="bg-white p-2 md:p-4 rounded-xl flex justify-center">
            <div 
              className="h-[400px] w-full transition-all duration-500"
              style={{ 
                maxWidth: customChartData.length > 0 && customChartData.length <= 4 
                  ? `${Math.max(350, customChartData.length * 200 + 150)}px` 
                  : '100%' 
              }}
            >
              {customChartData.length > 0 && activeMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={customChartData} 
                    margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                    onMouseLeave={() => setHoveredMetricId(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tickLine={false} tick={{fill:'#475569', fontSize:12, fontWeight:'bold'}} />
                    
                    {sortedActiveAxisIds.map((axisId) => {
                      const orientation = getOrientation(axisId);
                      return (
                        <YAxis 
                          key={`yaxis-${axisId}`} 
                          yAxisId={axisId} 
                          orientation={orientation} 
                          width={65} 
                          tickLine={false} 
                          axisLine={{ stroke: axisSettings[axisId].color, strokeWidth: 2 }}
                          tick={{ fill: axisSettings[axisId].color, fontSize: 11, fontWeight: 'bold' }}
                          tickFormatter={(value) => typeof value === 'number' && !Number.isInteger(value) ? Number(value.toFixed(2)) : value}
                          label={{
                            value: axisSettings[axisId].name,
                            angle: -90,
                            position: orientation === 'left' ? 'insideLeft' : 'insideRight',
                            offset: 15,
                            fill: axisSettings[axisId].color,
                            fontSize: 11,
                            fontWeight: 'bold'
                          }}
                          domain={
  axisId === 'percent' ? [
    dataMin => Math.max(0, Math.floor(dataMin - 5)), 
    dataMax => Math.min(100, Math.ceil(dataMax + 5))
  ] : 
  axisId === 'score' ? [
    dataMin => Math.max(3.5, dataMin - 1), // 下限：最小值減 1，但最低不得低於 3.5
    dataMax => Math.min(5, dataMax + 1)    // 上限：最大值加 1，但最高不得超過 5
  ] : 
  [dataMin => dataMin === 0 ? 0 : Number((dataMin * 0.95).toFixed(0)), dataMax => Number((dataMax * 1.05).toFixed(0))]
}
                        />
                      );
                    })}
                    
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9'}} />
                    
                    <Legend 
                      wrapperStyle={{fontSize:'13px', paddingTop:'15px', fontWeight:'bold', cursor: 'pointer'}} 
                      onMouseEnter={(e) => setHoveredMetricId(e.dataKey)}
                      onMouseLeave={() => setHoveredMetricId(null)}
                      onClick={handleLegendClick}
                    />

                    {activeMetrics.map(m => {
                      const isHovered = hoveredMetricId === m.id;
                      if (m.chartType === 'line') {
                        return (
                          <Line 
                            isAnimationActive={false} 
                            key={m.id} 
                            yAxisId={m.axisId} 
                            type="monotone" 
                            dataKey={m.id} 
                            name={m.name} 
                            stroke={m.color} 
                            strokeWidth={isHovered ? 5 : 2} 
                            opacity={hoveredMetricId && !isHovered ? 0.2 : 1} 
                            dot={{r:4}} 
                            activeDot={{r:6}} 
                            onMouseEnter={() => setHoveredMetricId(m.id)}
                          />
                        );
                      }
                      return (
                        <Bar 
                          isAnimationActive={false} 
                          key={m.id} 
                          yAxisId={m.axisId} 
                          dataKey={m.id} 
                          name={m.name} 
                          fill={m.color} 
                          radius={[4,4,0,0]} 
                          barSize={40} 
                          opacity={hoveredMetricId && !isHovered ? 0.2 : 1} 
                          onMouseEnter={() => setHoveredMetricId(m.id)}
                        />
                      );
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (<div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">請至少選擇一個地區、年份與指標加入圖表</div>)}
            </div>
          </div>
        </div>

        {customChartData.length > 0 && activeMetrics.length > 0 && (
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm mt-2">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">地區與年份</th>
                  {activeMetrics.map(m => (
                    <th key={m.id} className="px-4 py-3 whitespace-nowrap text-center border-r border-slate-100" style={{color: m.color}}>
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customChartData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap bg-white border-r border-slate-100">{row.name}</td>
                    {activeMetrics.map(m => (
                      <td key={m.id} className="px-4 py-3 font-medium text-center border-r border-slate-100 last:border-r-0">{row[m.id]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}