const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200"
};

const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const FRONTS = [
  {
    id: "tecnologia",
    label: "Tecnologia aplicada",
    query: '(agritech OR "inteligencia artificial" OR automacao OR "dados no agro" OR "event technology") sourceCountry:BR',
    fallback: {
      titulo: "Dados precisam virar sinal comercial",
      texto: "A tecnologia mais útil para eventos B2B não é a que chama atenção, é a que revela intenção: quem interagiu, com qual tema e qual próximo passo faz sentido.",
      acao: "Use QR, NFC ou formulários progressivos para classificar interesse por tema e alimentar o follow-up D+7."
    }
  },
  {
    id: "experiencia",
    label: "Eventos & experiência",
    query: '("eventos corporativos" OR "experiencia do cliente" OR "customer experience" OR "brand experience") sourceCountry:BR',
    fallback: {
      titulo: "Experiência sem tese vira decoração",
      texto: "O evento precisa responder por que agora, por que esse público e que decisão será destravada depois da experiência.",
      acao: "Transforme a abertura do evento em uma tese de negócio, não em boas-vindas genéricas."
    }
  },
  {
    id: "agro",
    label: "Agro & mercado",
    query: '(agronegocio OR soja OR milho OR cooperativas OR produtor rural OR "mercado agro") sourceCountry:BR',
    fallback: {
      titulo: "O produtor quer aplicabilidade, não promessa",
      texto: "No agro, a pauta ganha força quando conecta tecnologia, margem, risco e decisão prática no campo.",
      acao: "Inclua uma demonstração ou caso aplicado que mostre o impacto operacional antes de falar de solução."
    }
  },
  {
    id: "relacionamento",
    label: "Relacionamento B2B",
    query: '("marketing B2B" OR relacionamento OR "customer advisory board" OR comunidade OR "pos evento") sourceCountry:BR',
    fallback: {
      titulo: "O valor está depois do palco",
      texto: "A experiência cria energia, mas a régua D+1, D+7 e D+30 é o que transforma presença em relacionamento e pipeline.",
      acao: "Desenhe o pós-evento antes do roteiro: mensagem por cluster, dono comercial e gatilho de próxima conversa."
    }
  }
];

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Vertice/1.0 Radar" } });
  if (!response.ok) throw new Error(`Fonte indisponivel: ${response.status}`);
  return response.json();
}

async function trendsFor(front) {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(front.query)}&mode=ArtList&format=json&maxrecords=6&sort=HybridRel&timespan=7d`;
    const data = await fetchJson(url);
    return (data.articles || []).slice(0, 4).map((item) => ({
      title: item.title,
      source: item.sourceCommonName || item.domain || "fonte aberta",
      url: item.url,
      date: item.seendate
    }));
  } catch {
    return [];
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
      temperature: 0.58,
      max_tokens: 420,
      messages: [
        { role: "system", content: "Responda somente JSON valido em portugues do Brasil. Nao invente fontes, numeros ou acontecimentos. Se as fontes forem fracas, gere uma leitura estrategica a partir da frente analisada." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || "");
  } catch {
    return null;
  }
}

function fallbackFront(front, items) {
  return {
    frente: front.label,
    titulo: front.fallback.titulo,
    texto: front.fallback.texto,
    acao: front.fallback.acao,
    sinal: items[0]?.title || "Curadoria Vértice",
    fontes: items.slice(0, 2).map((item) => item.source).filter(Boolean).join(", ") || "curadoria Vértice"
  };
}

async function analyzeFront(front) {
  const items = await trendsFor(front);
  const prompt = `Você é um analista estratégico da Vértice, especialista em eventos B2B, agro, tecnologia aplicada e relacionamento corporativo.

FRENTE DO DIA: ${front.label}

Sinais coletados de fontes abertas nos últimos dias:
${items.map((item, index) => `${index + 1}. ${item.title} | Fonte: ${item.source}`).join("\n") || "Nenhum sinal externo confiável retornou para esta frente."}

Gere UMA leitura diária para esta frente. Ela precisa ser útil para uma empresa que vende estratégia de eventos B2B.
Não faça recomendação financeira. Não invente notícia. Conecte a frente a decisões sobre convite, conteúdo, experiência, dados, pós-evento ou relacionamento comercial.

Responda somente JSON:
{
  "frente": "${front.label}",
  "titulo": "frase forte até 9 palavras",
  "texto": "2 linhas com visão interessante e atual",
  "acao": "ação prática que a Vértice poderia aplicar em um evento",
  "sinal": "o sinal/fato usado ou 'curadoria estratégica' se não houver notícia confiável",
  "fontes": "fontes usadas"
}`;

  const generated = await groqJson(prompt);
  if (!generated) return fallbackFront(front, items);
  return {
    ...fallbackFront(front, items),
    ...generated,
    frente: front.label,
    fontes: generated.fontes || items.slice(0, 2).map((item) => item.source).filter(Boolean).join(", ") || "curadoria Vértice"
  };
}

exports.handler = async () => {
  const insights = await Promise.all(FRONTS.map(analyzeFront));
  const generated = insights.some((item) => item.sinal && item.sinal !== "Curadoria Vértice");

  return json(200, {
    generated,
    timestamp: new Date().toISOString(),
    insight: {
      manchete: "Quatro sinais para transformar mercado em experiência",
      termometro: "Tecnologia, agro, CX e pós-evento precisam operar como uma tese só.",
      contexto: "A leitura diária da Vértice cruza tendências abertas com os pilares do método: diagnóstico, narrativa, engenharia de conteúdo, execução e herança comercial.",
      insights,
      fontes: insights.map((item) => item.fontes).filter(Boolean).join(" | ")
    }
  });
};
