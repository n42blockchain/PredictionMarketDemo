import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import { Layout } from './components/layout/Layout';
import { MarketsPage } from './pages/MarketsPage';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { PortfolioPage } from './pages/PortfolioPage';

function App() {
  return (
    <Web3Provider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<MarketsPage />} />
            <Route path="/market/:address" element={<MarketDetailPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
          </Routes>
        </Layout>
      </Router>
    </Web3Provider>
  );
}

export default App;
