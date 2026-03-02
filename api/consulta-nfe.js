// Vercel Serverless Function - Consulta NFC-e SEFAZ
// Região: gru1 (São Paulo) - configurado em vercel.json

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
};

// URLs de consulta por estado (cUF IBGE)
const STATE_CONFIG = {
    '31': {
        name: 'MG', urls: [
            (ch) => `https://nfce.fazenda.mg.gov.br/portalnfce/sistema/consultaExterna.xhtml?chNFe=${ch}&tipoConsulta=completa`,
        ]
    },
    '35': {
        name: 'SP', urls: [
            (ch) => `https://www.nfce.fazenda.sp.gov.br/NFCEConsultaPublica/Paginas/ConsultaPublicaNFCE.aspx?chNFe=${ch}`,
        ]
    },
    '33': {
        name: 'RJ', urls: [
            (ch) => `https://www.sefaz.rj.gov.br/servicos/nfce/consultaNFCe.faces?chNFe=${ch}`,
        ]
    },
    '41': {
        name: 'PR', urls: [
            (ch) => `https://www.fazenda.pr.gov.br/nfce/consulta?chNFe=${ch}`,
        ]
    },
    '43': {
        name: 'RS', urls: [
            (ch) => `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chaveNFe=${ch}`,
        ]
    },
    '42': {
        name: 'SC', urls: [
            (ch) => `https://sat.sef.sc.gov.br/tax.NET/sat.consulta.nfce.aspx?chNFe=${ch}`,
        ]
    },
    '29': {
        name: 'BA', urls: [
            (ch) => `https://nfe.sefaz.ba.gov.br/servicos/nfce/default.htm?chNFe=${ch}`,
        ]
    },
    '23': {
        name: 'CE', urls: [
            (ch) => `https://nfce.sefaz.ce.gov.br/nfce/consulta?chNFe=${ch}`,
        ]
    },
    '52': {
        name: 'GO', urls: [
            (ch) => `https://www.sefaz.go.gov.br/nfeweb/sites/nfce/danfce.aspx?chNFe=${ch}`,
        ]
    },
    '53': {
        name: 'DF', urls: [
            (ch) => `https://dec.fazenda.df.gov.br/NFCE/consulta?chNFe=${ch}`,
        ]
    },
    '32': {
        name: 'ES', urls: [
            (ch) => `https://app.sefaz.es.gov.br/ConsultaNFCe/consulta.aspx?chNFe=${ch}`,
        ]
    },
    '50': {
        name: 'MS', urls: [
            (ch) => `https://www.dfe.ms.gov.br/nfce/danfce.aspx?chNFe=${ch}`,
        ]
    },
    '51': {
        name: 'MT', urls: [
            (ch) => `https://www.sefaz.mt.gov.br/nfce/consultaNFCe.jsf?chNFe=${ch}`,
        ]
    },
};

