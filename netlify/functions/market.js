const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200"
};

const json = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body)
});

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "Vertice/1.0 Market Snapshot" }
  });
  if (!response.ok) throw new Error(`Fonte indisponivel: ${response.status}`);
  return response.json();
};

const pad = (value) => String(value).padStart(2, "0");

const toPtaxDate = (date) => `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()}`;

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

async function latestPtax(currency) {
  const endpoint = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)";
  const url = `${endpoint}?@moeda='${currency}'&@dataInicial='${toPtaxDate(daysAgo(12))}'&@dataFinalCotacao='${toPtaxDate(new Date())}'&$top=100&$format=json`;
  const data = await fetchJson(url);
  const rows = Array.isArray(data?.value) ? data.value : [];
  const rowsWithValue = rows
    .filter((row) => Number.isFinite(Number(row.cotacaoVenda || row.cotacaoCompra)))
    .sort((a, b) => new Date(a.dataHoraCotacao) - new Date(b.dataHoraCotacao));
  const closingRows = rowsWithValue.filter((row) => String(row.tipoBoletim || "").toLowerCase().includes("fechamento"));
  const row = closingRows.at(-1) || rowsWithValue.at(-1);
  if (!row) throw new Error(`PTAX sem valor para ${currency}`);

  const sell = Number(row.cotacaoVenda || row.cotacaoCompra);
  const buy = Number(row.cotacaoCompra || sell);
  return {
    brl: sell,
    buy,
    sell,
    pct: 0,
    date: row.dataHoraCotacao,
    daily: true
  };
}

async function currencies() {
  const [usd, eur] = await Promise.all([latestPtax("USD"), latestPtax("EUR")]);
  return { source: "Banco Central PTAX", usd, eur };
}

async function yahooChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const data = await fetchJson(url);
  const meta = data?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  const previous = Number(meta?.previousClose || price);
  if (!Number.isFinite(price)) throw new Error(`Sem cotacao para ${symbol}`);
  return {
    symbol,
    raw: price,
    pct: previous ? ((price - previous) / previous) * 100 : 0,
    previous
  };
}

exports.handler = async () => {
  const payload = {
    timestamp: new Date().toISOString(),
    sources: {
      currencies: "Banco Central PTAX",
      commodities: "Yahoo Finance/CBOT",
      equities: "Yahoo Finance/B3"
    },
    currencies: {},
    commodities: {},
    equities: {},
    quality: "ok",
    errors: []
  };

  try {
    const fx = await currencies();
    payload.sources.currencies = fx.source;
    payload.currencies.usd = fx.usd;
    payload.currencies.eur = fx.eur;
    if (fx.note) payload.errors.push({ source: "PTAX", message: fx.note });
  } catch (error) {
    payload.quality = "partial";
    payload.errors.push({ source: "cambio", message: error.message });
  }

  const usd = Number(payload.currencies.usd?.brl);
  await Promise.all([
    ["soja", "ZS=F"],
    ["milho", "ZC=F"]
  ].map(async ([key, symbol]) => {
    try {
      const item = await yahooChart(symbol);
      const brlPerBushel = Number.isFinite(usd) ? (item.raw * usd) / 100 : null;
      payload.commodities[key] = {
        ...item,
        brlPerBag: brlPerBushel ? brlPerBushel * (60 / 27.2) : null
      };
    } catch (error) {
      payload.quality = "partial";
      payload.errors.push({ source: symbol, message: error.message });
    }
  }));

  try {
    const ibov = await yahooChart("^BVSP");
    payload.equities.ibov = { symbol: "^BVSP", price: ibov.raw, pct: ibov.pct };
  } catch (error) {
    payload.quality = "partial";
    payload.errors.push({ source: "IBOV", message: error.message });
  }

  return json(200, payload);
};
