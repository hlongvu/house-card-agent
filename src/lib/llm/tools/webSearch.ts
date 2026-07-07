export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<WebSearchResult[]> {
  const provider = process.env.WEB_SEARCH_PROVIDER || "";
  const apiKey = process.env.WEB_SEARCH_API_KEY || "";

  if (!provider || !apiKey) {
    return [];
  }

  if (provider === "tavily") {
    return searchTavily(query, apiKey);
  }

  if (provider === "serpapi") {
    return searchSerpApi(query, apiKey);
  }

  return [];
}

async function searchTavily(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, search_depth: "basic", max_results: 5 }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}

async function searchSerpApi(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const params = new URLSearchParams({ q: query, api_key: apiKey, engine: "google" });
  const res = await fetch(`https://serpapi.com/search?${params}`);

  if (!res.ok) return [];

  const data = await res.json();
  return (data.organic_results || []).map(
    (r: { title: string; link: string; snippet: string }) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })
  );
}
