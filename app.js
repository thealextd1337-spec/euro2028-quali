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
let groups = GROUPS || load('euro2028-auslosung')
// Tipps gehören zu einer Auslosung: eigener Speicherplatz für die echten Gruppen, Neustart bei neuer Testauslosung
const TIPS = GROUPS ? 'euro2028-tips' : 'euro2028-results'
if (!GROUPS && !validDraw(groups)) { save('euro2028-auslosung', groups = drawGroups(order, DRAW)); save(TIPS, {}) }
let user = load(TIPS) || {}
let sim = null
let pick = load('euro2028-team')
if (!nameOf[pick]) pick = ''

const team = t => nameOf[t] + (HOSTS.includes(t) ? '<span class="tag">Gastgeber</span>' : '')
const pct = x => x > 1 - 1e-9 ? '100' : x >= 0.995 ? '>99' : x > 0 && x < 0.005 ? '<1' : Math.round(x * 100)
const pot = t => Math.ceil(rankOf[t] / 12)
const me = t => t === pick ? ' me' : ''
const STATUS = {
  sieger: 'direkt qualifiziert als Gruppensieger', zweiter: 'direkt qualifiziert als einer der acht besten Gruppenzweiten',
  gastgeber: 'über einen reservierten Gastgeberplatz dabei', playoff: 'in den Play-offs (als Gruppenzweiter)', 'playoff-nl': 'in den Play-offs (über die Nations League)',
}
const names = list => list.map(t => nameOf[t]).join(', ')
// Welchen Regeln des UEFA-Auslosungsverfahrens unterliegt ein Team? (Daten: DRAW in data.js)
function drawRules(t) {
  const partners = list => list.filter(p => p.includes(t)).map(p => p.find(x => x !== t)), qf = DRAW.qf.find(p => p.includes(t))
  // Viertelfinalisten werden als Platzhalter gelost: ihre Sperren treffen auch den Viertelfinalgegner (z. B. KAZ–NOR über England)
  const both = list => [t, ...list].some(x => DRAW.qf.flat().includes(x)) ? ' Bei Viertelfinalisten der Nations League gilt das für beide Teams der Paarung, weil nur Platzhalter gelost werden.' : ''
  const out = [pot(t) < 5
    ? `<b>Topf ${pot(t)}:</b> Aus diesem Topf kommt genau ein Team in jede Gruppe – kein Gegner aus dem eigenen Topf.`
    : '<b>Topf 5:</b> kommt sicher in eine Fünfergruppe (G–L) und spielt damit acht Partien ab März 2027.']
  if (qf) out.push(`<b>Nations-League-Viertelfinale:</b> wird nur als Platzhalter „Sieger“ oder „Verlierer“ von ${qf.map(x => nameOf[x]).join(' – ')} gelost. Der Sieger kommt in eine Vierergruppe (A–F, Start im September 2027), der Verlierer in eine beliebige Gruppe – in einer Fünfergruppe aber als einziges Team, das im März 2027 noch Nations League spielt. Die Gruppe steht erst nach dem Viertelfinale Ende März 2027 fest. Verbotene Paarungen und Reiseregeln gelten für beide Teams der Paarung.`)
  if (DRAW.nlPlayoff.includes(t)) out.push('<b>Nations-League-Play-offs im März 2027:</b> In einer Fünfergruppe (G–L) darf höchstens ein Play-off-Teilnehmer oder Viertelfinal-Verlierer stehen. ' + (pot(t) > 1
    ? 'Die meisten dieser Teams landen deshalb in einer Vierergruppe (A–F).'
    : 'In Topf 1 sind aber vier der sechs Plätze in A–F für die Viertelfinal-Sieger reserviert – eine Fünfergruppe ist hier wahrscheinlicher.'))
  if (DRAW.separate.includes(t)) out.push(`<b>Gastgebertrennung:</b> nie in einer Gruppe mit ${names(DRAW.separate.filter(x => x !== t))}.${t === 'NIR' ? ' Nordirland ist kein Gastgeber, wird aber genauso getrennt.' : ''}`)
  if (partners(DRAW.noClash).length) out.push(`<b>Verbotene Paarung:</b> nie in einer Gruppe mit ${names(partners(DRAW.noClash))}.${both(partners(DRAW.noClash))}`)
  if (DRAW.winter.includes(t)) out.push(`<b>Winterspielort:</b> höchstens zwei dieser Teams pro Gruppe: ${names(DRAW.winter)}.`)
  if (partners(DRAW.travel).length) out.push(`<b>Reisedistanz:</b> zählt in der Auslosung als übermäßig weite Anreise gegen ${names(partners(DRAW.travel))}. Pro Gruppe ist höchstens eine solche Paarung erlaubt.${both(partners(DRAW.travel))}`)
  if (DRAW.neutral.includes(t)) out.push('<b>Neutraler Platz:</b> trägt seine Heimspiele auf neutralem Boden aus.')
  if (out.length === 1) out.push('Keine Sonderregeln – kann mit jedem Team der anderen Töpfe in eine Gruppe kommen.')
  return out
}
const diff = r => (r.tf - r.ta > 0 ? '+' : '') + (r.tf - r.ta)

