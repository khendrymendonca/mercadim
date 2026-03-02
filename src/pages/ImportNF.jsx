import React, { useState, useEffect, useRef } from 'react';
import { FileText, Scan, Search, Check, X, AlertCircle, Store, Loader, Camera, ClipboardPaste, ExternalLink, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { addPurchase, getAllStores } from '../db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';

// Formata a chave para exibição
function formatChave(value) {
    const digits = value.replace(/\D/g, '').substring(0, 44);
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
}

// Extrai chave e URL do QR Code
function parseQRContent(text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+(?:\?|&)p=[0-9]{44}/i);
    const chaveMatch = text.match(/\b([0-9]{44})\b/);
    return { chave: chaveMatch?.[1] || null, qrUrl: urlMatch?.[0] || null };
}

// Parser client-side: extrai itens do texto copiado do portal SEFAZ
function parseNFText(rawText) {
    const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const result = { storeName: '', date: '', total: 0, items: [] };

    // Nome da loja (linhas iniciais, antes de CNPJ)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (lines[i].length > 4 && !/cnpj|cpf|inscri|endere|nfc|nf-e|emit|danfe/i.test(lines[i])) {
            result.storeName = lines[i];
            break;
        }
    }

    // Data
    const dateM = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateM) result.date = `${dateM[3]}-${dateM[2]}-${dateM[1]}`;

    // Total geral
    const totalPatterns = [
        /Valor\s+a\s+Pagar\s*R?\$?\s*([\d]+[.,]\d{2})/i,
        /Total\s+R?\$?\s*([\d]+[.,]\d{2})/i,
        /(?:TOTAL|Valor\s+Total)[^\d]*([\d]+[.,]\d{2})/i,
    ];
    for (const p of totalPatterns) {
        const m = text.match(p);
        if (m) { result.total = parseFloat(m[1].replace(',', '.')); break; }
    }

    // Estratégia 1: linhas com padrão "NOME ... QTD UN ... PREÇO ... TOTAL"
    // Exemplo: "FEIJ CARIOCA 1KG    1   KG   5,99   5,99"
    const itemLineRe = /^(.{3,50}?)\s+([\d]+[.,]?[\d]*)\s+(KG|UN|G|L|ML|CX|PC|PT|SC|LT|FD|DZ|PC|CT|BD|VD)\s+([\d]+[.,]\d{2})\s+([\d]+[.,]\d{2})/gim;
    let m;
    while ((m = itemLineRe.exec(text)) !== null) {
        const name = m[1].trim();
        const qty = parseFloat(m[2].replace(',', '.'));
        const unit = m[3].toLowerCase();
        const unitPrice = parseFloat(m[4].replace(',', '.'));
        const total = parseFloat(m[5].replace(',', '.'));
        if (name && qty > 0 && unitPrice > 0) {
            result.items.push({ name, qty, unit, unitPrice, total });
        }
    }

    // Estratégia 2: parseia blocos "Descrição / Qtde / Vl Unit / Vl Total"
    if (result.items.length === 0) {
        // Procura pares de linhas: nome na primeira, números na segunda
        for (let i = 0; i < lines.length - 1; i++) {
            const nameLine = lines[i];
            const numLine = lines[i + 1] || '';

            if (nameLine.length < 3 || /^\d|R\$|Total|CNPJ|Emiss/i.test(nameLine)) continue;

            const numbers = numLine.match(/[\d]+[.,]\d{2}/g);
            if (!numbers || numbers.length < 2) continue;

            const vals = numbers.map(n => parseFloat(n.replace(',', '.')));
            const total = vals[vals.length - 1];
            const unitPrice = vals[vals.length - 2] || total;
            const qty = total > 0 && unitPrice > 0 ? parseFloat((total / unitPrice).toFixed(3)) : 1;

            if (total > 0 && total < 5000) {
                result.items.push({ name: nameLine, qty, unit: 'un', unitPrice, total });
                i++;
            }
        }
    }

    // Estratégia 3: procura pelo padrão "NOME....R$ VALOR"
    if (result.items.length === 0) {
        const simpleRe = /^([A-Z][A-Z0-9 ]{2,40})\s+R?\$?\s*([\d]+[.,]\d{2})$/gim;
        while ((m = simpleRe.exec(text)) !== null) {
            const name = m[1].trim();
            const price = parseFloat(m[2].replace(',', '.'));
            if (price > 0 && price < 2000 && !/total|desconto|taxa/i.test(name)) {
                result.items.push({ name, qty: 1, unit: 'un', unitPrice: price, total: price });
            }
        }
    }

    return result;
}

