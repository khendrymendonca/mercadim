// Vercel Serverless Function - Consulta NFC-e SEFAZ
// Recebe a chave de acesso (44 dígitos) e retorna os dados estruturados da nota

const STATE_URLS = {
    '31': (ch) => `https://nfce.fazenda.mg.gov.br/portalnfce/sistema/consultaExterna.xhtml?chNFe=${ch}&tipoConsulta=completa`,
    '35': (ch) => `https://www.nfce.fazenda.sp.gov.br/NFCEConsultaPublica/Paginas/ConsultaPublicaNFCE.aspx?chNFe=${ch}`,
    '33': (ch) => `https://www.sefaz.rj.gov.br/servicos/nfce/consultaNFCe.faces?chNFe=${ch}`,
    '41': (ch) => `https://www.fazenda.pr.gov.br/nfce/consulta?chNFe=${ch}`,
    '43': (ch) => `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chaveNFe=${ch}`,
    '42': (ch) => `https://sat.sef.sc.gov.br/tax.NET/sat.consulta.nfce.aspx?chNFe=${ch}`,
    '29': (ch) => `https://nfe.sefaz.ba.gov.br/servicos/nfce/default.htm?chNFe=${ch}`,
    '23': (ch) => `https://nfce.sefaz.ce.gov.br/nfce/consulta?chNFe=${ch}`,
    '52': (ch) => `https://www.sefaz.go.gov.br/nfeweb/sites/nfce/danfce.aspx?chNFe=${ch}`,
    '53': (ch) => `https://dec.fazenda.df.gov.br/NFCE/consulta?chNFe=${ch}`,
    '15': (ch) => `https://www.sefa.pa.gov.br/nfce/consulta?chNFe=${ch}`,
    '21': (ch) => `https://www.sefaz.ma.gov.br/nfce/consulta?chNFe=${ch}`,
    '25': (ch) => `https://www.sefaz.pb.gov.br/nfce/consulta?chNFe=${ch}`,
    '26': (ch) => `https://nfce.sefaz.pe.gov.br/nfce/consulta?chNFe=${ch}`,
    '27': (ch) => `https://nfce.sefaz.al.gov.br/consultarNFCe.html?chNFe=${ch}`,
    '28': (ch) => `https://nfce.sefaz.se.gov.br/nfce/consulta?chNFe=${ch}`,
    '32': (ch) => `https://app.sefaz.es.gov.br/ConsultaNFCe/consulta.aspx?chNFe=${ch}`,
    '50': (ch) => `https://www.dfe.ms.gov.br/nfce/danfce.aspx?chNFe=${ch}`,
    '51': (ch) => `https://www.sefaz.mt.gov.br/nfce/consultaNFCe.jsf?chNFe=${ch}`,
};

