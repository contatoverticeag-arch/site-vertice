# Vértice Site Novo

Esta pasta é a versão limpa para GitHub e Netlify.

## Subir no GitHub

Suba todos os arquivos desta pasta mantendo a estrutura:

```txt
index.html
blog.html
diagnostico.html
mercado.html
vertice.html
styles.css
components.js
netlify.toml
netlify/functions/blog.js
netlify/functions/market.js
netlify/functions/radar.js
netlify/functions/diagnostic.js
netlify/functions/groq.js
```

## Netlify

O `netlify.toml` já está configurado:

```txt
publish = "."
functions = "netlify/functions"
```

Depois de subir no GitHub, rode:

```txt
Deploys > Clear cache and deploy site
```

## Variáveis no Netlify

Obrigatória para as análises avançadas:

```txt
GROQ_API_KEY
```

Opcional:

```txt
GROQ_MODEL=llama-3.3-70b-versatile
```

## Arquitetura

- `market.js`: busca PTAX diária do Banco Central para USD/EUR e cotações de soja/milho/IBOV quando disponíveis.
- `radar.js`: busca sinais de tendências em fontes abertas e gera a análise do hub de mercado.
- `diagnostic.js`: gera diagnóstico personalizado a partir das respostas do usuário e sinais externos quando disponíveis.
- Home: conteúdo editorial fixo e visível, sem depender de planilha ou fetch.
- Blog: continua lendo a planilha pelo proxy `blog.js`.
