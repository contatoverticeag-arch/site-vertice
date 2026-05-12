const SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzByVitKNqbJslkrwGp65DdPse0x3eyu-UZ1SgziMB0ioDem-7bfN8st2coGEAFd3o2TgSMh5Q0KPD/pub?output=csv";

exports.handler = async () => {
  try {
    const response = await fetch(SHEETS_URL, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 Vertice Blog Reader"
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ error: "Conteudo indisponivel no momento." })
      };
    }

    const csv = await response.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=180"
      },
      body: csv
    };
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: "Nao foi possivel carregar o conteudo." })
    };
  }
};
