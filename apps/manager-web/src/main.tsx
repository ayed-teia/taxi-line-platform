import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { LiveMapPage } from './pages/LiveMapPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/live-map" replace />} />
          <Route path="live-map" element={<LiveMapPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
