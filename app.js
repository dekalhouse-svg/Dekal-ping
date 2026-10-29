const $ = (id) => document.getElementById(id);
const siteList = $("siteList");
const refreshBtn = $("refreshBtn");

function repositoryInfo() {
  const host = location.hostname;
  const parts = location.pathname.split("/").filter(Boolean);
  if (host.endsWith(".github.io")) {
    return { owner: host.split(".")[0], repo: parts[0] || `${host.split(".")[0]}.github.io` };
  }
  return null;
}
function rawFile(file) {
  const info = repositoryInfo();
  if (info) return `https://raw.githubusercontent.com/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}/main/${file}`;
  return file;
}
function formatTime(value) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : date.toLocaleString("fr-FR", { dateStyle:"medium", timeStyle:"short" });
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function setConnection(text, good=false) {
  $("connection").textContent = text;
  $("connection").style.color = good ? "#86efac" : "#a5b4cc";
}
async function fetchJson(file) {
  const response = await fetch(`${rawFile(file)}?t=${Date.now()}`, { cache:"no-store" });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.json();
}
function render(servers, results) {
  const entries = Array.isArray(results.results) ? results.results : [];
  const byId = new Map(entries.map(item => [item.id, item]));
  const active = (servers.servers || []).filter(server => server.enabled !== false);
  const mapped = active.map((server, index) => {
    const id = server.id || server.url;
    return { server, result: byId.get(id) || entries.find(item => item.url === server.url) || null, index };
  });
  const up = mapped.filter(x => x.result && x.result.status === "up").length;
  const down = mapped.filter(x => x.result && x.result.status === "down").length;
  $("totalCount").textContent = active.length;
  $("upCount").textContent = up;
  $("downCount").textContent = down;
  $("updatedAt").textContent = `Dernière vérification : ${formatTime(results.checked_at)}`;
  if (!mapped.length) {
    siteList.innerHTML = '<div class="empty">Aucun site actif. Ajoutez une adresse dans servers.json.</div>';
    return;
  }
  siteList.innerHTML = mapped.map(({server,result}) => {
    const status = result?.status || "unknown";
    const label = status === "up" ? "EN LIGNE" : status === "down" ? "ERREUR" : "EN ATTENTE";
    const latency = Number.isFinite(result?.response_ms) ? `${Math.round(result.response_ms)} ms` : "Temps indisponible";
    const detail = result?.error || (result?.http_status ? `HTTP ${result.http_status}` : "Pas encore vérifié");
    return `<article class="site"><div class="site-info"><div class="site-name">${escapeHtml(server.name || server.url)}</div><div class="site-url">${escapeHtml(server.url)}</div><div class="site-url">${escapeHtml(detail)}</div></div><div class="site-meta"><span class="badge ${status}">${label}</span><span class="latency">${escapeHtml(latency)}</span></div></article>`;
  }).join("");
}
async function refresh() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Actualisation…";
  try {
    const [servers, results] = await Promise.all([fetchJson("servers.json"), fetchJson("results.json")]);
    render(servers, results);
    setConnection("Résultats chargés", true);
  } catch (error) {
    console.error(error);
    setConnection("Connexion impossible");
    siteList.innerHTML = `<div class="empty">Impossible de charger la configuration ou les résultats.<br>Vérifiez que le dépôt et GitHub Pages sont publics et que les fichiers existent.<br><small>${escapeHtml(error.message)}</small></div>`;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Actualiser les résultats";
  }
}
const repo = repositoryInfo();
if (repo) $("repoLink").href = `https://github.com/${repo.owner}/${repo.repo}`;
else $("repoLink").href = "https://github.com";
refreshBtn.addEventListener("click", refresh);
refresh();
setInterval(refresh, 60000);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(console.warn));
}