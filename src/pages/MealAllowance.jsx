import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, Calendar, Check, X, Edit2 } from 'lucide-react';
import { getAllMealAllowances, setMealAllowance } from '../db';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function MealAllowance() {
    const [allowances, setAllowances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newMonth, setNewMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [newAmount, setNewAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getAllMealAllowances();
        setAllowances(data);
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!newAmount || isNaN(parseFloat(newAmount))) return;

        await setMealAllowance(newMonth, parseFloat(newAmount));
        setShowAdd(false);
        setNewAmount('');
        loadData();
    };

    const formatMonthYear = (monthYear) => {
        const date = parseISO(monthYear + '-01');
        const formatted = format(date, 'MMMM yyyy', { locale: ptBR });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Vale Alimentação</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAdd(!showAdd)}
                    style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {showAdd ? <X size={24} /> : <Plus size={24} />}
                </button>
            </div>

            {showAdd && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)', border: '2px solid var(--primary-200)' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Lançar Vale</h3>
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Mês/Ano</label>
                                <input
                                    type="month"
                                    className="input"
                                    value={newMonth}
                                    onChange={(e) => setNewMonth(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Valor Recebido (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    placeholder="0,00"
                                    value={newAmount}
                                    onChange={(e) => setNewAmount(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar Vale</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--slate-500)', padding: 'var(--spacing-xl)' }}>Carregando...</p>
                ) : allowances.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <Wallet size={64} color="var(--slate-200)" style={{ margin: '0 auto var(--spacing-md)' }} />
                        <p style={{ color: 'var(--slate-400)' }}>Nenhum vale lançado ainda.</p>
                        <p style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '8px' }}>Lance quanto você recebeu no mês para acompanhar o saldo.</p>
                    </div>
                ) : (
                    allowances.map(allowance => (
                        <div key={allowance.id} className="card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '4px' }}>
                                    <Calendar size={14} color="var(--primary-600)" />
                                    <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                                        {formatMonthYear(allowance.month_year)}
                                    </h3>
                                </div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>Valor creditado</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--primary-700)' }}>
                                    R$ {parseFloat(allowance.amount).toFixed(2)}
                                </p>
                                <button
                                    onClick={() => {
                                        setNewMonth(allowance.month_year);
                                        setNewAmount(allowance.amount);
                                        setShowAdd(true);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '4px' }}
                                >
                                    Editar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-md)', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--primary-700)', fontWeight: 600 }}>
                    💡 O saldo será debitado automaticamente conforme você registrar novas compras no Dashboard.
                </p>
            </div>
        </div>
    );
}

export default MealAllowance;
