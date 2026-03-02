import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Calendar, ShoppingBag, UtensilsCrossed, Loader, AlertCircle } from 'lucide-react';
import {
    getAllCardapios, createCardapio, updateCardapio, deleteCardapio,
    addPrato, updatePrato, deletePrato,
    addIngrediente, deleteIngrediente,
    saveFrequencia
} from '../db';
import { createShoppingList, addShoppingListItem } from '../db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, differenceInWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIAS_SEMANA = [
    { id: 0, label: 'Dom', full: 'Domingo' },
    { id: 1, label: 'Seg', full: 'Segunda' },
    { id: 2, label: 'Ter', full: 'Terça' },
    { id: 3, label: 'Qua', full: 'Quarta' },
    { id: 4, label: 'Qui', full: 'Quinta' },
    { id: 5, label: 'Sex', full: 'Sexta' },
    { id: 6, label: 'Sáb', full: 'Sábado' },
];

const INTERVALOS = [
    { value: 1, label: 'Toda semana' },
    { value: 2, label: 'A cada 2 semanas (~15 dias)' },
    { value: 3, label: 'A cada 3 semanas' },
    { value: 4, label: 'A cada 4 semanas (~mensal)' },
];

// Calcula as datas de um mês em que um cardápio com frequência se aplica
function calcularDatasDoMes(frequencia, ano, mes) {
    if (!frequencia || !frequencia.days_of_week?.length) return [];
    const { days_of_week, interval_weeks, reference_date } = frequencia;
    const refDate = new Date(reference_date + 'T12:00:00');
    const inicio = startOfMonth(new Date(ano, mes - 1, 1));
    const fim = endOfMonth(inicio);
    const dias = eachDayOfInterval({ start: inicio, end: fim });

    return dias.filter(dia => {
        const dow = getDay(dia);
        if (!days_of_week.includes(dow)) return false;
        // Calcula semanas inteiras desde a referência
        const diffWeeks = differenceInWeeks(dia, refDate);
        return diffWeeks >= 0 && diffWeeks % interval_weeks === 0;
    }).map(d => d.getDate());
}

