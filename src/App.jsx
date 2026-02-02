import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, History, TrendingUp, Search, ClipboardList, Tag, Heart, Sparkles } from 'lucide-react';
import NewPurchase from './pages/NewPurchase';
import ShoppingList from './pages/ShoppingList';
import PurchaseHistory from './pages/PurchaseHistory';
import Dashboard from './pages/Dashboard';
import ProductSearch from './pages/ProductSearch';
import Catalog from './pages/Catalog';

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
                        <Route path="/catalog" element={<Catalog />} />
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
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-500))',
            color: 'white',
            padding: 'var(--spacing-xl) var(--spacing-lg)',
            boxShadow: 'var(--shadow-lg)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            borderBottomLeftRadius: 'var(--radius-xl)',
            borderBottomRightRadius: 'var(--radius-xl)',
        }}>
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        letterSpacing: '-1px'
                    }}>
                        <img src="/logo.png" alt="Jireh Logo" style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', background: 'white', padding: '2px' }} />
                        Jireh
                    </h1>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>v2.0.0</span>
                </div>
                <p style={{
                    fontSize: 'var(--font-size-sm)',
                    opacity: 0.9,
                    marginTop: 'var(--spacing-sm)',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <Sparkles size={14} /> Feito para vocês economizarem juntos
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
        { path: '/search', icon: Search, label: 'Consulta' },
        { path: '/catalog', icon: Tag, label: 'Gerenciar' }
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
                gridTemplateColumns: 'repeat(6, 1fr)',
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
                                padding: 'var(--spacing-md) var(--spacing-xs)',
                                textDecoration: 'none',
                                color: isActive ? 'var(--primary-600)' : 'var(--slate-400)',
                                transition: 'all 0.3s ease',
                                position: 'relative'
                            }}
                        >
                            <div style={{
                                padding: '4px 16px',
                                borderRadius: '16px',
                                background: isActive ? 'var(--primary-100)' : 'transparent',
                                color: isActive ? 'var(--primary-700)' : 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500 }}>
                                    {label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default App;
