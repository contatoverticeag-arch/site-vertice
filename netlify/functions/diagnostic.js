const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const clean = (value) => String(value || "").trim().slice(0, 600);

const has = (text, ...needles) => needles.some((needle) => clean(text).toLowerCase().includes(needle));

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Vertice/1.0 Diagnostic" } });
  if (!response.ok) throw new Error(`Fonte indisponivel: ${response.status}`);
  return response.json();
}

async function trendsFor(answers) {
  const audience = clean(answers[2]);
  const objective = clean(answers[1]);
  const queryBase = has(audience, "agro", "produtor", "cooperativa")
    ? '(agritech OR "agronegocio tecnologia" OR "produtor rural") sourceCountry:BR'
    : has(objective, "lançamento", "produto")
      ? '("go to market" OR "lançamento de produto" OR "marketing B2B") sourceCountry:BR'
      : '("eventos corporativos" OR "customer experience" OR "marketing B2B") sourceCountry:BR';

  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(queryBase)}&mode=ArtList&format=json&maxrecords=5&sort=HybridRel&timespan=14d`;
    const data = await fetchJson(url);
    return (data.articles || []).slice(0, 4).map((item) => ({
      title: item.title,
      source: item.sourceCommonName || item.domain || "fonte aberta",
      url: item.url
    }));
  } catch {
    return [];
  }
}

function profile(answers) {
  const objective = clean(answers[1]);
  const audience = clean(answers[2]);
  const format = clean(answers[3]);
  const scale = clean(answers[4]);
  const maturity = clean(answers[5]);
  const deadline = clean(answers[6]);

  const pipeline = has(objective, "pipeline", "oportunidade");
  const retention = has(objective, "reter", "reten", "lifetime");
  const launch = has(objective, "lançar", "lanc", "produto", "marca");
  const agro = has(audience, "agro", "produtor", "cooperativa", "campo");
  const cLevel = has(audience, "c-level", "diretor");
  const mixed = has(audience, "misto", "diferentes");
  const field = has(format, "campo", "field");
  const urgent = has(deadline, "45", "menos");
  const noTheme = has(maturity, "sem tema", "direção", "primeira");
  const big = has(scale, "400", "150 a 400");

  const lane = pipeline ? "pipeline" : retention ? "retencao" : launch ? "lancamento" : "autoridade";
  return { objective, audience, format, scale, maturity, deadline, pipeline, retention, launch, agro, cLevel, mixed, field, urgent, noTheme, big, lane };
}

function baseDiagnostic(answers, trendItems = []) {
  const p = profile(answers);
  const title = {
    pipeline: p.agro ? "Pipeline agro com tese comercial" : "Evento desenhado para gerar pipeline",
    retencao: "Jornada para proteger contas estratégicas",
    lancamento: p.noTheme ? "Lançamento que precisa virar narrativa" : "Lançamento pronto para ganhar tração",
    autoridade: p.agro ? "Autoridade técnica com aplicação no campo" : "Autoridade que vira relacionamento"
  }[p.lane];

  const trend = trendItems[0]?.title
    ? ` Um sinal externo relevante: "${trendItems[0].title}", publicado por ${trendItems[0].source}.`
    : "";

  const audienceRead = p.cLevel
    ? "Como o público é executivo, a experiência precisa ser objetiva, densa e orientada a decisão."
    : p.agro
      ? "Como o público está no agro, a conversa precisa ligar tecnologia, margem, confiança e aplicabilidade prática."
      : p.mixed
        ? "Como há públicos diferentes na mesma sala, a jornada precisa segmentar mensagens sem quebrar a unidade narrativa."
        : "Como o público é técnico ou influenciador, a credibilidade nasce de demonstração, profundidade e utilidade real.";

  const timing = p.urgent
    ? "Com prazo curto, a decisão mais importante é cortar complexidade e proteger aquilo que gera valor comercial."
    : "Com mais espaço de planejamento, o ganho está em desenhar a jornada completa antes de contratar produção.";

  const kpis = {
    pipeline: ["Presença qualificada acima de 65%", "35% dos participantes qualificados com próximo passo comercial definido", "Follow-up D+3 realizado para 100% das contas priorizadas"],
    retencao: ["Participação de pelo menos 70% das contas estratégicas convidadas", "NPS relacional acima de 85", "Plano D+30 criado para contas com risco ou expansão"],
    lancamento: ["80% dos convidados entendendo a proposta central do lançamento", "30% dos participantes engajando em demonstração, teste ou conversa comercial", "Régua de adoção ativada em até 7 dias"],
    autoridade: ["Tempo médio de permanência acima de 70% da agenda", "Perguntas ou interações registradas por tema estratégico", "Conteúdos pós-evento enviados por cluster de interesse"]
  }[p.lane];

  const risk = {
    pipeline: "O maior risco é medir sala cheia e não avanço comercial. Sem curadoria, convite consultivo e régua D+90, o evento vira networking caro.",
    retencao: "O maior risco é agradar clientes importantes sem capturar sinais de risco, expansão e percepção de valor.",
    lancamento: "O maior risco é apresentar novidade sem construir desejo, urgência e clareza de adoção.",
    autoridade: "O maior risco é entregar conteúdo demais e decisão de menos: a audiência aprende, mas não muda comportamento."
  }[p.lane];

  const promise = {
    pipeline: "A Vértice estrutura o evento como sistema de geração de oportunidades: público certo, narrativa certa, experiência certa e continuidade comercial.",
    retencao: "A Vértice transforma encontro com cliente em plataforma de confiança, escuta e plano de continuidade.",
    lancamento: "A Vértice conecta mensagem, experiência e adoção para que o lançamento não seja só anúncio, mas tração.",
    autoridade: "A Vértice transforma conhecimento em preferência: conteúdo aplicável, experiência memorável e relacionamento depois do palco."
  }[p.lane];

  return {
    titulo: title,
    subtitulo: "A oportunidade está em transformar presença em decisão, e decisão em continuidade comercial.",
    diagnostico_geral: `${audienceRead} O objetivo informado exige que o evento seja tratado como uma jornada de decisão, não como uma agenda bonita. ${timing}${trend}`,
    sinal_mercado: {
      titulo: "Contexto externo aplicado",
      texto: trendItems.length
        ? `As notícias recentes reforçam um ambiente em que tecnologia, eficiência e relacionamento consultivo pesam mais na decisão. Para o seu briefing, isso significa que o evento precisa traduzir contexto em utilidade prática.`
        : "Mesmo sem depender de notícia do dia, o cenário favorece eventos com tese clara: público certo, promessa objetiva, conteúdo aplicável e continuidade comercial.",
      implicacao: "A primeira pergunta do convite deve ser: que decisão esse participante vai tomar melhor depois de viver essa experiência?"
    },
    potencial_oculto: p.pipeline
      ? "O potencial escondido está em transformar cada interação do evento em sinal comercial: tema de interesse, pergunta feita, trilha assistida e próximo passo."
      : p.retention
        ? "O potencial escondido está em usar o evento como fórum de escuta para proteger relacionamento e descobrir expansão antes do concorrente."
        : p.launch
          ? "O potencial escondido está em fazer o lançamento começar antes do palco: convite, narrativa e prova precisam preparar a adoção."
          : "O potencial escondido está em converter conteúdo em preferência. Autoridade só vira ativo quando gera confiança e continuidade.",
    frentes: [
      { codigo: "01", nome: "Tese do evento", descricao: "Definir por que esse evento precisa existir agora e qual decisão ele deve mover.", entregavel: "Promessa central, hipótese comercial e critério de sucesso." },
      { codigo: "02", nome: "Curadoria de público", descricao: "Separar participantes por valor, influência, dor e próximo passo esperado.", entregavel: "Mapa de convidados, clusters e abordagem por perfil." },
      { codigo: "03", nome: "Narrativa e conteúdo", descricao: "Construir uma linha editorial que ligue contexto, dor, prova e ação.", entregavel: "Roteiro narrativo, blocos de conteúdo e momentos de interação." },
      { codigo: "04", nome: "Herança D+90", descricao: "Criar a régua que transforma presença em relacionamento, dados e oportunidade.", entregavel: "Plano D+1, D+7, D+30 e D+90 com responsáveis." }
    ],
    kpis_propostos: kpis,
    alerta_principal: risk,
    promessa: promise,
    fase_entrada: p.noTheme ? "Conceito & Narrativa: o projeto precisa de uma ideia central antes de falar em produção." : "Diagnóstico Integrado: conectar objetivo, público, formato, risco e indicadores antes da execução.",
    proximos_passos: [
      "Validar a tese comercial do evento em uma reunião de 45 minutos.",
      "Priorizar público e contas antes de fechar formato, local ou fornecedores.",
      "Desenhar a régua D+90 antes de aprovar o roteiro final."
    ],
    fontes_contexto: trendItems.slice(0, 3)
  };
}

async function groqDiagnostic(answers, trendItems, base) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const prompt = `Você é Guilherme Almeida, fundador da Vértice Engenharia de Experiências. Gere um diagnóstico premium e comercial, em português, para este briefing:

