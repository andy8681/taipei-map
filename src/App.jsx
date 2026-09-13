import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';

// 匯入你放在 components 資料夾裡的 MapA 與 MapB
import MapA from './components/MapA';
import MapB from './components/MapB';

// 建立一個新的元件，用來「同時」顯示 MapA 和 MapB (左右並排)
function MapBoth() {
  return (
    <div style={{ display: 'flex', width: '100%', height: '90vh' }}>
      {/* 左邊顯示 MapA */}
      <div style={{ flex: 1, borderRight: '2px solid #ccc', padding: '10px' }}>
        <h3 style={{ textAlign: 'center' }}>Map A</h3>
        <MapA />
      </div>
      
      {/* 右邊顯示 MapB */}
      <div style={{ flex: 1, padding: '10px' }}>
        <h3 style={{ textAlign: 'center' }}>Map B</h3>
        <MapB />
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      {/* 導覽列：提供點擊切換的按鈕 */}
      <nav style={{ padding: '15px', backgroundColor: '#f0f0f0', display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <Link to="/mapA" style={linkStyle}>只看 Map A</Link>
        <Link to="/mapB" style={linkStyle}>只看 Map B</Link>
        <Link to="/both" style={linkStyle}>同時看 A 與 B</Link>
      </nav>

      {/* 路由控制區域：決定哪個網址要顯示哪個元件 */}
      <Routes>
        {/* 當網址結尾是 /mapA 時，載入 MapA */}
        <Route path="/mapA" element={<MapA />} />
        
        {/* 當網址結尾是 /mapB 時，載入 MapB */}
        <Route path="/mapB" element={<MapB />} />

        {/* 當網址結尾是 /both 時，載入上面做好的並排畫面 */}
        <Route path="/both" element={<MapBoth />} />
        
        {/* 預設根目錄 (打開網頁的第一眼)：預設顯示「同時看 A 與 B」 */}
        <Route path="/" element={<MapBoth />} />
      </Routes>
    </HashRouter>
  );
}

// 簡單的按鈕樣式 (可依需求自行修改)
const linkStyle = {
  textDecoration: 'none',
  padding: '8px 16px',
  backgroundColor: '#007BFF',
  color: 'white',
  borderRadius: '4px',
  fontWeight: 'bold'
};

export default App;