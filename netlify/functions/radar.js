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
      titulo: "Dados precisam virar intenção comercial",
      texto: "A tecnologia que cria valor no evento B2B não é a mais chamativa, é a que revela intenção: tema visitado, pergunta feita, dor declarada e próximo passo possível.",
      acao: "Criar estações com QR/NFC por tema, pontuar interesse por conta e entregar ao comercial uma lista D+3 com prioridade, dor e abordagem sugerida."
    }
  },
  {
    id: "experiencia",
    label: "Eventos & experiência",
    query: '("eventos corporativos" OR "experiencia do cliente" OR "customer experience" OR "brand experience") sourceCountry:BR',
    fallback: {
      titulo: "Experiência precisa defender uma tese",
      texto: "O participante não precisa de mais uma agenda cheia. Ele precisa entender por que aquela conversa importa agora e qual decisão ficará mais clara depois do encontro.",
      acao: "Abrir o evento com uma tese de negócio, transformar cada bloco em uma prova dessa tese e fechar com uma decisão objetiva para o público."
    }
  },
  {
    id: "agro",
    label: "Agro & mercado",
    query: '(agronegocio OR soja OR milho OR cooperativas OR produtor rural OR "mercado agro") sourceCountry:BR',
    fallback: {
      titulo: "No agro, promessa sem prova perde força",
      texto: "Com margens mais sensíveis e decisão mais técnica, o produtor tende a valorizar encontros que traduzem tecnologia em produtividade, risco menor ou ganho operacional visível.",
      acao: "Levar a solução para uma demonstração aplicada: antes e depois, conta simples de impacto e conversa por perfil de produtor, cooperativa ou distribuidor."
    }
  },
  {
    id: "relacionamento",
    label: "Relacionamento B2B",
    query: '("marketing B2B" OR relacionamento OR "customer advisory board" OR comunidade OR "pos evento") sourceCountry:BR',
    fallback: {
      titulo: "O valor aparece depois do palco",
      texto: "O encontro cria confiança, mas o ganho comercial nasce quando a empresa sabe o que fazer com cada sinal capturado: risco, expansão, objeção, interesse e urgência.",
      acao: "Desenhar a régua D+1, D+7 e D+30 antes do roteiro, com mensagem por cluster, dono comercial e gatilho claro de próxima conversa."
    }
  }
];

function strategicSignals(front) {
  const signals = {
    tecnologia: [
      { title: "Captura de intenção por QR, NFC e formulários progressivos substitui credenciamento passivo", source: "Radar Vértice" },
      { title: "Resumos de perguntas e trilhas de interesse ajudam a transformar evento em inteligência comercial", source: "Radar Vértice" }
    ],
    experiencia: [
      { title: "Experiências B2B ganham força quando combinam tese, prova e decisão, não apenas ambientação", source: "Radar Vértice" },
      { title: "Conteúdo curto, demonstração prática e conversa guiada tendem a superar palestras longas sem próximo passo", source: "Radar Vértice" }
    ],
    agro: [
      { title: "No agro, margem pressionada aumenta exigência por prova prática, ROI e aplicabilidade no campo", source: "Radar Vértice" },
      { title: "Cooperativas e distribuidores valorizam encontros que conectam tecnologia, confiança e ganho operacional", source: "Radar Vértice" }
    ],
    relacionamento: [
      { title: "Régua D+30 e fóruns de escuta ajudam a proteger contas estratégicas no B2B", source: "Radar Vértice" },
      { title: "Customer Advisory Board leve transforma evento em sensor de risco, expansão e confiança", source: "Radar Vértice" }
    ]
  };
  return signals[front.id] || [];
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Vertice/1.0 Radar" } });
  if (!response.ok) throw new Error(`Fonte indisponivel: ${response.status}`);
  return response.json();
}

