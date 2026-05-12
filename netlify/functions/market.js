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
    daily: true,
    source: "Banco Central PTAX"
  };
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

async function yahooFx(symbol, range) {
  const item = await yahooChart(symbol);
  if (!inRange(item.raw, range[0], range[1])) throw new Error(`Yahoo fora da faixa esperada para ${symbol}`);
  return {
    brl: item.raw,
    pct: item.pct || 0,
    date: new Date().toISOString(),
    daily: false,
    source: "Yahoo Finance"
  };
}

async function frankfurterFx(currency, range) {
  const data = await fetchJson(`https://api.frankfurter.app/latest?from=${currency}&to=BRL`);
  const value = Number(data?.rates?.BRL);
  if (!inRange(value, range[0], range[1])) throw new Error(`Frankfurter fora da faixa esperada para ${currency}`);
  return {
    brl: value,
    pct: 0,
    date: data?.date || new Date().toISOString(),
    daily: true,
    source: "Frankfurter/ECB"
  };
}

async function fallbackFx(currency, symbol, range) {
  const results = await Promise.allSettled([
    yahooFx(symbol, range),
    frankfurterFx(currency, range)
  ]);
  const values = results.filter((item) => item.status === "fulfilled").map((item) => item.value);
  if (!values.length) throw new Error(`Sem cotacao reserva para ${currency}`);

  const yahoo = values.find((item) => item.source === "Yahoo Finance");
  const officialDaily = values.find((item) => item.source === "Frankfurter/ECB");
  if (yahoo && officialDaily) {
    const divergence = Math.abs(yahoo.brl - officialDaily.brl) / officialDaily.brl;
    if (divergence > 0.08) return { ...officialDaily, validation: "usado por divergencia entre fontes" };
    return { ...yahoo, validation: "validado por Frankfurter/ECB" };
  }
  return values[0];
}

async function currencyQuote(currency, symbol, range) {
  try {
    return await latestPtax(currency);
  } catch {
    return fallbackFx(currency, symbol, range);
  }
}

async function currencies() {
  const [usdResult, eurResult] = await Promise.allSettled([
    currencyQuote("USD", "USDBRL=X", [3, 8.5]),
    currencyQuote("EUR", "EURBRL=X", [3.5, 10])
  ]);
  const usd = usdResult.status === "fulfilled" ? usdResult.value : null;
  const eur = eurResult.status === "fulfilled" ? eurResult.value : null;
  if (!usd && !eur) throw new Error("Sem cotacao de cambio nas fontes disponiveis");
  const sources = [...new Set([usd?.source, eur?.source].filter(Boolean))].join(" / ");
  return {
    source: sources,
    usd,
    eur,
    note: [
      usd ? "" : "USD indisponivel nas fontes consultadas",
      eur ? "" : "EUR indisponivel nas fontes consultadas"
    ].filter(Boolean).join("; ")
  };
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
