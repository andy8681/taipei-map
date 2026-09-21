import React, { useState, useMemo, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

import supplyDemandData from '../data/臺北市各行政區幼兒園供給與招生概況.json'; 
import enrollmentData from '../data/1141219-子計畫一 各類型教保服務機構入園人數統計表.json'; 
import institutionCountData from '../data/1141219-子計畫一各類型教保服務機構數量統計表.json'; 
import populationData from '../data/1141219-子計畫學齡前設籍人數與增減趨勢.json'; 
import surveyData from '../data/統計結果_前端專用.json';

const districtsMapping = [
  { id: "台北市", name: "臺北市" }, { id: "北投", name: "北投區" }, { id: "士林", name: "士林區" },
  { id: "內湖", name: "內湖區" }, { id: "中山", name: "中山區" }, { id: "大同", name: "大同區" },
  { id: "松山", name: "松山區" }, { id: "萬華", name: "萬華區" }, { id: "中正", name: "中正區" },
  { id: "大安", name: "大安區" }, { id: "信義", name: "信義區" }, { id: "南港", name: "南港區" },
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
  { value: 'inst_count', label: '🏫 機構數量與佔比' },
  { value: 'survey', label: '⭐ 滿意度分析' },
  { value: 'priority', label: '🎯 最在意因素' }
];

const BASIC_SUB_OPTIONS = [
  { id: 'appEnroll', name: '核定招收' },
  { id: 'stuAmount', name: '實際在園' },
  { id: 'occupancyRate', name: '招生率(%)' },
  { id: 'popTotal', name: '學齡前設籍人數' }
];

const INST_COUNT_SUB_OPTIONS = [
  { id: 'public', name: '公立' }, { id: 'nonProfit', name: '非營利' },
  { id: 'quasiPublic', name: '準公共' }, { id: 'educare', name: '職場互助教保服務中心' },
  { id: 'private', name: '私立' }, { id: 'total', name: '總計' },
  { id: 'publicRatio', name: '公共化佔比(%)' }
];

const PRIORITY_OPTIONS = [
  { id: "(01)公立或私立", name: "(01)公私立" }, { id: "(02)接送方便", name: "(02)接送方便" },
  { id: "(03)收托時間長短（含寒暑假）", name: "(03)收托時間" }, { id: "(04)網路評價", name: "(04)網路評價" },
  { id: "(05)課後延托費用高低", name: "(05)延托費用" }, { id: "(06)班級幼兒數多寡", name: "(06)班級人數" },
  { id: "(07)幼兒對學校好感度", name: "(07)幼兒好感" }, { id: "(08)辦學特色", name: "(08)辦學特色" },
  { id: "(09)親友推薦", name: "(09)親友推薦" }, { id: "(10)學校獲得獎項肯定", name: "(10)獲獎肯定" },
  { id: "(11)活動空間", name: "(11)活動空間" }, { id: "(12)學雜費多寡", name: "(12)學雜費" },
  { id: "(13)其他", name: "(13)其他" }
];

const SURVEY_SUB_OPTIONS = [
  { id: 'all', name: '全部加入 (需求/滿意/Gap)' },
  { id: 'req', name: '需求程度' },
  { id: 'perf', name: '滿意程度' },
  { id: 'gap', name: '品質落差 (Gap)' }
];

const COLORS_PALETTE = ['#818cf8', '#34d399', '#fbbf24', '#fb7185', '#c084fc', '#2dd4bf', '#f472b6', '#a78bfa', '#f87171', '#60a5fa'];
const REGION_COLORS = ['#3b82f6', '#f97316']; 
const yearsList = ['112年', '113年', '114年'];
const instTypesList = ['全部', '公立', '非營利', '準公共', '私立', '職場互助教保服務中心'];

// 擴充調色盤，確保不同項目差異顯著
const EXTENDED_COLORS = [
  '#818cf8', '#34d399', '#fbbf24', '#fb7185', '#c084fc', '#2dd4bf', 
  '#f472b6', '#a78bfa', '#f87171', '#60a5fa', '#3b82f6', '#f97316', 
  '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
  '#d946ef', '#14b8a6', '#f43f5e', '#6366f1', '#ec4899', '#1d4ed8'
];

const getSurveyShortName = (val) => {
  if (val.startsWith('dim_')) return val.replace('dim_', '');
  const qId = val.replace('q_', '');
  const q = SURVEY_QUESTIONS.find(x => x.id === qId);
  return q ? q.short : val;
};

const norm = (str) => String(str || '').replace(/臺/g, '台').trim();
const safeParse = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/,/g, '');
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
};