function ItemRow({ item, index, onUpdate, onRemove }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 90px 32px', gap: '4px', padding: '6px 0', borderBottom: '1px solid var(--slate-100)', alignItems: 'center' }}>
            <input
                className="input"
                style={{ minHeight: 'unset', padding: '4px 8px', fontSize: '12px' }}
                value={item.name}
                onChange={e => onUpdate(index, 'name', e.target.value)}
                placeholder="Nome"
            />
            <input
                className="input"
                style={{ minHeight: 'unset', padding: '4px 6px', fontSize: '12px', textAlign: 'center' }}
                type="number"
                value={item.qty}
                onChange={e => onUpdate(index, 'qty', parseFloat(e.target.value) || 1)}
            />
            <input
                className="input"
                style={{ minHeight: 'unset', padding: '4px 6px', fontSize: '12px', textAlign: 'center' }}
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={e => onUpdate(index, 'unitPrice', parseFloat(e.target.value) || 0)}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-700)', textAlign: 'right' }}>
                {formatCurrency((item.qty || 1) * (item.unitPrice || 0))}
            </span>
            <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}>
                <Trash2 size={14} />
            </button>
        </div>
    );
}

function ImportNF() {
    const [tab, setTab] = useState('paste'); // 'paste' | 'manual' | 'qrcode'
    const [chaveInput, setChaveInput] = useState('');
    const [pasteText, setPasteText] = useState('');
    const [loading, setLoading] = useState(false);
    const [nfData, setNfData] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [error, setError] = useState('');
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [nfDate, setNfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paymentMethod, setPaymentMethod] = useState('va');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);
    const scannerInstanceRef = useRef(null);

    useEffect(() => {
        getAllStores().then(setStores);
        return () => stopScanner();
    }, []);

    const stopScanner = () => {
        if (scannerInstanceRef.current) {
            try { scannerInstanceRef.current.stop().catch(() => { }); } catch (_) { }
            scannerInstanceRef.current = null;
        }
        setScannerActive(false);
    };

    const handleParse = () => {
        if (!pasteText.trim()) { setError('Cole o texto da NF antes de analisar.'); return; }
        setError('');
        const parsed = parseNFText(pasteText);
        setNfData(parsed);
        setEditItems(parsed.items.map(i => ({ ...i })));
        if (parsed.date) setNfDate(parsed.date);
        if (parsed.storeName) {
            const found = stores.find(s => s.name.toLowerCase().includes(parsed.storeName.toLowerCase().split(' ')[0]));
            if (found) setSelectedStore(found.id.toString());
        }
        if (parsed.items.length === 0) setError('Não consegui identificar os itens. Você pode adicioná-los manualmente abaixo.');
    };

    const consultarNFe = async (chaveOverride, qrUrl) => {
        const chave = (chaveOverride || chaveInput).replace(/\s/g, '');
        if (chave.length !== 44) { setError('A chave deve ter 44 dígitos.'); return; }
        setLoading(true); setError(''); setNfData(null);
        try {
            const params = new URLSearchParams({ chave });
            if (qrUrl) params.append('qrurl', qrUrl);
            const res = await fetch(`/api/consulta-nfe?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao consultar.');
            setNfData(data);
            setEditItems(data.items.map(i => ({ ...i })));
            if (data.date) setNfDate(data.date);
            if (data.storeName) {
                const found = stores.find(s => s.name.toLowerCase().includes(data.storeName.toLowerCase().split(' ')[0]));
                if (found) setSelectedStore(found.id.toString());
            }
        } catch (err) {
            setError(err.message || 'Erro desconhecido.');
        } finally { setLoading(false); }
    };

    const startScanner = async () => {
        setError(''); setScannerActive(true);
        setTimeout(async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                const qr = new Html5Qrcode('qr-reader');
                scannerInstanceRef.current = qr;
                await qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        stopScanner();
                        const { chave, qrUrl } = parseQRContent(decodedText);
                        if (chave) { setChaveInput(formatChave(chave)); consultarNFe(chave, qrUrl); }
                        else setError('QR Code lido, mas não contém NF-e válida.');
                    },
                    () => { }
                );
            } catch (err) { setScannerActive(false); setError('Câmera não acessível: ' + err.message); }
        }, 200);
    };

    const updateItem = (idx, field, val) => {
        setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
    };
    const removeItem = (idx) => setEditItems(prev => prev.filter((_, i) => i !== idx));
    const addItem = () => setEditItems(prev => [...prev, { name: '', qty: 1, unit: 'un', unitPrice: 0, total: 0 }]);

    const totalCalculado = editItems.reduce((s, i) => s + ((i.qty || 1) * (i.unitPrice || 0)), 0);

    const handleSalvar = async () => {
        if (!selectedStore) { setError('Selecione o mercado.'); return; }
        const validItems = editItems.filter(i => i.name && i.unitPrice > 0);
        if (!validItems.length) { setError('Adicione pelo menos um item com preço.'); return; }
        setSaving(true); setError('');
        try {
            const items = validItems.map(item => ({
                productName: item.name, brand: '', category: 'Mercearia',
                weight: item.qty || 1, unit: item.unit || 'un',
                price: item.unitPrice, isPromotion: false
            }));
            await addPurchase(parseInt(selectedStore), nfDate, parseFloat(totalCalculado.toFixed(2)), items, paymentMethod);
            setSuccess(true);
        } catch (err) { setError('Erro ao salvar: ' + err.message); }
        finally { setSaving(false); }
    };

    if (success) {
        return (
            <div className="container" style={{ paddingTop: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-lg)' }}>
                <div style={{ background: 'var(--primary-100)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={40} color="var(--primary-600)" />
                </div>
                <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Compra Importada!</h2>
                <p style={{ color: 'var(--slate-600)' }}>{editItems.filter(i => i.name && i.unitPrice > 0).length} itens salvos com sucesso.</p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setSuccess(false); setNfData(null); setEditItems([]); setPasteText(''); setChaveInput(''); }}>
                    Importar Outra NF
                </button>
            </div>
        );
    }

    const TABS = [
        { id: 'paste', label: 'Colar NF', icon: ClipboardPaste },
        { id: 'qrcode', label: 'QR Code', icon: Camera },
        { id: 'manual', label: 'Chave', icon: FileText },
    ];

    const showForm = nfData !== null || editItems.length > 0;

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: '6rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--spacing-xs)' }}>Importar NF-e</h2>
            <p style={{ color: 'var(--slate-600)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>
                Cole o texto do cupom, escaneie o QR Code ou informe a chave
            </p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: 'var(--spacing-lg)', background: 'var(--slate-100)', borderRadius: 'var(--radius-lg)', padding: '4px' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); stopScanner(); setError(''); }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px 4px', background: tab === t.id ? 'white' : 'transparent', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--primary-700)' : 'var(--slate-600)', cursor: 'pointer', fontSize: '13px', boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Aba Colar Texto */}
            {tab === 'paste' && !showForm && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--primary-700)' }}>
                        <p style={{ fontWeight: 700, marginBottom: '4px' }}>Como funciona:</p>
                        <ol style={{ paddingLeft: '1.2rem', lineHeight: 1.8 }}>
                            <li>Abra o portal SEFAZ do seu estado no navegador</li>
                            <li>Consulte a NF-e com a chave de acesso</li>
                            <li>Selecione todo o texto da página (<strong>Ctrl+A</strong>)</li>
                            <li>Copie (<strong>Ctrl+C</strong>) e cole abaixo</li>
                        </ol>
                        <a href="https://nfce.fazenda.mg.gov.br/portalnfce/sistema/consultaExterna.xhtml" target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', color: 'var(--primary-600)', fontWeight: 700, textDecoration: 'none' }}>
                            <ExternalLink size={14} /> Abrir portal NFC-e MG
                        </a>
                    </div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                        Cole o texto da NF aqui:
                    </label>
                    <textarea
                        className="input"
                        rows={8}
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder="Cole aqui o texto copiado da página do SEFAZ..."
                        style={{ resize: 'vertical', fontSize: '13px' }}
                    />
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }} disabled={!pasteText.trim()} onClick={handleParse}>
                        <Search size={18} /> Analisar NF
                    </button>
                </div>
            )}

            {/* Aba QR Code */}
            {tab === 'qrcode' && !showForm && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                    {!scannerActive ? (
                        <>
                            <div style={{ width: 72, height: 72, background: 'var(--primary-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-md)' }}>
                                <Scan size={32} color="var(--primary-500)" />
                            </div>
                            <p style={{ color: 'var(--slate-600)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>
                                Aponte para o <strong>QR Code</strong> do cupom fiscal
                            </p>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={startScanner}>
                                <Camera size={20} /> Abrir Câmera
                            </button>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>Aponte para o QR Code...</p>
                            <div id="qr-reader" style={{ width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
                            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }} onClick={stopScanner}>
                                <X size={18} /> Cancelar
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Aba Chave Manual */}
            {tab === 'manual' && !showForm && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                        Chave de Acesso (44 dígitos)
                    </label>
                    <textarea className="input" placeholder="Cole os 44 dígitos da chave..." value={chaveInput}
                        onChange={e => setChaveInput(formatChave(e.target.value))} rows={3}
                        style={{ resize: 'none', fontFamily: 'monospace', letterSpacing: '2px', fontSize: '13px' }} />
                    <p style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px', marginBottom: 'var(--spacing-md)' }}>
                        {chaveInput.replace(/\s/g, '').length}/44 dígitos
                    </p>
                    <button className="btn btn-primary" style={{ width: '100%' }}
                        disabled={loading || chaveInput.replace(/\s/g, '').length !== 44} onClick={() => consultarNFe()}>
                        {loading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Consultando...</> : <><Search size={18} /> Consultar NF-e</>}
                    </button>
                </div>
            )}

            {error && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start', background: 'var(--accent-50)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                    <AlertCircle size={18} color="var(--accent-500)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-700)' }}>{error}</p>
                </div>
            )}

            {/* Formulário de revisão e edição */}
            {showForm && (
                <div className="fade-in">
                    {/* Botão voltar */}
                    <button onClick={() => { setNfData(null); setEditItems([]); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 700, cursor: 'pointer', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)', padding: 0 }}>
                        ← Voltar
                    </button>

                    {/* Info da NF */}
                    {nfData?.storeName && (
                        <div className="card" style={{ marginBottom: 'var(--spacing-md)', background: 'var(--primary-50)', border: '1px solid var(--primary-200)', padding: 'var(--spacing-md)' }}>
                            <p style={{ fontWeight: 800, color: 'var(--primary-700)' }}>{nfData.storeName}</p>
                        </div>
                    )}

                    {/* Data */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Data da Compra</label>
                        <input type="date" className="input" value={nfDate} onChange={e => setNfDate(e.target.value)} />
                    </div>

                    {/* Mercado */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Mercado</label>
                        <select className="select" value={selectedStore} onChange={e => setSelectedStore(e.target.value)}>
                            <option value="">-- Selecione --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* Pagamento */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                        {[{ id: 'va', label: '💳 Vale Alimentação' }, { id: 'personal', label: '💰 Dinheiro/Bolso' }].map(m => (
                            <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{ padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${paymentMethod === m.id ? 'var(--primary-500)' : 'var(--slate-200)'}`, background: paymentMethod === m.id ? 'var(--primary-50)' : 'white', fontWeight: paymentMethod === m.id ? 700 : 500, color: paymentMethod === m.id ? 'var(--primary-700)' : 'var(--slate-600)', fontSize: 'var(--font-size-sm)', transition: 'all 0.2s' }}>
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Itens editáveis */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                            <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Itens ({editItems.length})</h3>
                            <button onClick={addItem} style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer', color: 'var(--primary-700)', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Plus size={14} /> Adicionar
                            </button>
                        </div>

                        {/* Cabeçalho da tabela */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 90px 32px', gap: '4px', paddingBottom: '4px', borderBottom: '2px solid var(--slate-200)', marginBottom: '4px' }}>
                            {['Produto', 'Qtd', 'Preço', 'Total', ''].map((h, i) => (
                                <span key={i} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', textAlign: i > 1 ? 'center' : 'left' }}>{h}</span>
                            ))}
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {editItems.map((item, i) => (
                                <ItemRow key={i} item={item} index={i} onUpdate={updateItem} onRemove={removeItem} />
                            ))}
                            {editItems.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--slate-400)', padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>
                                    Nenhum item ainda. Clique em Adicionar.
                                </p>
                            )}
                        </div>

                        {/* Total calculado */}
                        <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Total Calculado</span>
                            <span style={{ color: 'white', fontWeight: 900, fontSize: 'var(--font-size-2xl)' }}>{formatCurrency(totalCalculado)}</span>
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', padding: 'var(--spacing-lg)' }} disabled={!selectedStore || saving || editItems.filter(i => i.name && i.unitPrice > 0).length === 0} onClick={handleSalvar}>
                        {saving ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Check size={20} /> Salvar Compra ({editItems.filter(i => i.name && i.unitPrice > 0).length} itens)</>}
                    </button>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default ImportNF;
