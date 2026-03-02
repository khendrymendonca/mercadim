// Edge Runtime - roda na rede Cloudflare (POPs no Brasil)
// Muito mais provável de bypasear bloqueio do SEFAZ que servidores AWS/Vercel

export const config = { runtime: 'edge' };

const STATE_CONFIG = {
    '31': { name: 'MG', url: (ch) => `https://nfce.fazenda.mg.gov.br/portalnfce/sistema/consultaExterna.xhtml?chNFe=${ch}&tipoConsulta=completa` },
    '35': { name: 'SP', url: (ch) => `https://www.nfce.fazenda.sp.gov.br/NFCEConsultaPublica/Paginas/ConsultaPublicaNFCE.aspx?chNFe=${ch}` },
    '33': { name: 'RJ', url: (ch) => `https://www.sefaz.rj.gov.br/servicos/nfce/consultaNFCe.faces?chNFe=${ch}` },
    '41': { name: 'PR', url: (ch) => `https://www.fazenda.pr.gov.br/nfce/consulta?chNFe=${ch}` },
    '43': { name: 'RS', url: (ch) => `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chaveNFe=${ch}` },
    '42': { name: 'SC', url: (ch) => `https://sat.sef.sc.gov.br/tax.NET/sat.consulta.nfce.aspx?chNFe=${ch}` },
    '29': { name: 'BA', url: (ch) => `https://nfe.sefaz.ba.gov.br/servicos/nfce/default.htm?chNFe=${ch}` },
    '23': { name: 'CE', url: (ch) => `https://nfce.sefaz.ce.gov.br/nfce/consulta?chNFe=${ch}` },
    '52': { name: 'GO', url: (ch) => `https://www.sefaz.go.gov.br/nfeweb/sites/nfce/danfce.aspx?chNFe=${ch}` },
    '53': { name: 'DF', url: (ch) => `https://dec.fazenda.df.gov.br/NFCE/consulta?chNFe=${ch}` },
    '32': { name: 'ES', url: (ch) => `https://app.sefaz.es.gov.br/ConsultaNFCe/consulta.aspx?chNFe=${ch}` },
    '50': { name: 'MS', url: (ch) => `https://www.dfe.ms.gov.br/nfce/danfce.aspx?chNFe=${ch}` },
    '51': { name: 'MT', url: (ch) => `https://www.sefaz.mt.gov.br/nfce/consultaNFCe.jsf?chNFe=${ch}` },
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.5',
    'Cache-Control': 'no-cache',
};

function parseNFCeHTML(html) {
    const result = { storeName: '', cnpj: '', date: '', total: 0, items: [] };
    const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

    // Nome da loja
    const storeM = clean.match(/class=["'][^"']*(?:txtTit|nomeEmitente|razaoSocial|NFCChamEmi)[^"']*["'][^>]*>([^<]+)/i)
        || clean.match(/<h4[^>]*>([^<]{3,80})<\/h4>/i);
    if (storeM) result.storeName = storeM[1].trim();

    // CNPJ
    const cnpjM = clean.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    if (cnpjM) result.cnpj = cnpjM[0].replace(/\D/g, '');

    // Data
    const dateM = clean.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateM) result.date = `${dateM[3]}-${dateM[2]}-${dateM[1]}`;

    // Total
    const totalM = clean.match(/(?:Total\s+R\$|Valor\s+Total)[^\d]*([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})/i);
    if (totalM) result.total = parseFloat(totalM[1].replace('.', '').replace(',', '.')) || 0;

    // Itens (padrão NFC-e)
    const itemRe = /<span[^>]*prodDescricao[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*prodQtde[^>]*>([\d,.]+)<\/span>[\s\S]*?<span[^>]*prodUn[^>]*>([A-Za-z]+)<\/span>[\s\S]*?<span[^>]*prodVUnit[^>]*>([\d,.]+)<\/span>[\s\S]*?<span[^>]*prodVTotal[^>]*>([\d,.]+)<\/span>/gi;
    let m;
    while ((m = itemRe.exec(clean)) !== null) {
        const name = m[1].replace(/<[^>]+>/g, '').trim();
        if (!name) continue;
        const qty = parseFloat(m[2].replace(',', '.')) || 1;
        const unit = m[3].trim().toLowerCase();
        const unitPrice = parseFloat(m[4].replace('.', '').replace(',', '.')) || 0;
        const total = parseFloat(m[5].replace('.', '').replace(',', '.')) || qty * unitPrice;
        result.items.push({ name, qty, unit, unitPrice, total });
    }

    // Fallback: extrair de tabelas genéricas
    if (result.items.length === 0) {
        const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        while ((m = trRe.exec(clean)) !== null) {
            const cells = (m[1].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
                .map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
                .filter(Boolean);
            if (cells.length < 3) continue;
            const name = cells[0];
            if (!name || name.length < 2 || /total|data|cnpj|emiss/i.test(name)) continue;
            const priceRaw = cells.slice(1).find(c => /^\d+[.,]\d{2}$/.test(c.trim()));
            if (!priceRaw) continue;
            const price = parseFloat(priceRaw.replace(',', '.'));
            if (price > 0 && price < 10000) {
                result.items.push({ name, qty: 1, unit: 'un', unitPrice: price, total: price });
            }
        }
    }

    return result;
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

export default async function handler(request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
    }

    const { searchParams } = new URL(request.url);
    const chave = (searchParams.get('chave') || '').replace(/\s/g, '');
    // Suporte a URL completa do QR Code (com hash)
    const qrUrl = searchParams.get('qrurl');

    if (qrUrl) {
        // Usa a URL exata do QR Code (mais provável de funcionar)
        try {
            const res = await fetch(decodeURIComponent(qrUrl), { headers: HEADERS });
            if (res.ok) {
                const html = await res.text();
                const data = parseNFCeHTML(html);
                data.parseSuccess = data.items.length > 0;
                return jsonResponse(data);
            }
        } catch (e) {
            // cai para chave pura abaixo
        }
    }

    if (!chave || chave.length !== 44 || !/^\d{44}$/.test(chave)) {
        return jsonResponse({ error: 'Chave de acesso inválida. Deve ter 44 dígitos numéricos.' }, 400);
    }

    const cUF = chave.substring(0, 2);
    const stateConf = STATE_CONFIG[cUF];
    if (!stateConf) {
        return jsonResponse({ error: `Estado com código IBGE "${cUF}" ainda não suportado.` }, 422);
    }

    const sefazUrl = stateConf.url(chave);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 14000);
        let res;
        try {
            res = await fetch(sefazUrl, { headers: HEADERS, redirect: 'follow', signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }

        if (!res.ok) {
            return jsonResponse({ error: `Portal SEFAZ-${stateConf.name} retornou status ${res.status}. Tente o QR Code diretamente.`, estado: stateConf.name, sefazUrl }, 502);
        }

        const html = await res.text();
        if (html.length < 500) {
            return jsonResponse({ error: 'Portal SEFAZ retornou resposta muito curta. Pode ter CAPTCHA ou bloqueio de IP.', estado: stateConf.name, sefazUrl }, 502);
        }

        const data = parseNFCeHTML(html);
        data.chave = chave;
        data.estado = stateConf.name;
        data.parseSuccess = data.items.length > 0;
        return jsonResponse(data);

    } catch (e) {
        const isAbort = e.name === 'AbortError';
        return jsonResponse({
            error: isAbort ? 'Portal SEFAZ demorou demais. Tente escanear o QR Code.' : `Erro ao consultar SEFAZ-${stateConf.name}: ${e.message}`,
            estado: stateConf.name,
            sefazUrl
        }, 502);
    }
}
