// Oberfläche: liest data.js, rechnet mit engine.js, merkt sich eigene Eingaben im Browser (localStorage).
const $ = s => document.querySelector(s)
const load = k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* privater Modus: dann eben ohne Merken */ } }

const order = TEAMS.map(t => t[0])
const nameOf = Object.fromEntries(TEAMS)
const rankOf = Object.fromEntries(order.map((t, i) => [t, i + 1]))
const CFG = { rank: t => rankOf[t], hosts: HOSTS, nlABC: NL_WINNERS_ABC, nlD: NL_WINNERS_D, order }
const LABEL = { sieger: 'Q', zweiter: 'Q', gastgeber: 'G', playoff: 'PO', 'playoff-nl': 'PO*' }

const validDraw = g => g && Object.values(g).flat().length === order.length && Object.values(g).flat().every(t => nameOf[t])
let groups = GROUPS || load('euro2028-draw')
// Tipps gehören zu einer Auslosung: eigener Speicherplatz für die echten Gruppen, Neustart bei neuer Testauslosung
const TIPS = GROUPS ? 'euro2028-tips' : 'euro2028-results'
if (!GROUPS && !validDraw(groups)) { save('euro2028-draw', groups = drawGroups(order, SEPARATE, NO_CLASH)); save(TIPS, {}) }
let user = load(TIPS) || {}
let sim = null

const team = t => nameOf[t] + (HOSTS.includes(t) ? '<span class="tag">Gastgeber</span>' : '')
const pct = x => x > 1 - 1e-9 ? '100' : x >= 0.995 ? '>99' : x > 0 && x < 0.005 ? '<1' : Math.round(x * 100)
const diff = r => (r.tf - r.ta > 0 ? '+' : '') + (r.tf - r.ta)

function table(tab, q, range) {
  const head = ['#', 'Team', 'Sp', 'S', 'U', 'N', 'Tore', 'Diff', 'Pkt', 'Status']
  if (range) head.push('<abbr title="rechnerisch noch mögliche Plätze">Mögl.</abbr>')
  if (sim) head.push('<abbr title="Gruppensieg in % der Simulationsläufe">1.</abbr>', '<abbr title="EM-Ticket ohne Play-offs in %">EM</abbr>', '<abbr title="Play-offs in %">PO</abbr>')
  const rows = tab.map((r, i) => {
    const s = q.status[r.team], cells = [i + 1, team(r.team), r.sp, r.s, r.u, r.n, r.tf + ':' + r.ta, diff(r), '<b>' + r.pkt + '</b>', LABEL[s] || '–']
    if (range) cells.push(range[r.team][0] === range[r.team][1] ? range[r.team][0] + '.' : range[r.team].join('–'))
    if (sim) { const p = sim[r.team]; cells.push(pct(p.sieger), pct(p.sieger + p.zweiter + p.gastgeber), pct(p.playoff + p['playoff-nl'])) }
    return `<tr class="${s || ''}"><td>${cells.join('</td><td>')}</td></tr>`
  })
  return `<div class="scroll"><table><thead><tr><th>${head.join('</th><th>')}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`
}

