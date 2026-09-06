// Minimal MCP Streamable-HTTP client for MoMorph. Usage: node mm.mjs <tool> '<json-args>'  |  node mm.mjs --list
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync(process.env.HOME + '/.claude.json','utf8'));
const mm = cfg.projects['/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on'].mcpServers.momorph;
const H = { 'content-type':'application/json', 'accept':'application/json, text/event-stream', ...mm.headers };
let sid = null;
async function rpc(method, params, id = 1) {
  const r = await fetch(mm.url, { method:'POST', headers: sid ? {...H,'mcp-session-id':sid} : H, body: JSON.stringify({ jsonrpc:'2.0', id, method, params }) });
  sid = r.headers.get('mcp-session-id') || sid;
  const ct = r.headers.get('content-type') || '';
  const txt = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${txt.slice(0,500)}`);
  if (ct.includes('text/event-stream')) {
    const datas = txt.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim());
    for (const d of datas.reverse()) { try { const j = JSON.parse(d); if (j.id === id) return j; } catch {} }
    throw new Error('no matching SSE data: ' + txt.slice(0,300));
  }
  return JSON.parse(txt);
}
await rpc('initialize', { protocolVersion:'2025-03-26', capabilities:{}, clientInfo:{ name:'takumi-cli', version:'0.1' } });
await fetch(mm.url, { method:'POST', headers: sid ? {...H,'mcp-session-id':sid} : H, body: JSON.stringify({ jsonrpc:'2.0', method:'notifications/initialized' }) }).catch(()=>{});
const [tool, argsJson] = process.argv.slice(2);
if (tool === '--list') {
  const res = await rpc('tools/list', {}, 2);
  for (const t of res.result.tools) console.log(t.name, '—', (t.description||'').split('\n')[0].slice(0,140), '| params:', Object.keys(t.inputSchema?.properties||{}).join(','));
} else {
  const res = await rpc('tools/call', { name: tool, arguments: JSON.parse(argsJson||'{}') }, 3);
  if (res.error) { console.error(JSON.stringify(res.error)); process.exit(1); }
  for (const c of res.result.content||[]) console.log(c.type === 'text' ? c.text : JSON.stringify(c).slice(0,200));
  if (res.result.isError) process.exit(1);
}