// Parsers para extrair itens do HTML de cada estado
function parseHTML(html) {
    const result = {
        storeName: '',
        cnpj: '',
        date: '',
        total: 0,
        items: []
    };

    // === ESTRATÉGIA 1: Formato padrão MG / SP / RJ (tabela com classes padrão) ===
    const storeMatch = html.match(/class=["']?txtTit["']?[^>]*>([^<]+)<\/[^>]+>\s*<[^>]+>\s*<[^>]+>([^<]+)</i) ||
        html.match(/id=["']?u20["']?[^>]*>([^<]+)<\/span>/i) ||
        html.match(/<span[^>]*class=["']?NFCChamEmi["']?[^>]*>\s*([^<]+)/i) ||
        html.match(/<h4[^>]*>([^<]+)<\/h4>/) ||
        html.match(/NomeEmitente['"]\s*value=['"]([^'"]+)['"]/i);

    if (storeMatch) result.storeName = storeMatch[1].trim();

    // CNPJ
    const cnpjMatch = html.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/) ||
        html.match(/CNPJ[^>]*>([^<]+)<\//) ||
        html.match(/(\d{14})/);
    if (cnpjMatch) result.cnpj = cnpjMatch[0].replace(/\D/g, '');

    // Data
    const dateMatch = html.match(/(\d{2}\/\d{2}\/\d{4})/) ||
        html.match(/data[^>]*>([^<]*\d{2}\/\d{2}\/\d{4}[^<]*)</i);
    if (dateMatch) {
        const parts = dateMatch[1].match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (parts) result.date = `${parts[3]}-${parts[2]}-${parts[1]}`;
    }

    // Total
    const totalMatch = html.match(/Valor\s+Total\s+R\$\s*([\d.,]+)/i) ||
        html.match(/total[^>]*>\s*R?\$?\s*([\d]+[.,]\d{2})/i) ||
        html.match(/totalNota['"]\s*value=['"]([^'"]+)['"]/i);
    if (totalMatch) {
        result.total = parseFloat(totalMatch[1].replace('.', '').replace(',', '.')) || 0;
    }

    // === ESTRATÉGIA 2: Itens por linha de tabela ===
    // Tenta capturar blocos de item com nome + qtd + unitário + total
    const itemPatterns = [
        // Padrão MG (tabelas com classes)
        /<span[^>]*prodDescricao[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*prodQtde[^>]*>([\d.,]+)<\/span>[\s\S]*?<span[^>]*prodUn[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*prodVUnit[^>]*>([\d.,]+)<\/span>[\s\S]*?<span[^>]*prodVTotal[^>]*>([\d.,]+)<\/span>/gi,
        // Variante com class alternativas
        /<td[^>]*class=["'][^"']*descricao[^"']*["'][^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([\d.,]+)\s*<\/td>[\s\S]*?<td[^>]*>([A-Z]+)\s*<\/td>[\s\S]*?<td[^>]*>([\d.,]+)\s*<\/td>[\s\S]*?<td[^>]*>([\d.,]+)\s*<\/td>/gi,
        // Padrão SP
        /<span[^>]*id=["'][^"']*NomeAutorizado[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    ];

    for (const pattern of itemPatterns) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(html)) !== null) {
            const rawName = match[1].trim();
            const qty = parseFloat((match[2] || '1').replace(',', '.')) || 1;
            const unit = (match[3] || 'un').trim();
            const unitPrice = parseFloat((match[4] || '0').replace('.', '').replace(',', '.')) || 0;
            const totalItem = parseFloat((match[5] || '0').replace('.', '').replace(',', '.')) || (qty * unitPrice);

            if (rawName && rawName.length > 1) {
                result.items.push({
                    name: rawName,
                    qty,
                    unit: unit.toLowerCase(),
                    unitPrice: unitPrice || (totalItem / qty),
                    total: totalItem
                });
            }
        }
        if (result.items.length > 0) break;
    }

    // === ESTRATÉGIA 3: Extração genérica de preços ===
    if (result.items.length === 0) {
        // Tenta extrair pares nome-preço de qualquer estrutura de tabela
        const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        for (const row of rows) {
            const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
                .map(c => c.replace(/<[^>]+>/g, '').trim())
                .filter(c => c.length > 0);

            if (cells.length >= 2) {
                const priceCell = cells.find(c => /R\$\s*[\d.,]+|^\d+[.,]\d{2}$/.test(c));
                const nameCell = cells[0];
                if (priceCell && nameCell && nameCell.length > 2 && isNaN(nameCell.replace(',', '.'))) {
                    const price = parseFloat(priceCell.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
                    if (price > 0) {
                        result.items.push({
                            name: nameCell,
                            qty: 1,
                            unit: 'un',
                            unitPrice: price,
                            total: price
                        });
                    }
                }
            }
        }
    }

    return result;
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { chave } = req.query;

    if (!chave || chave.replace(/\s/g, '').length !== 44) {
        return res.status(400).json({ error: 'Chave de acesso inválida. Deve ter 44 dígitos.' });
    }

    const chaveClean = chave.replace(/\s/g, '');
    const cUF = chaveClean.substring(0, 2);
    const getUrl = STATE_URLS[cUF];

    if (!getUrl) {
        return res.status(422).json({
            error: `Estado com código IBGE ${cUF} não suportado ainda.`,
            cUF
        });
    }

    const url = getUrl(chaveClean);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Cache-Control': 'no-cache',
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            return res.status(502).json({
                error: `Portal SEFAZ retornou status ${response.status}. Tente novamente em instantes.`,
                url
            });
        }

        const html = await response.text();
        const data = parseHTML(html);

        // Adiciona metadados úteis
        data.chave = chaveClean;
        data.cUF = cUF;
        data.urlConsultada = url;
        data.parseSuccess = data.items.length > 0;

        return res.status(200).json(data);

    } catch (err) {
        const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
        return res.status(502).json({
            error: isTimeout
                ? 'Portal SEFAZ demorou muito para responder. Tente novamente.'
                : `Erro ao consultar SEFAZ: ${err.message}`,
            url
        });
    }
}