const getGapColor = (val) => {
  if (val === null || val === undefined || val === '-') return 'inherit';
  const num = Number(val);
  if (isNaN(num)) return 'inherit';
  if (num < 0) return '#ef4444';
  if (num === 0) return '#f59e0b';
  return '#10b981';
};

const renderShapeDot = (props, shape, isGapLine = false, opacity = 1) => {
  const { cx, cy, value, stroke, key } = props;
  const fill = isGapLine ? getGapColor(value) : '#ffffff';
  const borderStroke = isGapLine ? getGapColor(value) : stroke;
  const dotStyle = { stroke: borderStroke, strokeWidth: 2, fill: fill, opacity: opacity };

  if (shape === 'diamond') return <polygon key={key} points={`${cx},${cy-6} ${cx+6},${cy} ${cx},${cy+6} ${cx-6},${cy}`} {...dotStyle} />;
  if (shape === 'circle') return <circle key={key} cx={cx} cy={cy} r={5} {...dotStyle} />;
  if (shape === 'square') return <rect key={key} x={cx-5} y={cy-5} width={10} height={10} {...dotStyle} />;
  if (shape === 'triangle') return <polygon key={key} points={`${cx},${cy-6} ${cx+6},${cy+6} ${cx-6},${cy+6}`} {...dotStyle} />;
  return <circle key={key} cx={cx} cy={cy} r={5} {...dotStyle} />;
};

const LINE_STYLES = [
  { shape: 'diamond', dash: '' },
  { shape: 'circle', dash: '5 5' },
  { shape: 'square', dash: '3 3' },
  { shape: 'triangle', dash: '10 5' },
];

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

