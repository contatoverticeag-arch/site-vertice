const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=21600, s-maxage=21600, stale-while-revalidate=21600"
};

const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Vertice/1.0 Radar" } });
  if (!response.ok) throw new Error(`Fonte indisponivel: ${response.status}`);
  return response.json();
}

async function trends() {
  const query = encodeURIComponent('(agritech OR "agro tecnologia" OR "eventos corporativos" OR "customer experience" OR "marketing B2B") sourceCountry:BR');
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&format=json&maxrecords=8&sort=HybridRel&timespan=7d`;
  try {
    const data = await fetchJson(url);
    return (data.articles || []).slice(0, 6).map((item) => ({
      title: item.title,
      source: item.sourceCommonName || item.domain || "fonte aberta",
      url: item.url,
      date: item.seendate
    }));
  } catch {
    return [
      { title: "Empresas do agro seguem buscando eficiência, dados e relacionamento consultivo", source: "curadoria Vértice", url: "" },
      { title: "Eventos B2B ganham valor quando conectam conteúdo, pipeline e pós-evento", source: "curadoria Vértice", url: "" },
      { title: "Tecnologia aplicada precisa provar uso prático, não apenas modernidade", source: "curadoria Vértice", url: "" }
    ];
  }
}

async function groqJson(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.55,
      max_tokens: 850,
      messages: [
        { role: "system", content: "Responda somente JSON valido, em portugues do Brasil. Nao invente fontes ou numeros." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  const raw = data.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fallbackRadar(items) {
  const sourceLine = items.slice(0, 3).map((item) => item.source).filter(Boolean).join(", ") || "fontes abertas";
  return {
    manchete: "O mercado quer prova de utilidade antes do convite",
    termometro: "Atenção para tecnologia aplicada, relacionamento consultivo e clareza de ROI.",
    contexto: "O sinal mais importante para eventos B2B não é apenas a cotação do dia. É a seletividade do decisor: quem vai parar a agenda precisa entender qual decisão ficará mais clara depois da experiência.",
    insights: [
      {
        titulo: "Tecnologia com papel comercial",
        texto: "Dados, NFC, automações e dashboards devem capturar sinais de intenção, não apenas impressionar visualmente.",
        acao: "Planeje quais comportamentos serão registrados antes de escolher a ferramenta."
      },
      {
        titulo: "Evento como tese de negócio",
        texto: "A pauta precisa responder por que agora, por que esse público e por que essa conversa merece prioridade.",
        acao: "Transforme o convite em argumento consultivo, não em comunicado de agenda."
      },
      {
        titulo: "Pós-evento como ativo",
        texto: "O valor criado no encontro se perde quando não há régua D+1, D+7 e D+30 conectada ao comercial.",
        acao: "Desenhe o follow-up antes de fechar o roteiro do evento."
      }
    ],
    fontes: sourceLine
  };
}

exports.handler = async () => {
  const items = await trends();
  const prompt = `Você é um analista estratégico da Vértice, especialista em agronegócio, eventos B2B, tecnologia aplicada e relacionamento corporativo.

Use estes sinais coletados de fontes abertas como contexto, sem inventar fatos:
${items.map((item, index) => `${index + 1}. ${item.title} | Fonte: ${item.source}`).join("\n")}

Crie uma leitura premium para a seção "Análise do dia" de um hub de mercado. O foco não é recomendação financeira; é transformar contexto em decisão sobre eventos, conteúdo, CX e relacionamento B2B.

Responda em JSON:
{
  "manchete": "frase forte até 12 palavras",
  "termometro": "1 frase curta",
  "contexto": "2-3 linhas estratégicas",
  "insights": [
    {"titulo":"...", "texto":"2 linhas", "acao":"ação concreta"},
    {"titulo":"...", "texto":"2 linhas", "acao":"ação concreta"},
    {"titulo":"...", "texto":"2 linhas", "acao":"ação concreta"}
  ],
  "fontes": "nomes das fontes usadas"
}`;

  const generated = await groqJson(prompt);
  return json(200, {
    generated: Boolean(generated),
    trends: items,
    insight: generated || fallbackRadar(items)
  });
};
