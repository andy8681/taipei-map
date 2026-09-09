import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';

// 匯入你放在 components 資料夾裡的 MapA 與 MapB
import MapA from './components/MapA';
import MapB from './components/MapB';

function App() {
  return (
    <HashRouter>

      {/* 路由控制區域：決定哪個網址要顯示哪個元件 */}
      <Routes>
        {/* 當網址結尾是 /mapA 時，載入 MapA */}
        <Route path="/mapA" element={<MapA />} />
        
        {/* 當網址結尾是 /mapB 時，載入 MapB */}
        <Route path="/mapB" element={<MapB />} />
        
        {/* 預設根目錄 (打開網頁的第一眼)：這裡設定預設顯示 MapA */}
        <Route path="/" element={<MapA />} />
      </Routes>
    </HashRouter>
  );
}

export default App;