function render() {
  const results = { ...user, ...RESULTS } // offizielle Ergebnisse haben Vorrang
  const q = qualify(groups, results, CFG)
  for (const [g, teams] of Object.entries(groups)) $('#tab-' + g).innerHTML = table(q.tabs[g], q, positionRange(teams, results))

  $('#seconds').innerHTML = `<table><thead><tr><th>#</th><th>Team</th><th>Gr.</th><th>Sp</th><th>Tore</th><th>Diff</th><th>Pkt</th><th>Status</th></tr></thead><tbody>${
    q.seconds.map((r, i) => `<tr class="${q.status[r.team]}${i === 7 ? ' cut' : ''}"><td>${i + 1}</td><td>${team(r.team)}</td><td>${r.g}</td><td>${r.sp}</td><td>${r.tf}:${r.ta}</td><td>${diff(r)}</td><td><b>${r.pkt}</b></td><td>${LABEL[q.status[r.team]]}</td></tr>`).join('')
  }</tbody></table>`

  const list = s => order.filter(t => q.status[t] === s).map(t => nameOf[t]).join(', ') || '–'
  const po = q.playoff, all = Object.values(groups).flatMap(matchesOf), open = all.filter(m => !results[m.id]).length
  $('#summary').innerHTML = `<h2>Wer wäre dabei? <span class="dim">(${open} von ${all.length} Spielen offen)</span></h2><ul>
    <li><b>Gruppensieger (12):</b> ${list('sieger')}</li>
    <li><b>Beste Gruppenzweite (8):</b> ${list('zweiter')}</li>
    <li><b>Reservierte Gastgeberplätze (${4 - po.berths} von 2 genutzt):</b> ${list('gastgeber')}</li>
    <li><b>Play-offs – ${po.size} Teams um ${po.berths} Tickets${po.berths === 4 ? ' (Hin- und Rückspiel)' : ''}:</b> ${po.teams.map(t => nameOf[t] + (q.status[t] === 'playoff-nl' ? '*' : '')).join(', ')}
      <span class="dim">(* über die Nations League 2026/27)</span></li></ul>`
}

function build() {
  $('#redraw').hidden = !!GROUPS
  $('#note').textContent = GROUPS
    ? 'Gruppen laut Auslosung vom 6.12.2026. Eigene Tipps in die Spiele eintragen – Tabellen, Zweiten-Rangliste und Play-offs rechnen sofort mit.'
    : 'Die echte Auslosung ist erst am 6.12.2026 – bis dahin steht hier eine Testauslosung aus den offiziellen Töpfen. Ergebnisse in die Spiele eintragen – alles rechnet sofort mit.'
  $('#groups').innerHTML = Object.entries(groups).map(([g, teams]) => `<section class="card"><h2>Gruppe ${g}</h2><div id="tab-${g}"></div>
    <details><summary>Spiele (${matchesOf(teams).length})</summary>${matchesOf(teams).map(m => {
      const r = RESULTS[m.id] || user[m.id], off = RESULTS[m.id] ? 'disabled title="offizielles Ergebnis"' : ''
      const inp = (t, v) => `<input type="number" min="0" max="99" inputmode="numeric" aria-label="Tore ${nameOf[t]}" value="${r ? r[v] : ''}" ${off}>`
      return `<div class="match" data-id="${m.id}"><span>${nameOf[m.h]}</span>${inp(m.h, 0)}<span>:</span>${inp(m.a, 1)}<span>${nameOf[m.a]}</span></div>`
    }).join('')}</details></section>`).join('')
  render()
}

$('#groups').addEventListener('input', e => {
  const row = e.target.closest('.match')
  if (!row) return
  const v = [...row.querySelectorAll('input')].map(i => i.value === '' ? NaN : Number(i.value))
  if (v.every(x => Number.isInteger(x) && x >= 0 && x <= 99)) user[row.dataset.id] = v; else delete user[row.dataset.id]
  save(TIPS, user)
  sim = null // alte Simulation passt nicht mehr zum Stand
  render()
})
$('#reset').addEventListener('click', () => { if (confirm('Alle eigenen Ergebnisse löschen?')) { save(TIPS, user = {}); sim = null; build() } })
$('#redraw').addEventListener('click', () => {
  if (Object.keys(user).length && !confirm('Neue Testauslosung? Eigene Ergebnisse werden gelöscht.')) return
  save('euro2028-draw', groups = drawGroups(order, SEPARATE, NO_CLASH)); save(TIPS, user = {}); sim = null; build()
})
$('#sim').addEventListener('click', () => { sim = simulate(groups, { ...user, ...RESULTS }, CFG); render() })

build()
