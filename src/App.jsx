import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

// 1. 記得匯入你的 MapC 元件
import MapA from './components/MapA';
import MapB from './components/MapB';
import MapC from './components/MapC'; 

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

function MainLayout() {
  const location = useLocation();
  
  const showNav = location.pathname === '/' || location.pathname === '/both';

  return (
    <>
      {showNav && (
        <nav style={{ padding: '15px', backgroundColor: '#f0f0f0', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link to="/mapA" style={linkStyle}>只看 Map A</Link>
          <Link to="/mapB" style={linkStyle}>只看 Map B</Link>
          <Link to="/both" style={linkStyle}>同時看 A 與 B</Link>
          {/* 2. 這裡「不」加入 MapC 的 Link，這樣首頁就不會有按鈕 */}
        </nav>
      )}

      <Routes>
        <Route path="/mapA" element={<MapA />} />
        <Route path="/mapB" element={<MapB />} />
        <Route path="/both" element={<MapBoth />} />
        <Route path="/" element={<MapBoth />} />
        {/* 3. 在這裡註冊 MapC 的獨立路由 */}
        <Route path="/mapC" element={<MapC />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <HashRouter>
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