export default function CustomChartB() {
  const customChartRef = useRef(null);

  const [customSelectedInstTypes, setCustomSelectedInstTypes] = useState(['全部']); 
  const [customSelectedYears, setCustomSelectedYears] = useState(['112年', '113年', '114年']);
  const [customSelectedRegions, setCustomSelectedRegions] = useState(['臺北市']);
  const [customSelectedMainDistrict, setCustomSelectedMainDistrict] = useState('');
  
  const [activeCategory, setActiveCategory] = useState('basic'); 
  const [activeSubItem, setActiveSubItem] = useState(BASIC_SUB_OPTIONS[0].id);
  const [activeSurveyMetric, setActiveSurveyMetric] = useState(SURVEY_SUB_OPTIONS[0].id);

  const [hoveredMetricId, setHoveredMetricId] = useState(null);
  const [customChartError, setCustomChartError] = useState('');

  const [activeMetrics, setActiveMetrics] = useState([
    { id: 'basic___appEnroll', name: '基本: 核定招收', axisId: 'people', color: '#818cf8', chartType: 'line', category: 'basic' },
    { id: 'basic___stuAmount', name: '基本: 實際在園', axisId: 'people', color: '#34d399', chartType: 'line', category: 'basic' }
  ]);

  const validDistrictNames = useMemo(() => districtsMapping.filter(d => d.id !== '台北市').map(d => norm(d.name)), []);

  const toggleArrayItem = (setState, item) => {
    setState(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const toggleCustomInstType = (type) => {
    setCustomSelectedInstTypes(prev => {
      if (prev.includes(type)) {
        const toggled = prev.filter(t => t !== type);
        return toggled.length === 0 ? ['全部'] : toggled;
      } else {
        return [...prev, type];
      }
    });
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setActiveCategory(cat);
    if (cat === 'basic') setActiveSubItem(BASIC_SUB_OPTIONS[0].id);
    else if (cat === 'inst_count') setActiveSubItem(INST_COUNT_SUB_OPTIONS[0].id);
    else if (cat === 'survey') setActiveSubItem('dim_教保基礎條件'); 
    else if (cat === 'priority') setActiveSubItem(PRIORITY_OPTIONS[0].id);
  };

  const handleAddMetric = () => {
    setCustomChartError(''); 

    if (activeMetrics.length > 0) {
      const currentCategory = activeMetrics[0].category;
      if (currentCategory !== activeCategory) {
        setCustomChartError(`不同向度的資料不可混合比較。目前圖表已有「${CATEGORY_OPTIONS.find(c => c.value === currentCategory)?.label}」的指標，無法加入「${CATEGORY_OPTIONS.find(c => c.value === activeCategory)?.label}」的指標。請先清空現有指標。`);
        return;
      }
    }

    if (activeCategory === 'survey' && activeSurveyMetric === 'all') {
      const currentAxisIds = new Set(activeMetrics.map(m => m.axisId));
      const futureAxisIds = new Set(currentAxisIds);
      futureAxisIds.add('score');
      futureAxisIds.add('gap');
      
      if (futureAxisIds.size > 2) {
          setCustomChartError("最多只能同時比較兩個不同的單位軸(Y軸)。加入全部滿意度指標會新增兩個Y軸，請先清除現有其他指標。");
          return;
      }

      const shortName = getSurveyShortName(activeSubItem);
      const metricsToAdd = ['req', 'perf', 'gap'];
      const newMetrics = [];
      
      metricsToAdd.forEach((metricId) => {
        const mId = `survey___${activeSubItem}___${metricId}`;
        const mOpt = SURVEY_SUB_OPTIONS.find(o => o.id === metricId);
        const assignedAxis = metricId === 'gap' ? 'gap' : 'score'; 
        
        if (!activeMetrics.find(m => m.id === mId)) {
          newMetrics.push({
            id: mId,
            name: `${shortName}: ${mOpt.name}`,
            axisId: assignedAxis, 
            color: COLORS_PALETTE[(activeMetrics.length + newMetrics.length) % COLORS_PALETTE.length],
            chartType: 'line',
            category: activeCategory
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
    } else if (activeCategory === 'inst_count') {
      metricId = `inst_count___${activeSubItem}`;
      const opt = INST_COUNT_SUB_OPTIONS.find(o => o.id === activeSubItem);
      newName = activeSubItem === 'publicRatio' ? `佔比: ${opt.name}` : `機構數: ${opt.name}`;
      axisId = activeSubItem === 'publicRatio' ? 'percent' : 'inst';
    } else if (activeCategory === 'survey') {
      metricId = `survey___${activeSubItem}___${activeSurveyMetric}`;
      const shortName = getSurveyShortName(activeSubItem);
      const metricOpt = SURVEY_SUB_OPTIONS.find(o => o.id === activeSurveyMetric);
      newName = `${shortName}: ${metricOpt.name}`;
      axisId = activeSurveyMetric === 'gap' ? 'gap' : 'score';
    } else if (activeCategory === 'priority') {
      metricId = `priority___${activeSubItem}`;
      const opt = PRIORITY_OPTIONS.find(o => o.id === activeSubItem);
      newName = `在意因素: ${opt.name}`;
      axisId = 'people'; 
    }

    const currentAxisIds = new Set(activeMetrics.map(m => m.axisId));
    if (!currentAxisIds.has(axisId) && currentAxisIds.size >= 2) {
        setCustomChartError("最多只能同時比較兩個不同的單位軸(Y軸)。");
        return;
    }

    if (activeMetrics.find(m => m.id === metricId)) return;

    setActiveMetrics(prev => [...prev, {
      id: metricId,
      name: newName,
      axisId: axisId,
      color: COLORS_PALETTE[prev.length % COLORS_PALETTE.length],
      chartType: 'line',
      category: activeCategory 
    }]);
  };

  const updateMetricChartType = (id, newType) => {
    setActiveMetrics(prev => prev.map(m => m.id === id ? { ...m, chartType: newType } : m));
  };

  const customChartData = useMemo(() => {
    let result = [];
    customSelectedYears.forEach(year => {
      const yearStr = year.replace('年', '');
      // X 軸統一為年份
      let entry = { name: year, year };
      
      const eDataYear = enrollmentData.filter(d => String(d.學年度).replace('年','') === yearStr);

      customSelectedInstTypes.forEach(instType => {
        const jsonInst = toJSONInst(instType);
        let eDataInst = eDataYear;
        if (instType !== '全部') {
          eDataInst = eDataYear.filter(d => norm(d.設立別) === norm(jsonInst));
        }

        customSelectedRegions.forEach(regionName => {
          const isTaipei = norm(regionName) === '台北市';
          const isDistrict = districtsMapping.some(d => norm(d.name) === norm(regionName));

          let eData = eDataInst;
          if (isTaipei) eData = eData.filter(d => validDistrictNames.includes(norm(d.行政區)));
          else if (isDistrict) eData = eData.filter(d => norm(d.行政區) === norm(regionName));

          const distKey = Object.keys(institutionCountData).find(k => norm(k) === norm(isTaipei ? '台北市' : regionName));
          const iData = institutionCountData[distKey]?.find(d => String(d.學年度).replace('年','') === yearStr);

          const pArray = isTaipei ? populationData.taipei_city_total : populationData.districts?.[regionName];
          const pData = pArray?.find(d => String(d.year) === yearStr);

          const sName = isTaipei ? '台北市整體' : regionName; 
          const sDataRaw = surveyData.find(d => norm(d.分區) === norm(sName) && String(d.年份).replace('年','') === yearStr);
          const sourceData = sDataRaw ? (instType === '全部' ? sDataRaw : (sDataRaw.機構別?.[jsonInst] || null)) : null;

          let subStat = null;
          if (!isTaipei && !isDistrict) {
            for (let dist of supplyDemandData) {
              subStat = dist.sub_districts?.find(s => norm(s.name) === norm(regionName))?.yearly_stats?.find(y => String(y.year).includes(yearStr));
              if (subStat) break;
            }
          }

          activeMetrics.forEach(metric => {
            // 資料 Key 改為包含機構類別，達到不同機構產生不同數據序列
            const dataKey = `${metric.id}___${regionName}___${instType}`;
            const parts = metric.id.split('___');
            const cat = parts[0];
            const detail = parts[1];
            
            if (cat === 'basic') {
              if (detail === 'appEnroll' || detail === 'stuAmount' || detail === 'occupancyRate') {
                if (isTaipei || isDistrict) {
                  let app = 0, stu = 0;
                  eData.forEach(d => { app += safeParse(d.核定招生人數); stu += safeParse(d.入園人數); });
                  if (detail === 'appEnroll') entry[dataKey] = app;
                  if (detail === 'stuAmount') entry[dataKey] = stu;
                  if (detail === 'occupancyRate') entry[dataKey] = app > 0 ? Number(((stu / app) * 100).toFixed(2)) : 0;
                } else if (subStat && instType === '全部') {
                  if (detail === 'appEnroll') entry[dataKey] = safeParse(subStat.appEnroll);
                  if (detail === 'stuAmount') entry[dataKey] = safeParse(subStat.stuAmount);
                  if (detail === 'occupancyRate') entry[dataKey] = subStat.occupancyRate || 0;
                } else entry[dataKey] = 0;
              }
              if (detail === 'popTotal') entry[dataKey] = (isTaipei || isDistrict) && pData ? safeParse(pData.total) : 0;
            } else if (cat === 'inst_count') {
              if (isTaipei || isDistrict) {
                if (detail === 'public') entry[dataKey] = safeParse(iData?.公立);
                if (detail === 'nonProfit') entry[dataKey] = safeParse(iData?.非營利);
                if (detail === 'quasiPublic') entry[dataKey] = safeParse(iData?.準公共);
                if (detail === 'educare') entry[dataKey] = safeParse(iData?.教保中心); 
                if (detail === 'private') entry[dataKey] = safeParse(iData?.私立);
                if (detail === 'total') entry[dataKey] = safeParse(iData?.合計);
                if (detail === 'publicRatio') entry[dataKey] = iData && iData.公共化占比 ? parseFloat(String(iData.公共化占比).replace('%', '')) : 0;
              } else {
                entry[dataKey] = 0; 
              }
            } else if (cat === 'survey') {
              const surveyMetric = parts[2]; 
              let req = 0, perf = 0;
              if (sourceData) {
                if (detail.startsWith('dim_')) {
                  const dimName = detail.replace('dim_', '');
                  req = sourceData.構面?.[dimName]?.需求度 ?? 0;
                  perf = sourceData.構面?.[dimName]?.滿意度 ?? 0;
                } else if (detail.startsWith('q_')) {
                  const qId = detail.replace('q_', '');
                  req = sourceData.逐題?.[qId]?.需求度 ?? 0;
                  perf = sourceData.逐題?.[qId]?.滿意度 ?? 0;
                }
              }
              if (surveyMetric === 'req') entry[dataKey] = req;
              if (surveyMetric === 'perf') entry[dataKey] = perf;
              if (surveyMetric === 'gap') entry[dataKey] = (req !== 0 || perf !== 0) ? Number((perf - req).toFixed(2)) : 0;
            } else if (cat === 'priority') {
              if (sourceData && sourceData.優先關注因素) {
                entry[dataKey] = sourceData.優先關注因素[detail] || 0;
              } else {
                entry[dataKey] = 0;
              }
            }
          });
        });
      });
      result.push(entry);
    });
    return result;
  }, [customSelectedYears, customSelectedRegions, validDistrictNames, activeMetrics, customSelectedInstTypes]);

  // 建構所有顯示的資料維度陣列，用於統一分配樣式及顏色
  const seriesList = useMemo(() => {
    const list = [];
    let seriesIndex = 0;
    activeMetrics.forEach((m, mIdx) => {
      customSelectedInstTypes.forEach((instType, iIdx) => {
        customSelectedRegions.forEach((region, rIdx) => {
          const dataKey = `${m.id}___${region}___${instType}`;
          const displayName = `${region} - ${m.name} [${instType}]`;
          const isGapMetric = m.axisId === 'gap';
          
          // 不同指標會有高差異的獨立色彩
          const color = EXTENDED_COLORS[seriesIndex % EXTENDED_COLORS.length];
          const style = LINE_STYLES[seriesIndex % LINE_STYLES.length]; 
          
          list.push({
            dataKey,
            displayName,
            metric: m,
            color,
            isGapMetric,
            shape: style.shape,
            dash: style.dash
          });
          seriesIndex++;
        });
      });
    });
    return list;
  }, [activeMetrics, customSelectedInstTypes, customSelectedRegions]);

  const handleExportCustomExcel = () => {
    const formattedData = customChartData.map(row => {
      let newRow = { '年份': row.name };
      activeMetrics.forEach(m => { 
        customSelectedInstTypes.forEach(instType => {
          customSelectedRegions.forEach(r => {
            const key = `${m.id}___${r}___${instType}`;
            if (row[key] !== undefined) {
              newRow[`${r} - ${m.name} [${instType}]`] = row[key];
            }
          });
        });
      });
      return newRow;
    });
    exportToExcel(formattedData, '自訂圖表資料');
  };

  const activeAxisIds = [...new Set(activeMetrics.map(m => m.axisId))];
  const sortedActiveAxisIds = activeAxisIds.sort((a, b) => {
    const order = { people: 1, inst: 2, percent: 3, score: 4, gap: 5 };
    return order[a] - order[b];
  });
  
  const axisSettings = {
    people: { name: '人數/累計次數', color: '#3b82f6' },
    inst: { name: '單位數 (間)', color: '#8b5cf6' },
    percent: { name: '百分比 (%)', color: '#f43f5e' },
    score: { name: '滿意度 (分)', color: '#10b981' },
    gap: { name: '品質落差', color: '#f59e0b' }
  };

  const getOrientation = (id) => {
    const index = sortedActiveAxisIds.indexOf(id);
    return index === 0 ? 'left' : 'right'; 
  };

  const renderCustomChartLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 text-[13px] font-bold pt-[15px] cursor-pointer">
        {payload.map((entry, index) => {
          const dataKey = entry.dataKey;
          const seriesConfig = seriesList.find(s => s.dataKey === dataKey);
          if (!seriesConfig) return null;

          const isHovered = hoveredMetricId === dataKey;
          const isLine = seriesConfig.metric.chartType === 'line';
          const opacity = 1;

          const baseColor = seriesConfig.color;
          const isGap = seriesConfig.isGapMetric;
          const sStroke = baseColor;
          const sFill = isGap ? baseColor : '#ffffff';
          const shape = seriesConfig.shape;

          return (
            <div
              key={`legend-${index}`}
              className="flex items-center"
              onMouseEnter={() => setHoveredMetricId(dataKey)}
              onMouseLeave={() => setHoveredMetricId(null)}
              style={{ opacity: hoveredMetricId && !isHovered ? 0.2 : 1 }}
            >
              {!isLine ? (
                 <div style={{width: 14, height: 14, backgroundColor: baseColor, opacity, borderRadius: 2, marginRight: 6}}></div>
              ) : (
                 <svg width="14" height="14" viewBox="0 0 14 14" className="mr-1.5" style={{ overflow: 'visible', opacity }}>
                   {shape === 'diamond' && <polygon points="7,1 13,7 7,13 1,7" fill={sFill} stroke={sStroke} strokeWidth={2} />}
                   {shape === 'circle' && <circle cx="7" cy="7" r="5.5" fill={sFill} stroke={sStroke} strokeWidth={2} />}
                   {shape === 'square' && <rect x="1.5" y="1.5" width="11" height="11" fill={sFill} stroke={sStroke} strokeWidth={2} />}
                   {shape === 'triangle' && <polygon points="7,1.5 13.5,12 0.5,12" fill={sFill} stroke={sStroke} strokeWidth={2} />}
                 </svg>
              )}
              <span style={{ color: '#475569' }}>{seriesConfig.displayName}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const itemsToDisplay = hoveredMetricId 
        ? payload.filter(p => p.dataKey === hoveredMetricId)
        : payload;

      return (
        <div className="bg-white p-3 border rounded-xl shadow-lg text-sm z-50 relative">
          <p className="font-bold text-slate-700 mb-2">{label}</p>
          {itemsToDisplay.map((entry, index) => {
            let unit = '';
            if (entry.name.includes('人數') || entry.name.includes('核定') || entry.name.includes('實際') || entry.name.includes('在意因素')) unit = ' 人';
            else if (entry.name.includes('機構數')) unit = ' 間';
            else if (entry.name.includes('%') || entry.name.includes('佔比') || entry.name.includes('率')) unit = ' %';
            else if (entry.name.includes('Gap') || entry.name.includes('滿意') || entry.name.includes('需求')) unit = ' 分';
            
            return (
              <div key={index} className="font-bold flex items-center gap-1" style={{ color: entry.color, opacity: entry.payload.fillOpacity || 1 }}>
                {entry.name}: {entry.value}{unit}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
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
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">📍 選擇比較區域：</span>
              <button 
                onClick={() => setCustomSelectedRegions([])} 
                className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold hover:bg-slate-300 transition-colors"
              >
                一鍵清空
              </button>
            </div>
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
                    if (customSelectedRegions.length >= 2) {
                      alert('僅可兩個區域比對');
                      return;
                    }
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
                    {supplyDemandData.find(d => d.id === customSelectedMainDistrict)?.sub_districts?.map(sub => (
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
                {activeCategory === 'inst_count' && INST_COUNT_SUB_OPTIONS.map(subOpt => (
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

                {activeCategory === 'priority' && PRIORITY_OPTIONS.map(subOpt => (
                  <option key={subOpt.id} value={subOpt.id}>{subOpt.name}</option>
                ))}
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
        
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col gap-5 lg:col-span-2">
          <h3 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">3. 選擇篩選機構 (支援多選對比)</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {instTypesList.map(type => (
              <button 
                key={type} 
                onClick={() => toggleCustomInstType(type)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${customSelectedInstTypes.includes(type) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-2">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-slate-700 block">4. 已選擇之對比指標 (可個別自訂圖表類型)：</span>
          <button 
            onClick={() => { setActiveMetrics([]); setCustomChartError(''); }} 
            className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded font-bold hover:bg-slate-300 transition-colors"
          >
            一鍵清空
          </button>
        </div>
        
        {customChartError && (
          <div className="text-sm text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 mb-4 font-bold flex items-center gap-2 shadow-sm">
            ⚠️ 無法加入指標：{customChartError}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {activeMetrics.length === 0 ? <span className="text-sm text-slate-400 bg-white px-3 py-1 rounded">尚未加入任何指標</span> : 
            activeMetrics.map(m => (
              <div key={m.id} className="flex flex-col border-2 rounded-xl p-2 bg-white shadow-sm" style={{borderColor: m.color}}>
                <div className="flex justify-between items-center mb-2 gap-3">
                  <span className="text-xs font-bold" style={{color: m.color}}>{m.name}</span>
                  <button onClick={() => {
                      setActiveMetrics(prev => prev.filter(item => item.id !== m.id));
                      setCustomChartError(''); 
                    }} 
                    className="text-slate-400 hover:text-red-500 text-xs font-bold bg-slate-50 px-1.5 py-0.5 rounded transition-colors"
                  >✖</button>
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
        {activeMetrics.some(m => m.id.includes('publicRatio')) && (
          <div className="text-rose-600 text-xs md:text-sm font-bold bg-rose-50 p-3 rounded-xl mb-4 border border-rose-200 shadow-sm">
            💡 特別註明：公共化占比是「機構數量占比」，不是公共化幼兒園招生名額占比，也不是幼兒就讀公共化機構的人數占比。
          </div>
        )}
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
                            dataMin => Math.max(3.5, dataMin - 1), 
                            dataMax => Math.min(5, dataMax + 1)    
                          ] : 
                          axisId === 'gap' ? [
                            dataMin => Number((dataMin - 0.2).toFixed(2)),
                            dataMax => Number((dataMax + 0.2).toFixed(2))
                          ] : 
                          [dataMin => dataMin === 0 ? 0 : Number((dataMin * 0.95).toFixed(0)), dataMax => Number((dataMax * 1.05).toFixed(0))]
                        }
                      />
                    );
                  })}
                  
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9'}} />
                  
                  <Legend content={renderCustomChartLegend} />

                  {seriesList.map((series) => {
                    const isHovered = hoveredMetricId === series.dataKey;

                    if (series.metric.chartType === 'line') {
                      return (
                        <Line 
                          isAnimationActive={false} 
                          key={series.dataKey} 
                          yAxisId={series.metric.axisId} 
                          type="monotone" 
                          dataKey={series.dataKey} 
                          name={series.displayName} 
                          stroke={series.color} 
                          strokeOpacity={1}
                          strokeDasharray={series.dash}
                          strokeWidth={isHovered ? 5 : 2} 
                          opacity={hoveredMetricId && !isHovered ? 0.2 : 1} 
                          dot={(props) => {
                            const fill = series.isGapMetric ? getGapColor(props.value) : '#ffffff';
                            const strokeColor = series.isGapMetric ? getGapColor(props.value) : series.color;
                            return renderShapeDot({...props, stroke: strokeColor}, series.shape, series.isGapMetric, 1);
                          }}
                          activeDot={{r:6}} 
                          onMouseEnter={() => setHoveredMetricId(series.dataKey)}
                          legendType={series.shape}
                        />
                      );
                    }
                    return (
                      <Bar 
                        isAnimationActive={false} 
                        key={series.dataKey} 
                        yAxisId={series.metric.axisId} 
                        dataKey={series.dataKey} 
                        name={series.displayName} 
                        fill={series.color} 
                        fillOpacity={1}
                        radius={[4,4,0,0]} 
                        barSize={30} 
                        opacity={hoveredMetricId && !isHovered ? 0.2 : 1} 
                        onMouseEnter={() => setHoveredMetricId(series.dataKey)}
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
                <th className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">年份</th>
                {activeMetrics.flatMap(m => 
                  customSelectedInstTypes.flatMap(inst => 
                    customSelectedRegions.map(r => (
                      <th key={`${m.id}___${r}___${inst}`} className="px-4 py-3 whitespace-nowrap text-center border-r border-slate-100">
                        {r} - {m.name} [{inst}]
                        {m.id.includes('occupancyRate') && (
                          <div className="text-[10px] font-normal text-slate-500 mt-0.5">招生率＝實際招收÷核定招收</div>
                        )}
                      </th>
                    ))
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {customChartData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap bg-white border-r border-slate-100">{row.name}</td>
                  {activeMetrics.flatMap(m => 
                    customSelectedInstTypes.flatMap(inst => 
                      customSelectedRegions.map(r => (
                        <td key={`${m.id}___${r}___${inst}`} className="px-4 py-3 font-medium text-center border-r border-slate-100 last:border-r-0">
                          {row[`${m.id}___${r}___${inst}`]}
                        </td>
                      ))
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}