// ============================================================
// Componente Principal
// ============================================================
export default function Cardapio() {
    const [cardapios, setCardapios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('list'); // 'list' | 'edit'
    const [editingCardapio, setEditingCardapio] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const hoje = new Date();
    const mesAtual = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getAllCardapios();
            setCardapios(data);
        } catch (e) {
            setError('Erro ao carregar cardápios: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Excluir este cardápio?')) return;
        try {
            await deleteCardapio(id);
            setCardapios(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            setError(e.message);
        }
    };

    const handleGerarLista = async (cardapio) => {
        const ingredientes = cardapio.cardapio_pratos?.flatMap(p => p.cardapio_ingredientes || []) || [];
        if (!ingredientes.length) { setError('Este cardápio não tem ingredientes cadastrados.'); return; }

        try {
            const listId = await createShoppingList({ name: `Cardápio: ${cardapio.name}` });
            for (const ing of ingredientes) {
                await addShoppingListItem({ listId, productName: ing.product_name, unit: ing.unit || 'un' });
            }
            setSuccessMsg(`Lista "${cardapio.name}" criada com ${ingredientes.length} ingredientes! Acesse em Lista de Compras.`);
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (e) {
            setError('Erro ao gerar lista: ' + e.message);
        }
    };

    const openNew = () => setEditingCardapio({ id: null, name: '', description: '', cardapio_pratos: [], cardapio_frequencia: null });
    const openEdit = (c) => setEditingCardapio(JSON.parse(JSON.stringify(c)));

    if (view === 'edit' && editingCardapio !== null) {
        return (
            <CardapioEditor
                cardapio={editingCardapio}
                onSave={async (saved) => {
                    await load();
                    setView('list');
                    setEditingCardapio(null);
                    setSuccessMsg(`Cardápio "${saved.name}" salvo!`);
                    setTimeout(() => setSuccessMsg(''), 4000);
                }}
                onCancel={() => { setView('list'); setEditingCardapio(null); }}
            />
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: '6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Cardápios</h2>
                    <p style={{ color: 'var(--slate-600)', fontSize: 'var(--font-size-sm)' }}>
                        {format(new Date(mesAtual.ano, mesAtual.mes - 1), 'MMMM yyyy', { locale: ptBR })}
                    </p>
                </div>
                <button className="btn btn-primary" style={{ minHeight: 44, padding: '0 var(--spacing-md)' }}
                    onClick={() => { openNew(); setView('edit'); }}>
                    <Plus size={18} /> Novo
                </button>
            </div>

            {error && (
                <div style={{ background: 'var(--accent-50)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <AlertCircle size={18} color="var(--accent-500)" />
                    <span style={{ color: 'var(--slate-700)', fontSize: 'var(--font-size-sm)' }}>{error}</span>
                    <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>
            )}
            {successMsg && (
                <div style={{ background: '#dcfce7', border: '1px solid #16a34a', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: '#15803d', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <Check size={16} /> {successMsg}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                    <Loader size={32} color="var(--primary-500)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} />
                </div>
            ) : cardapios.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--slate-400)' }}>
                    <ChefHat size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.4, display: 'block' }} />
                    <p style={{ fontWeight: 600 }}>Nenhum cardápio ainda</p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>Crie o primeiro clicando em "Novo"</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {cardapios.map(c => (
                        <CardapioCard
                            key={c.id}
                            cardapio={c}
                            mesAtual={mesAtual}
                            onEdit={() => { openEdit(c); setView('edit'); }}
                            onDelete={() => handleDelete(c.id)}
                            onGerarLista={() => handleGerarLista(c)}
                        />
                    ))}
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ============================================================
// Card do Cardápio na listagem
// ============================================================
function CardapioCard({ cardapio, mesAtual, onEdit, onDelete, onGerarLista }) {
    const [expanded, setExpanded] = useState(false);
    const freq = cardapio.cardapio_frequencia?.[0] || cardapio.cardapio_frequencia || null;
    const datas = calcularDatasDoMes(freq, mesAtual.ano, mesAtual.mes);
    const totalIngredientes = cardapio.cardapio_pratos?.flatMap(p => p.cardapio_ingredientes || []).length || 0;
    const nomeMes = format(new Date(mesAtual.ano, mesAtual.mes - 1), 'MMMM', { locale: ptBR });

    const diasLabel = freq?.days_of_week?.length
        ? freq.days_of_week.sort().map(d => DIAS_SEMANA[d]?.label).join(', ')
        : 'Sem frequência';

    const intervaloLabel = freq ? (INTERVALOS.find(i => i.value === freq.interval_weeks)?.label || '') : '';

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: 'var(--spacing-md)', background: 'linear-gradient(135deg, var(--primary-50), white)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: '4px' }}>
                            <div style={{ background: 'var(--primary-100)', borderRadius: '8px', padding: '4px', display: 'flex' }}>
                                <ChefHat size={16} color="var(--primary-600)" />
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', color: 'var(--primary-800)' }}>{cardapio.name}</h3>
                        </div>
                        {cardapio.description && <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '6px' }}>{cardapio.description}</p>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                                📅 {diasLabel}
                            </span>
                            {intervaloLabel && (
                                <span style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 600 }}>
                                    🔁 {intervaloLabel}
                                </span>
                            )}
                            <span style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px' }}>
                                {cardapio.cardapio_pratos?.length || 0} pratos · {totalIngredientes} ingredientes
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={onEdit} style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--slate-600)' }}>
                            <Edit2 size={14} />
                        </button>
                        <button onClick={onDelete} style={{ background: 'white', border: '1px solid var(--accent-500)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--accent-500)' }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Datas do mês */}
            {datas.length > 0 && (
                <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--primary-700)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Calendar size={14} color="rgba(255,255,255,0.7)" />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{nomeMes}:</span>
                    {datas.map(d => (
                        <span key={d} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '12px', padding: '1px 8px', fontSize: '12px', fontWeight: 800 }}>
                            {String(d).padStart(2, '0')}/{String(mesAtual.mes).padStart(2, '0')}
                        </span>
                    ))}
                </div>
            )}

            {freq && datas.length === 0 && (
                <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--slate-100)', fontSize: '12px', color: 'var(--slate-400)' }}>
                    Nenhum uso agendado em {nomeMes}
                </div>
            )}

            {/* Ações */}
            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)', borderTop: '1px solid var(--slate-100)' }}>
                {totalIngredientes > 0 && (
                    <button onClick={onGerarLista} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-md)', padding: '8px', cursor: 'pointer', color: 'var(--primary-700)', fontWeight: 700, fontSize: '13px' }}>
                        <ShoppingBag size={15} /> Gerar Lista de Compras
                    </button>
                )}
                <button onClick={() => setExpanded(!expanded)} style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', padding: '8px 12px', cursor: 'pointer', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    {expanded ? <><ChevronUp size={14} /> Recolher</> : <><ChevronDown size={14} /> Ver pratos</>}
                </button>
            </div>

            {/* Pratos expandidos */}
            {expanded && (
                <div style={{ padding: 'var(--spacing-sm) var(--spacing-md) var(--spacing-md)', borderTop: '1px solid var(--slate-100)' }}>
                    {cardapio.cardapio_pratos?.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--slate-400)', fontStyle: 'italic' }}>Nenhum prato cadastrado</p>
                    ) : (
                        cardapio.cardapio_pratos?.map(prato => (
                            <div key={prato.id} style={{ marginBottom: 'var(--spacing-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <UtensilsCrossed size={13} color="var(--primary-500)" />
                                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{prato.name}</span>
                                </div>
                                {prato.cardapio_ingredientes?.length > 0 && (
                                    <div style={{ paddingLeft: '19px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {prato.cardapio_ingredientes.map(ing => (
                                            <span key={ing.id} style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', borderRadius: '12px', padding: '1px 8px', fontSize: '11px' }}>
                                                {ing.product_name} {ing.quantity > 1 ? `(${ing.quantity}${ing.unit})` : ''}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Editor de Cardápio (criar/editar)
// ============================================================
function CardapioEditor({ cardapio, onSave, onCancel }) {
    const [name, setName] = useState(cardapio.name || '');
    const [description, setDescription] = useState(cardapio.description || '');
    const [pratos, setPratos] = useState(cardapio.cardapio_pratos || []);
    const [novoPrato, setNovoPrato] = useState('');
    const [novoIng, setNovoIng] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Frequência
    const freqInicial = Array.isArray(cardapio.cardapio_frequencia)
        ? cardapio.cardapio_frequencia[0]
        : cardapio.cardapio_frequencia;
    const [diasSelecionados, setDiasSelecionados] = useState(freqInicial?.days_of_week || []);
    const [intervalSemanas, setIntervalSemanas] = useState(freqInicial?.interval_weeks || 1);
    const [refDate, setRefDate] = useState(freqInicial?.reference_date || format(new Date(), 'yyyy-MM-dd'));

    // Preview das próximas datas
    const hoje = new Date();
    const freqPreview = { days_of_week: diasSelecionados, interval_weeks: intervalSemanas, reference_date: refDate };
    const datasPreview = calcularDatasDoMes(freqPreview, hoje.getFullYear(), hoje.getMonth() + 1);
    const nomeMesPreview = format(hoje, 'MMMM', { locale: ptBR });

    const toggleDia = (dia) => setDiasSelecionados(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);

    const handleAddPrato = async () => {
        if (!novoPrato.trim() || !cardapio.id) return;
        try {
            const p = await addPrato(cardapio.id, novoPrato.trim(), pratos.length);
            setPratos(prev => [...prev, { ...p, cardapio_ingredientes: [] }]);
            setNovoPrato('');
        } catch (e) { setError(e.message); }
    };

    const handleDeletePrato = async (pratoId) => {
        try {
            await deletePrato(pratoId);
            setPratos(prev => prev.filter(p => p.id !== pratoId));
        } catch (e) { setError(e.message); }
    };

    const handleAddIng = async (pratoId) => {
        const val = (novoIng[pratoId] || '').trim();
        if (!val) return;
        try {
            const parts = val.split(' ');
            const productName = parts[0];
            const qty = parseFloat(parts[1]) || 1;
            const unit = parts[2] || 'un';
            const ing = await addIngrediente(pratoId, productName, qty, unit);
            setPratos(prev => prev.map(p => p.id === pratoId ? { ...p, cardapio_ingredientes: [...(p.cardapio_ingredientes || []), ing] } : p));
            setNovoIng(prev => ({ ...prev, [pratoId]: '' }));
        } catch (e) { setError(e.message); }
    };

    const handleDeleteIng = async (pratoId, ingId) => {
        try {
            await deleteIngrediente(ingId);
            setPratos(prev => prev.map(p => p.id === pratoId ? { ...p, cardapio_ingredientes: p.cardapio_ingredientes.filter(i => i.id !== ingId) } : p));
        } catch (e) { setError(e.message); }
    };

    const handleSave = async () => {
        if (!name.trim()) { setError('Informe o nome do cardápio.'); return; }
        setSaving(true); setError('');
        try {
            let saved;
            if (cardapio.id) {
                saved = await updateCardapio(cardapio.id, { name: name.trim(), description });
            } else {
                saved = await createCardapio(name.trim(), description);
            }
            if (diasSelecionados.length > 0) {
                await saveFrequencia(saved.id, diasSelecionados, intervalSemanas, refDate);
            }
            onSave(saved);
        } catch (e) {
            setError('Erro ao salvar: ' + e.message);
            setSaving(false);
        }
    };

    const isNew = !cardapio.id;

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: '6rem' }}>
            <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 700, cursor: 'pointer', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)', padding: 0 }}>
                ← Voltar
            </button>

            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--spacing-lg)' }}>
                {isNew ? 'Novo Cardápio' : `Editar: ${cardapio.name}`}
            </h2>

            {error && (
                <div style={{ background: 'var(--accent-50)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--accent-500)' }}>
                    {error}
                </div>
            )}

            {/* Nome e Descrição */}
            <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Nome do Cardápio *</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Almoço da Semana" />
                </div>
                <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Descrição (opcional)</label>
                    <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Pratos leves para os dias de semana" />
                </div>
            </div>

            {/* Frequência */}
            <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Calendar size={18} color="var(--primary-500)" /> Frequência de Uso
                </h3>

                <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>Dias da Semana</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
                    {DIAS_SEMANA.map(d => (
                        <button key={d.id} onClick={() => toggleDia(d.id)}
                            style={{ padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', border: '2px solid', borderColor: diasSelecionados.includes(d.id) ? 'var(--primary-500)' : 'var(--slate-200)', background: diasSelecionados.includes(d.id) ? 'var(--primary-100)' : 'white', color: diasSelecionados.includes(d.id) ? 'var(--primary-700)' : 'var(--slate-500)', fontWeight: diasSelecionados.includes(d.id) ? 800 : 500, fontSize: '13px', transition: 'all 0.15s' }}>
                            {d.label}
                        </button>
                    ))}
                </div>

                <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>Intervalo</label>
                <select className="select" value={intervalSemanas} onChange={e => setIntervalSemanas(Number(e.target.value))} style={{ marginBottom: 'var(--spacing-md)' }}>
                    {INTERVALOS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>

                <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                    Data de Referência <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}>(semana inicial para contar o intervalo)</span>
                </label>
                <input type="date" className="input" value={refDate} onChange={e => setRefDate(e.target.value)} style={{ marginBottom: 'var(--spacing-md)' }} />

                {/* Preview */}
                {diasSelecionados.length > 0 && (
                    <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary-700)', marginBottom: '8px' }}>
                            📅 Previsão para {nomeMesPreview}:
                        </p>
                        {datasPreview.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {datasPreview.map(d => {
                                    const date = new Date(hoje.getFullYear(), hoje.getMonth(), d);
                                    const diaSemana = DIAS_SEMANA[getDay(date)].full;
                                    return (
                                        <span key={d} style={{ background: 'var(--primary-500)', color: 'white', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                                            {diaSemana}, {String(d).padStart(2, '0')}/{String(hoje.getMonth() + 1).padStart(2, '0')}
                                        </span>
                                    );
                                })}
                            </div>
                        ) : (
                            <p style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Nenhum dia se encaixa neste mês com essa configuração.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Pratos e Ingredientes (só se já foi salvo antes) */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <UtensilsCrossed size={18} color="var(--primary-500)" /> Pratos e Ingredientes
                </h3>

                {isNew ? (
                    <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', fontSize: '13px', color: 'var(--primary-700)' }}>
                        💡 Salve o cardápio primeiro, depois adicione os pratos e ingredientes.
                    </div>
                ) : (
                    <>
                        {pratos.map(prato => (
                            <div key={prato.id} style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>🍽 {prato.name}</span>
                                    <button onClick={() => handleDeletePrato(prato.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-500)', padding: 4 }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--spacing-sm)' }}>
                                    {prato.cardapio_ingredientes?.map(ing => (
                                        <span key={ing.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'white', border: '1px solid var(--slate-200)', borderRadius: '12px', padding: '2px 8px', fontSize: '12px' }}>
                                            {ing.product_name} {ing.quantity > 1 ? `${ing.quantity}${ing.unit}` : ''}
                                            <button onClick={() => handleDeleteIng(prato.id, ing.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 0, lineHeight: 1 }}>
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <input className="input" style={{ minHeight: 'unset', padding: '6px 10px', fontSize: '13px' }}
                                        placeholder="Ingrediente (ex: Frango 500 g)" value={novoIng[prato.id] || ''}
                                        onChange={e => setNovoIng(prev => ({ ...prev, [prato.id]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleAddIng(prato.id)} />
                                    <button onClick={() => handleAddIng(prato.id)} style={{ background: 'var(--primary-500)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', cursor: 'pointer', color: 'white', fontWeight: 700 }}>
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input className="input" style={{ minHeight: 'unset', padding: '8px 12px', fontSize: '13px' }}
                                placeholder="Nome do prato..." value={novoPrato}
                                onChange={e => setNovoPrato(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddPrato()} />
                            <button onClick={handleAddPrato} className="btn btn-secondary" style={{ minHeight: 'unset', padding: '8px 14px' }}>
                                <Plus size={16} /> Prato
                            </button>
                        </div>
                    </>
                )}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: 'var(--spacing-lg)' }} disabled={saving || !name.trim()} onClick={handleSave}>
                {saving ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Check size={20} /> {isNew ? 'Criar Cardápio' : 'Salvar Alterações'}</>}
            </button>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
