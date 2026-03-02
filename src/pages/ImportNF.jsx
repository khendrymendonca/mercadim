import React, { useState, useEffect, useRef } from 'react';
import { FileText, Scan, Search, Check, X, AlertCircle, ChevronRight, Store, Loader, Camera } from 'lucide-react';
import { addPurchase, getAllStores, addStore } from '../db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';

// Extrai a chave de acesso de uma URL de QR Code de NFC-e
function extractChaveFromUrl(text) {
    // QR Code NFC-e: ...?p=CHAVE44|...|...|...
    const paramMatch = text.match(/[?&]p=([0-9]{44})/);
    if (paramMatch) return paramMatch[1];
    // QR Code direto com chave como valor
    const chaveMatch = text.match(/\b([0-9]{44})\b/);
    if (chaveMatch) return chaveMatch[1];
    return null;
}

// Formata a chave para exibição: blocos de 4 dígitos
function formatChave(value) {
    const digits = value.replace(/\D/g, '').substring(0, 44);
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
}

function ImportNF() {
    const [tab, setTab] = useState('manual'); // 'manual' | 'qrcode'
    const [chaveInput, setChaveInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [nfData, setNfData] = useState(null);
    const [error, setError] = useState('');
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('va');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);
    const scannerRef = useRef(null);
    const scannerInstanceRef = useRef(null);

    useEffect(() => {
        getAllStores().then(setStores);
        return () => stopScanner();
    }, []);

    const stopScanner = () => {
        if (scannerInstanceRef.current) {
            try {
                scannerInstanceRef.current.stop().catch(() => { });
            } catch (_) { }
            scannerInstanceRef.current = null;
        }
        setScannerActive(false);
    };

    const startScanner = async () => {
        setError('');
        setScannerActive(true);

        // Aguarda o DOM renderizar o elemento alvo
        setTimeout(async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                const qr = new Html5Qrcode('qr-reader');
                scannerInstanceRef.current = qr;

                await qr.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        stopScanner();
                        const chave = extractChaveFromUrl(decodedText);
                        if (chave) {
                            setChaveInput(formatChave(chave));
                            consultarNFe(chave);
                        } else {
                            setError('QR Code lido, mas não contém uma chave NF-e válida.');
                        }
                    },
                    () => { } // ignora frames sem QR
                );
            } catch (err) {
                setScannerActive(false);
                setError('Não foi possível acessar a câmera: ' + err.message);
            }
        }, 200);
    };

    const consultarNFe = async (chaveOverride) => {
        const chave = (chaveOverride || chaveInput).replace(/\s/g, '');
        if (chave.length !== 44) {
            setError('A chave de acesso deve ter exatamente 44 dígitos.');
            return;
        }

        setLoading(true);
        setError('');
        setNfData(null);

        try {
            const res = await fetch(`/api/consulta-nfe?chave=${chave}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao consultar o SEFAZ.');
            }

            setNfData(data);

            // Tenta encontrar o mercado pelo nome na NF
            if (data.storeName) {
                const found = stores.find(s =>
                    s.name.toLowerCase().includes(data.storeName.toLowerCase().split(' ')[0])
                );
                if (found) setSelectedStore(found.id.toString());
            }
        } catch (err) {
            setError(err.message || 'Erro desconhecido. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    const handleSalvar = async () => {
        if (!selectedStore) {
            setError('Selecione ou cadastre o mercado antes de salvar.');
            return;
        }
        if (!nfData?.items?.length) {
            setError('Nenhum item encontrado na NF para salvar.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const items = nfData.items.map(item => ({
                productName: item.name,
                brand: '',
                category: 'Mercearia',
                weight: item.qty || 1,
                unit: item.unit || 'un',
                price: item.unitPrice || (item.total / (item.qty || 1)),
                isPromotion: false
            }));

            const date = nfData.date || format(new Date(), 'yyyy-MM-dd');
            const total = nfData.total || items.reduce((s, i) => s + (i.price * i.weight), 0);

            await addPurchase(parseInt(selectedStore), date, parseFloat(total.toFixed(2)), items, paymentMethod);
            setSuccess(true);
        } catch (err) {
            setError('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (success) {
        return (
            <div className="container" style={{ paddingTop: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-lg)' }}>
                <div style={{ background: 'var(--primary-100)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={40} color="var(--primary-600)" />
                </div>
                <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Compra Importada!</h2>
                <p style={{ color: 'var(--slate-600)' }}>
                    {nfData?.items?.length} itens salvos com sucesso a partir da NF-e.
                </p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                    setSuccess(false);
                    setNfData(null);
                    setChaveInput('');
                }}>
                    Importar Outra NF
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--spacing-xs)' }}>
                Importar NF-e
            </h2>
            <p style={{ color: 'var(--slate-600)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>
                Cole a chave do cupom ou escaneie o QR Code
            </p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', background: 'var(--slate-100)', borderRadius: 'var(--radius-lg)', padding: '4px' }}>
                {[{ id: 'manual', label: 'Digitar Chave', icon: FileText }, { id: 'qrcode', label: 'Ler QR Code', icon: Camera }].map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setTab(t.id); stopScanner(); setError(''); }}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            background: tab === t.id ? 'white' : 'transparent',
                            border: 'none', borderRadius: 'var(--radius-md)',
                            fontWeight: tab === t.id ? 700 : 500,
                            color: tab === t.id ? 'var(--primary-700)' : 'var(--slate-600)',
                            cursor: 'pointer', fontSize: 'var(--font-size-sm)',
                            boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Aba Manual */}
            {tab === 'manual' && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                        Chave de Acesso (44 dígitos)
                    </label>
                    <textarea
                        className="input"
                        placeholder="Ex: 3125 1217 7456 1300 4814 6501 5000 3430 5319 7553 8287"
                        value={chaveInput}
                        onChange={(e) => setChaveInput(formatChave(e.target.value))}
                        rows={3}
                        style={{ resize: 'none', fontFamily: 'monospace', letterSpacing: '2px', fontSize: '14px' }}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px', marginBottom: 'var(--spacing-md)' }}>
                        {chaveInput.replace(/\s/g, '').length}/44 dígitos
                    </p>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading || chaveInput.replace(/\s/g, '').length !== 44}
                        onClick={() => consultarNFe()}
                    >
                        {loading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Consultando SEFAZ...</> : <><Search size={18} /> Consultar NF-e</>}
                    </button>
                </div>
            )}

            {/* Aba QR Code */}
            {tab === 'qrcode' && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                    {!scannerActive ? (
                        <>
                            <div style={{ width: 80, height: 80, background: 'var(--primary-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-md)' }}>
                                <Scan size={36} color="var(--primary-500)" />
                            </div>
                            <p style={{ color: 'var(--slate-600)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>
                                Aponte a câmera para o <strong>QR Code</strong> do cupom fiscal
                            </p>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={startScanner}>
                                <Camera size={20} /> Abrir Câmera
                            </button>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>
                                Aponte para o QR Code do cupom...
                            </p>
                            <div id="qr-reader" style={{ width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} ref={scannerRef} />
                            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }} onClick={stopScanner}>
                                <X size={18} /> Cancelar
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--slate-600)' }}>
                    <Loader size={36} color="var(--primary-500)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto var(--spacing-md)', display: 'block' }} />
                    <p style={{ fontWeight: 600 }}>Consultando o portal do SEFAZ...</p>
                    <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.7 }}>Isso pode levar alguns segundos</p>
                </div>
            )}

            {/* Erro */}
            {error && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start', background: 'var(--accent-50)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                    <AlertCircle size={20} color="var(--accent-500)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <p style={{ fontWeight: 700, color: 'var(--accent-500)', marginBottom: '4px' }}>Não foi possível consultar</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-700)' }}>{error}</p>
                    </div>
                </div>
            )}

            {/* Resultado da NF */}
            {nfData && !loading && (
                <div className="fade-in">
                    {/* Cabeçalho da NF */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-md)', background: 'var(--primary-50)', border: '2px solid var(--primary-200)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <Store size={20} color="var(--primary-600)" />
                                <div>
                                    <p style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', color: 'var(--primary-700)' }}>
                                        {nfData.storeName || 'Mercado'}
                                    </p>
                                    {nfData.cnpj && (
                                        <p style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                                            CNPJ: {nfData.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>Total</p>
                                <p style={{ fontWeight: 900, fontSize: 'var(--font-size-2xl)', color: 'var(--primary-700)' }}>
                                    {formatCurrency(nfData.total)}
                                </p>
                            </div>
                        </div>

                        {!nfData.parseSuccess && (
                            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: '#854d0e' }}>
                                ⚠️ O portal do SEFAZ foi consultado mas os itens não puderam ser extraídos automaticamente. Verifique os dados antes de salvar.
                            </div>
                        )}
                    </div>

                    {/* Lista de itens */}
                    {nfData.items.length > 0 && (
                        <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 0 }}>
                            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--slate-100)' }}>
                                <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                                    {nfData.items.length} Itens na Nota
                                </h3>
                            </div>
                            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                {nfData.items.map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        borderBottom: i < nfData.items.length - 1 ? '1px solid var(--slate-100)' : 'none'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{item.name}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                                                {item.qty} {item.unit} × {formatCurrency(item.unitPrice)}
                                            </p>
                                        </div>
                                        <span style={{ fontWeight: 800, color: 'var(--primary-700)', fontSize: 'var(--font-size-sm)' }}>
                                            {formatCurrency(item.total)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seleção de mercado e pagamento */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                Mercado no Cadastro
                            </label>
                            <select
                                className="select"
                                value={selectedStore}
                                onChange={(e) => setSelectedStore(e.target.value)}
                            >
                                <option value="">-- Selecione o mercado --</option>
                                {stores.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {nfData.storeName && !selectedStore && (
                                <p style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '4px' }}>
                                    Nome na NF: <strong>{nfData.storeName}</strong>
                                </p>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                Forma de Pagamento
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                {[{ id: 'va', label: '💳 Vale Alimentação' }, { id: 'personal', label: '💰 Dinheiro / Bolso' }].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setPaymentMethod(m.id)}
                                        style={{
                                            padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            border: `2px solid ${paymentMethod === m.id ? 'var(--primary-500)' : 'var(--slate-200)'}`,
                                            background: paymentMethod === m.id ? 'var(--primary-50)' : 'white',
                                            fontWeight: paymentMethod === m.id ? 700 : 500,
                                            color: paymentMethod === m.id ? 'var(--primary-700)' : 'var(--slate-600)',
                                            fontSize: 'var(--font-size-sm)', transition: 'all 0.2s'
                                        }}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: 'var(--spacing-lg)' }}
                        disabled={!selectedStore || saving}
                        onClick={handleSalvar}
                    >
                        {saving
                            ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                            : <><Check size={20} /> Importar e Salvar Compra</>
                        }
                    </button>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default ImportNF;
