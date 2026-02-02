import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, History, TrendingUp, Search, ClipboardList } from 'lucide-react';
import NewPurchase from './pages/NewPurchase';
import ShoppingList from './pages/ShoppingList';
import PurchaseHistory from './pages/PurchaseHistory';
import Dashboard from './pages/Dashboard';
import ProductSearch from './pages/ProductSearch';

function App() {
    return (
        <Router>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header />
                <main style={{ flex: 1, paddingBottom: '80px' }}>
                    <Routes>
                        <Route path="/" element={<NewPurchase />} />
                        <Route path="/list" element={<ShoppingList />} />
                        <Route path="/history" element={<PurchaseHistory />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/search" element={<ProductSearch />} />
                    </Routes>
                </main>
                <Navigation />
            </div>
        </Router>
    );
}

function Header() {
    return (
        <header style={{
            background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-500))',
            color: 'white',
            padding: 'var(--spacing-lg)',
            boxShadow: 'var(--shadow-lg)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div className="container">
                <h1 style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                }}>
                    <ShoppingCart size={32} />
                    Smart Price Tracker
                </h1>
                <p style={{
                    fontSize: 'var(--font-size-sm)',
                    opacity: 0.9,
                    marginTop: 'var(--spacing-xs)'
                }}>
                    Economize nas suas compras
                </p>
            </div>
        </header>
    );
}

function Navigation() {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: ShoppingCart, label: 'Nova Compra' },
        { path: '/list', icon: ClipboardList, label: 'Listas' },
        { path: '/history', icon: History, label: 'Histórico' },
        { path: '/dashboard', icon: TrendingUp, label: 'Dashboard' },
        { path: '/search', icon: Search, label: 'Consulta' }
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '2px solid var(--slate-200)',
            boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.1)',
            zIndex: 100
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {navItems.map(({ path, icon: Icon, label }) => {
                    const isActive = location.pathname === path;
                    return (
                        <Link
                            key={path}
                            to={path}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                padding: 'var(--spacing-md)',
                                textDecoration: 'none',
                                color: isActive ? 'var(--emerald-600)' : 'var(--slate-500)',
                                background: isActive ? 'var(--emerald-50)' : 'transparent',
                                borderTop: isActive ? '3px solid var(--emerald-600)' : '3px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Icon size={24} />
                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default App;