// Fetch com timeout compatível com Node 16+
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// Estratégia de fetch: GET, depois GET com referrer, depois POST
async function fetchSefaz(url) {
    const configs = [
        { method: 'GET', extra: {} },
        { method: 'GET', extra: { headers: { ...HEADERS, 'Referer': new URL(url).origin + '/' } } },
        {
            method: 'POST', extra: {
                headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `javax.faces.partial.ajax=false&javax.faces.partial.execute=%40all`
            }
        },
    ];

    let lastError;
    for (const { method, extra } of configs) {
        try {
            const res = await fetchWithTimeout(url, { method, headers: HEADERS, redirect: 'follow', ...extra }, 12000);
            if (res.ok) return res;
            lastError = new Error(`HTTP ${res.status}`);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError;
}

// Parser HTML: extrai dados da NFC-e independente de estado
function parseNFCeHTML(html) {
    const result = { storeName: '', cnpj: '', date: '', total: 0, items: [] };

    // Remove scripts e estilos para limpar o HTML
    const clean = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

    // Nome da loja
    const storePatterns = [
        /class=["'][^"']*(?:txtTit|nomeEmitente|razaoSocial|NomeAutorizado|empresa)[^"']*["'][^>]*>([^<]+)/i,
        /<h4[^>]*>([^<]{3,80})<\/h4>/i,
        /<h3[^>]*>([^<]{3,80})<\/h3>/i,
        /Razão Social[:\s]*<[^>]*>([^<]+)/i,
    ];
    for (const p of storePatterns) {
        const m = clean.match(p);
        if (m?.[1]?.trim().length > 2) { result.storeName = m[1].trim(); break; }
    }

    // CNPJ
    const cnpjM = clean.match(/\d{2}[\. ]?\d{3}[\. ]?\d{3}[\/\. ]?\d{4}[-. ]?\d{2}/);
    if (cnpjM) result.cnpj = cnpjM[0].replace(/\D/g, '');

    // Data (DD/MM/YYYY)
    const dateM = clean.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateM) result.date = `${dateM[3]}-${dateM[2]}-${dateM[1]}`;

    // Total
    const totalPatterns = [
        /(?:Total\s+R\$|Valor\s+Total)[^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
        /totalNota[^>]* value=["']([\d.,]+)/i,
        /class=["'][^"']*totalNF[^"']*["'][^>]*>[\s\S]*?R?\$?\s*([\d,\.]+)/i,
    ];
    for (const p of totalPatterns) {
        const m = clean.match(p);
        if (m) {
            const raw = m[1].replace(/\./g, '').replace(',', '.');
            result.total = parseFloat(raw) || 0;
            if (result.total > 0) break;
        }
    }

    // Itens - Estratégia 1: classes padrão NFC-e
    const itemRegexes = [
        /<span[^>]*prodDescricao[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*prodQtde[^>]*>([\d,.]+)<\/span>[\s\S]*?<span[^>]*prodUn[^>]*>([A-Za-z]+)<\/span>[\s\S]*?<span[^>]*prodVUnit[^>]*>([\d,.]+)<\/span>[\s\S]*?<span[^>]*prodVTotal[^>]*>([\d,.]+)<\/span>/gi,
        /<td[^>]*class=["'][^"']*(?:descricao|produto|nome)[^"']*["'][^>]*>([\s\S]*?)<\/td>[\s\S]{0,300}?<td[^>]*>([\d,.]+)\s*<\/td>[\s\S]{0,100}?<td[^>]*>([A-Z]{1,5})\s*<\/td>[\s\S]{0,100}?<td[^>]*>([\d,.]+)\s*<\/td>[\s\S]{0,100}?<td[^>]*>([\d,.]+)\s*<\/td>/gi,
    ];

    for (const regex of itemRegexes) {
        regex.lastIndex = 0;
        let m;
        while ((m = regex.exec(clean)) !== null) {
            const name = m[1].replace(/<[^>]+>/g, '').trim();
            if (!name || name.length < 2) continue;
            const qty = parseFloat(m[2].replace(',', '.')) || 1;
            const unit = (m[3] || 'UN').trim().toLowerCase();
            const unitPrice = parseFloat(m[4].replace('.', '').replace(',', '.')) || 0;
            const total = parseFloat(m[5].replace('.', '').replace(',', '.')) || qty * unitPrice;
            result.items.push({ name, qty, unit, unitPrice, total });
        }
        if (result.items.length > 0) break;
    }

    // Itens - Estratégia 2: extrair de linhas de tabela genéricas
    if (result.items.length === 0) {
        const trBlocks = clean.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        for (const row of trBlocks) {
            const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
                .map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
                .filter(Boolean);

            if (cells.length < 3) continue;
            const name = cells[0];
            if (!name || name.length < 2 || /total|data|cnpj|cpf|data|emiss/i.test(name)) continue;

            const priceCell = cells.slice(1).find(c => /^[\d]+[.,]\d{2}$/.test(c.replace(/\s/g, '')));
            if (!priceCell) continue;

            const price = parseFloat(priceCell.replace('.', '').replace(',', '.'));
            if (price > 0 && price < 10000) {
                result.items.push({ name, qty: 1, unit: 'un', unitPrice: price, total: price });
            }
        }
    }

    return result;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const chave = (req.query.chave || '').replace(/\s/g, '');

    if (chave.length !== 44 || !/^\d{44}$/.test(chave)) {
        return res.status(400).json({ error: 'Chave de acesso inválida. Deve conter exatamente 44 dígitos numéricos.' });
    }

    const cUF = chave.substring(0, 2);
    const stateConfig = STATE_CONFIG[cUF];

    if (!stateConfig) {
        return res.status(422).json({ error: `Estado com código IBGE "${cUF}" ainda não suportado. Por favor entre em contato para adicionar.` });
    }

    let lastError = null;
    for (const buildUrl of stateConfig.urls) {
        const url = buildUrl(chave);
        try {
            const response = await fetchSefaz(url);
            const html = await response.text();

            if (html.length < 500) {
                lastError = new Error('Portal retornou resposta vazia ou muito curta.');
                continue;
            }

            const data = parseNFCeHTML(html);
            data.chave = chave;
            data.estado = stateConfig.name;
            data.parseSuccess = data.items.length > 0;

            return res.status(200).json(data);
        } catch (e) {
            lastError = e;
        }
    }

    const isTimeout = lastError?.name === 'AbortError';
    return res.status(502).json({
        error: isTimeout
            ? 'O portal do SEFAZ demorou demais para responder. Tente novamente em instantes.'
            : `Não foi possível conectar ao SEFAZ-${stateConfig.name}. ${lastError?.message || ''}`.trim()
    });
}
