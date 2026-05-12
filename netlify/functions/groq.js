exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "Análise avançada não configurada." })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Payload inválido." })
    };
  }

  const prompt = String(payload.prompt || "").trim();
  const maxTokens = Math.min(Number(payload.max_tokens) || 900, 1000);
  const temperature = Math.min(Math.max(Number(payload.temperature) || 0.65, 0), 1);
  const wantsJson = payload.json === true;

  if (!prompt || prompt.length > 12000) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Prompt vazio ou muito longo." })
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: wantsJson
              ? "Responda somente com JSON valido, sem markdown, sem comentario antes ou depois."
              : "Responda de forma objetiva, util e em portugues do Brasil."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature,
        ...(wantsJson ? { response_format: { type: "json_object" } } : {})
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || "Erro ao gerar análise." })
      };
    }

    const content = data.choices?.[0]?.message?.content || "";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content })
    };
  } catch {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Serviço de análise indisponível no momento." })
    };
  }
};