async function trendsFor(front) {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(front.query)}&mode=ArtList&format=json&maxrecords=6&sort=HybridRel&timespan=7d`;
    const data = await fetchJson(url);
    const items = (data.articles || []).slice(0, 4).map((item) => ({
      title: item.title,
      source: item.sourceCommonName || item.domain || "fonte aberta",
      url: item.url,
      date: item.seendate
    }));
    return items.length ? items : strategicSignals(front);
  } catch {
    return strategicSignals(front);
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
      temperature: 0.42,
      max_tokens: 620,
      messages: [
        {
          role: "system",
          content: "Responda somente JSON valido em portugues do Brasil. Nao invente fontes, numeros ou acontecimentos. Escreva como consultoria estrategica premium para eventos B2B."
        },
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
  const signal = items[0]?.title || front.fallback.titulo;
  return {
    frente: front.label,
    titulo: front.fallback.titulo,
    texto: `${front.fallback.texto} Sinal observado: ${signal}.`,
    acao: front.fallback.acao,
    sinal: signal,
    fontes: items.slice(0, 2).map((item) => item.source).filter(Boolean).join(", ") || "Radar Vértice"
  };
}

function weakInsight(value) {
  const joined = `${value?.titulo || ""} ${value?.texto || ""} ${value?.acao || ""} ${value?.sinal || ""}`.toLowerCase();
  const forbidden = [
    "radar de tendências indisponível",
    "radar de tendencias indisponivel",
    "falta de sinais externos",
    "nenhum sinal externo",
    "inovação em eventos",
    "inovacao em eventos",
    "experiência personalizada",
    "experiencia personalizada",
    "fortalecendo parcerias",
    "inovação no setor agro",
    "inovacao no setor agro",
    "conteúdo relevante e personalizado",
    "conteudo relevante e personalizado",
    "necessidades e expectativas",
    "networking virtuais",
    "plataformas de matchmaking",
    "curadoria estratégica",
    "curadoria estrategica"
  ];

  return !value
    || !value.titulo
    || !value.texto
    || !value.acao
    || String(value.texto).length < 130
    || String(value.acao).length < 70
    || forbidden.some((phrase) => joined.includes(phrase));
}

async function analyzeFront(front) {
  const items = await trendsFor(front);
  const prompt = `Você é o analista estratégico da Vértice Engenharia de Experiências.

FRENTE DO DIA: ${front.label}

Sinais disponíveis:
${items.map((item, index) => `${index + 1}. ${item.title} | Fonte: ${item.source}`).join("\n")}

Gere UMA leitura diária para essa frente.
O texto precisa ajudar um decisor de marketing, comercial, CX ou agro a entender como transformar cenário em evento B2B com tese comercial.

Regras:
- Não use frases genéricas como "inovação em eventos", "experiência personalizada" ou "fortalecer parcerias".
- Não diga que há falta de sinais externos.
- Não escreva recomendação financeira.
- Não invente notícia.
- Se o sinal vier do Radar Vértice, trate como tendência estratégica.
- Conecte a análise a convite, conteúdo, experiência, captura de dados, pós-evento ou relacionamento comercial.

Responda somente JSON:
{
  "frente": "${front.label}",
  "titulo": "frase forte até 9 palavras",
  "texto": "2 linhas específicas, provocativas e consultivas",
  "acao": "ação prática e específica que a Vértice poderia aplicar em um evento",
  "sinal": "sinal usado, sem escrever curadoria estratégica",
  "fontes": "fontes usadas"
}`;

  const generated = await groqJson(prompt);
  if (weakInsight(generated)) return fallbackFront(front, items);

  return {
    ...fallbackFront(front, items),
    ...generated,
    frente: front.label,
    sinal: generated.sinal || items[0]?.title || front.fallback.titulo,
    fontes: generated.fontes || items.slice(0, 2).map((item) => item.source).filter(Boolean).join(", ") || "Radar Vértice"
  };
}

exports.handler = async () => {
  const insights = await Promise.all(FRONTS.map(analyzeFront));

  return json(200, {
    generated: insights.some((item) => item.fontes && !String(item.fontes).includes("Radar Vértice")),
    timestamp: new Date().toISOString(),
    insight: {
      manchete: "Quatro sinais para transformar mercado em experiência",
      termometro: "Tecnologia, agro, experiência e pós-evento precisam operar como uma tese só.",
      contexto: "A leitura diária cruza sinais abertos e radar estratégico Vértice para traduzir o mercado em decisões de evento: quem convidar, qual pauta defender, que dado capturar e como sustentar a conversa depois.",
      insights,
      fontes: insights.map((item) => item.fontes).filter(Boolean).join(" | ")
    }
  });
};