function table(tab, q, range) {
  const head = ['#', 'Team', 'Sp', 'S', 'U', 'N', 'Tore', 'Diff', 'Pkt', 'Status']
  if (range) head.push('<abbr title="rechnerisch noch mögliche Plätze">Mögl.</abbr>')
  if (sim) head.push('<abbr title="Gruppensieg in % der Simulationsläufe">1.</abbr>', '<abbr title="EM-Ticket ohne Play-offs in %">EM</abbr>', '<abbr title="Play-offs in %">PO</abbr>')
  const rows = tab.map((r, i) => {
    const s = q.status[r.team], cells = [i + 1, team(r.team), r.sp, r.s, r.u, r.n, r.tf + ':' + r.ta, diff(r), '<b>' + r.pkt + '</b>', LABEL[s] || '–']
    if (range) cells.push(range[r.team][0] === range[r.team][1] ? range[r.team][0] + '.' : range[r.team].join('–'))
    if (sim) { const p = sim[r.team]; cells.push(pct(p.sieger), pct(p.sieger + p.zweiter + p.gastgeber), pct(p.playoff + p['playoff-nl'])) }
    return `<tr class="${(s || '') + me(r.team)}"><td>${cells.join('</td><td>')}</td></tr>`
  })
  return `<div class="scroll"><table><thead><tr><th>${head.join('</th><th>')}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`
}

function render() {
  const results = { ...user, ...RESULTS } // offizielle Ergebnisse haben Vorrang
  const q = qualify(groups, results, CFG)
  const ranges = {}, groupOf = {}
  for (const [g, teams] of Object.entries(groups)) {
    $('#tab-' + g).innerHTML = table(q.tabs[g], q, ranges[g] = positionRange(teams, results))
    for (const t of teams) groupOf[t] = g
  }

  // gewähltes Team: Lage in Worten
  const g = groupOf[pick], card = $('#team')
  card.hidden = !g
  if (g) {
    const tab = q.tabs[g], pos = tab.findIndex(r => r.team === pick), r = tab[pos], range = ranges[g], p = sim && sim[pick]
    card.innerHTML = `<h2>${team(pick)} <span class="dim">Topf ${pot(pick)} · Platz ${rankOf[pick]} der Setzliste · <a href="#g-${g}">Gruppe ${g}</a></span></h2><ul>
      <li><b>Stand jetzt:</b> Platz ${pos + 1} von ${tab.length} mit ${r.pkt} ${r.pkt === 1 ? 'Punkt' : 'Punkten'} aus ${r.sp} ${r.sp === 1 ? 'Spiel' : 'Spielen'} (${r.tf}:${r.ta} Tore) – ${STATUS[q.status[pick]] || 'nicht qualifiziert'}</li>
      <li><b>Gegner:</b> ${groups[g].filter(t => t !== pick).map(t => `${nameOf[t]} (Topf ${pot(t)})`).join(', ')}</li>
      ${range ? `<li><b>Rechnerisch noch möglich:</b> Platz ${range[pick][0] === range[pick][1] ? range[pick][0] : range[pick].join('–')}</li>` : ''}
      <li><b>Simulation:</b> ${p ? `EM-Ticket ohne Play-offs ${pct(p.sieger + p.zweiter + p.gastgeber)} % (davon Gruppensieg ${pct(p.sieger)} %), Play-offs ${pct(p.playoff + p['playoff-nl'])} %, ausgeschieden ${pct(p.raus)} %` : '„Simulation starten“ zeigt die Chancen in Prozent – nach neuen Ergebnissen erneut starten.'}</li></ul>
      <h3>Auslosungsregeln für ${nameOf[pick]}</h3><ul>${drawRules(pick).map(x => `<li>${x}</li>`).join('')}</ul>`
  }

  $('#pots').innerHTML = [0, 12, 24, 36, 48].map((s, i) => `<div><h3>Topf ${i + 1}</h3><ol start="${s + 1}">${
    order.slice(s, s + 12).map(t => `<li class="${me(t)}"><button class="link" data-team="${t}" title="als mein Team wählen">${team(t)}</button> <span class="dim">Gr. ${groupOf[t] || '?'}</span></li>`).join('')}</ol></div>`).join('')

  $('#seconds').innerHTML = `<table><thead><tr><th>#</th><th>Team</th><th>Gr.</th><th>Sp</th><th>Tore</th><th>Diff</th><th>Pkt</th><th>Status</th></tr></thead><tbody>${
    q.seconds.map((r, i) => `<tr class="${q.status[r.team]}${i === 7 ? ' cut' : ''}${me(r.team)}"><td>${i + 1}</td><td>${team(r.team)}</td><td>${r.g}</td><td>${r.sp}</td><td>${r.tf}:${r.ta}</td><td>${diff(r)}</td><td><b>${r.pkt}</b></td><td>${LABEL[q.status[r.team]]}</td></tr>`).join('')
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
  $('#groups').innerHTML = Object.entries(groups).map(([g, teams]) => `<section class="card" id="g-${g}"><h2>Gruppe ${g}</h2><div id="tab-${g}"></div>
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
  save('euro2028-auslosung', groups = drawGroups(order, DRAW)); save(TIPS, user = {}); sim = null; build()
})
$('#sim').addEventListener('click', () => { sim = simulate(groups, { ...user, ...RESULTS }, CFG); render() })
$('#pick').addEventListener('change', e => {
  save('euro2028-team', pick = e.target.value)
  render()
})
$('#pots').addEventListener('click', e => {
  const b = e.target.closest('button')
  if (!b) return
  save('euro2028-team', pick = $('#pick').value = b.dataset.team)
  render()
  $('#team').scrollIntoView({ behavior: 'smooth' })
})

$('#pick').innerHTML = '<option value="">– Team wählen –</option>' + [...TEAMS].sort((a, b) => a[1].localeCompare(b[1], 'de'))
  .map(([c, n]) => `<option value="${c}"${c === pick ? ' selected' : ''}>${n}</option>`).join('')
build()