Resultado: ${clean(answers[1])}
Público: ${clean(answers[2])}
Formato: ${clean(answers[3])}
Escala: ${clean(answers[4])}
Maturidade: ${clean(answers[5])}
Prazo: ${clean(answers[6])}

Sinais externos coletados de fontes abertas:
${trendItems.map((item, i) => `${i + 1}. ${item.title} | ${item.source}`).join("\n") || "Sem sinais externos confiáveis no momento."}

Use estes sinais apenas como contexto. A qualidade do diagnóstico deve vir de estratégia de eventos B2B: público, narrativa, jornada, risco operacional, régua D+90 e KPIs.

Responda somente JSON com as mesmas chaves deste exemplo-base, podendo melhorar o texto, mas sem remover nenhuma chave:
${JSON.stringify(base)}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.62,
      max_tokens: 1200,
      messages: [
        { role: "system", content: "Responda somente JSON valido. Nao invente fontes. Nao deixe campos vazios." },
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

function merge(base, generated) {
  if (!generated) return { ...base, generated: false };
  return {
    ...base,
    ...generated,
    frentes: Array.isArray(generated.frentes) && generated.frentes.length ? generated.frentes : base.frentes,
    kpis_propostos: Array.isArray(generated.kpis_propostos) && generated.kpis_propostos.length ? generated.kpis_propostos : base.kpis_propostos,
    proximos_passos: Array.isArray(generated.proximos_passos) && generated.proximos_passos.length ? generated.proximos_passos : base.proximos_passos,
    fontes_contexto: base.fontes_contexto,
    generated: true
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Payload inválido." });
  }

  const answers = payload.answers || {};
  const trendItems = await trendsFor(answers);
  const base = baseDiagnostic(answers, trendItems);
  const generated = await groqDiagnostic(answers, trendItems, base).catch(() => null);
  return json(200, merge(base, generated));
};
