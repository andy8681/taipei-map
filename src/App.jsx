import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

// 匯入你放在 components 資料夾裡的 MapA 與 MapB
import MapA from './components/MapA';
import MapB from './components/MapB';

function MapBoth() {
  return (
    <div style={{ display: 'flex', width: '100%', height: '90vh' }}>
      <div style={{ flex: 1, borderRight: '2px solid #ccc', padding: '10px' }}>
        <h3 style={{ textAlign: 'center' }}>Map A</h3>
        <MapA />
      </div>
      <div style={{ flex: 1, padding: '10px' }}>
        <h3 style={{ textAlign: 'center' }}>Map B</h3>
        <MapB />
      </div>
    </div>
  );
}

// 建立一個 Layout 元件來管理導覽列顯示與否
function MainLayout() {
  const location = useLocation();
  
  // 判斷是否要顯示上方按鈕：
  // 只有在根目錄 '/' 或 '/both' 時才顯示按鈕。
  // 如果進入 '/mapB' 或 '/mapA'，按鈕就會自動隱藏！
  const showNav = location.pathname === '/' || location.pathname === '/both';

  return (
    <>
      {/* 依照 showNav 的布林值決定要不要渲染導覽列 */}
      {showNav && (
        <nav style={{ padding: '15px', backgroundColor: '#f0f0f0', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link to="/mapA" style={linkStyle}>只看 Map A</Link>
          <Link to="/mapB" style={linkStyle}>只看 Map B</Link>
          <Link to="/both" style={linkStyle}>同時看 A 與 B</Link>
        </nav>
      )}

      {/* 路由控制區域 */}
      <Routes>
        <Route path="/mapA" element={<MapA />} />
        <Route path="/mapB" element={<MapB />} />
        <Route path="/both" element={<MapBoth />} />
        <Route path="/" element={<MapBoth />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <HashRouter>
      {/* 把原本放在這裡的 nav 和 Routes 移進 MainLayout 中 */}
      <MainLayout />
    </HashRouter>
  );
}

const linkStyle = {
  textDecoration: 'none',
  padding: '8px 16px',
  backgroundColor: '#007BFF',
  color: 'white',
  borderRadius: '4px',
  fontWeight: 'bold'
};

export default App;