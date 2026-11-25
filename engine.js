// Rechenkern: Gruppentabellen (Art. 15), Gesamtrangliste (Art. 23), Qualifikation (Art. 14/16), Szenarien.
// Ergebnisse: { 'HEIM-GAST': [toreHeim, toreGast] } – jede Paarung gibt es pro Gruppe genau einmal je Heimrecht.
// Klassisches Skript (kein Modul), damit index.html per Doppelklick ohne Server läuft.

const matchesOf = teams => teams.flatMap(h => teams.filter(a => a !== h).map(a => ({ h, a, id: h + '-' + a })))

// Statistik nur aus Spielen der übergebenen Teams untereinander
function stats(teams, results) {
  const s = {}
  for (const t of teams) s[t] = { team: t, sp: 0, s: 0, u: 0, n: 0, tf: 0, ta: 0, pkt: 0, atf: 0, aw: 0 }
  for (const h of teams) for (const a of teams) {
    const r = h !== a && results[h + '-' + a]
    if (!r) continue
    const [hg, ag] = r, H = s[h], A = s[a]
    H.sp++; A.sp++
    H.tf += hg; H.ta += ag; A.tf += ag; A.ta += hg; A.atf += ag
    if (hg > ag) { H.s++; A.n++; H.pkt += 3 }
    else if (hg < ag) { A.s++; H.n++; A.pkt += 3; A.aw++ }
    else { H.u++; A.u++; H.pkt++; A.pkt++ }
  }
  return s
}

const by = (...keys) => (x, y) => { for (const k of keys) { const d = k(y) - k(x); if (d) return d } return 0 }

// aufeinanderfolgende gleichrangige Einträge einer sortierten Liste bündeln
const chunks = (sorted, cmp) => sorted.reduce((out, x) => {
  const last = out[out.length - 1]
  if (last && cmp(last[0], x) === 0) last.push(x); else out.push([x])
  return out
}, [])

// Art. 15.01 e–i (Tordifferenz, Tore, Auswärtstore, Siege, Auswärtssiege), dann k (Nations-League-Rang).
// shortcut: Fairplay-Wertung (j, Karten) wird nicht erfasst und übersprungen; nachrüsten, falls je zwei Teams bis dorthin gleich sind.
const overall = (st, rank) => by(t => st[t].tf - st[t].ta, t => st[t].tf, t => st[t].atf, t => st[t].s, t => st[t].aw, t => -rank(t))

// Tabelle einer Gruppe nach Art. 15. rank(team) = Nations-League-Rang (kleiner = besser).
// Das Reglement gilt formal erst nach dem letzten Spieltag; Zwischenstände nach denselben Kriterien sind Konvention.
function standings(teams, results, rank = () => 0) {
  const all = stats(teams, results)
  const split = tied => {
    if (tied.length < 2) return tied
    const h = stats(tied, results) // a–c: direkter Vergleich, alle drei Kriterien vor einer Neuanwendung
    const c = by(t => h[t].pkt, t => h[t].tf - h[t].ta, t => h[t].tf)
    const parts = chunks([...tied].sort(c), c)
    // d: trennt der direkte Vergleich nur teilweise, wird er unter den Verbliebenen neu angewandt;
    // trennt er gar nicht, gelten e–k der Reihe nach (wörtliche Lesart, kein Rücksprung zum direkten Vergleich)
    return parts.length === 1 ? tied.sort(overall(all, rank)) : parts.flatMap(split)
  }
  const pts = by(t => all[t].pkt)
  return chunks([...teams].sort(pts), pts).flatMap(split).map(t => all[t])
}

// Wer ist (Stand jetzt) qualifiziert? cfg: { rank, hosts, nlABC, nlD, order }
// status[team]: 'sieger' | 'zweiter' (direkt) | 'gastgeber' (reservierter Platz) | 'playoff' | 'playoff-nl' | undefined (raus)
function qualify(groups, results, cfg) {
  const tabs = {}, ranking = []
  for (const [g, teams] of Object.entries(groups)) {
    const tab = tabs[g] = standings(teams, results, cfg.rank)
    // Art. 23.01: in Fünfergruppen zählen für die Plätze 1–4 die Spiele gegen den Fünften nicht
    const cut = teams.length > 4 ? stats(tab.slice(0, 4).map(r => r.team), results) : null
    tab.forEach((row, i) => ranking.push({ ...(cut && i < 4 ? cut[row.team] : row), g, pos: i + 1 }))
  }
  // Art. 23.01 a–i ohne h (Fairplay, siehe shortcut oben)
  ranking.sort(by(e => -e.pos, e => e.pkt, e => e.tf - e.ta, e => e.tf, e => e.atf, e => e.s, e => e.aw, e => -cfg.rank(e.team)))
  const seconds = ranking.filter(e => e.pos === 2)
  const status = {}
  for (const e of ranking) if (e.pos === 1) status[e.team] = 'sieger'
  for (const e of seconds.slice(0, 8)) status[e.team] = 'zweiter'
  // Art. 14.04: zwei Plätze für die bestplatzierten Gastgeber, die nicht direkt qualifiziert sind
  const reserved = ranking.filter(e => cfg.hosts.includes(e.team) && !status[e.team]).slice(0, 2)
  for (const e of reserved) status[e.team] = 'gastgeber'
  // Art. 16.01: 2 Plätze vergeben -> 8 Teams/2 Tickets, 1 -> 12 Teams/3 Tickets, 0 -> 8 Teams/4 Tickets
  const size = reserved.length === 1 ? 12 : 8
  const teams = seconds.slice(8).map(e => e.team).filter(t => !status[t])
  for (const t of teams) status[t] = 'playoff'
  // Art. 16.02 b–d: auffüllen über die Nations League
  const fill = list => { for (const t of list) if (teams.length < size && !status[t]) { status[t] = 'playoff-nl'; teams.push(t) } }
  fill(cfg.nlABC)
  fill(cfg.nlD.filter(t => !status[t]).slice(0, 1))
  fill(cfg.order)
  return { tabs, ranking, seconds, status, playoff: { size, berths: 4 - reserved.length, teams } }
}

// Welche Plätze sind in einer Gruppe rechnerisch noch möglich? Zählt alle Sieg/Remis/Niederlage-Kombinationen der offenen Spiele durch.
// shortcut: nur nach Punkten – Punktgleichheit gilt als „beides möglich“, also vorsichtig (nie zu früh „sicher“).
// Bei mehr als maxOpen offenen Spielen (3^n Kombinationen) oder abgeschlossener Gruppe: null.
function positionRange(teams, results, maxOpen = 10) {
  const open = matchesOf(teams).filter(m => !results[m.id])
  if (!open.length || open.length > maxOpen) return null
  const base = stats(teams, results), pts = teams.map(t => base[t].pkt), ix = Object.fromEntries(teams.map((t, i) => [t, i]))
  const range = teams.map(() => [teams.length, 1])
  const rec = k => {
    if (k === open.length) {
      pts.forEach((p, i) => {
        range[i][0] = Math.min(range[i][0], 1 + pts.filter(q => q > p).length)
        range[i][1] = Math.max(range[i][1], pts.filter(q => q >= p).length)
      })
      return
    }
    const h = ix[open[k].h], a = ix[open[k].a]
    pts[h] += 3; rec(k + 1); pts[h] -= 3
    pts[h]++; pts[a]++; rec(k + 1); pts[h]--; pts[a]--
    pts[a] += 3; rec(k + 1); pts[a] -= 3
  }
  rec(0)
  return Object.fromEntries(teams.map((t, i) => [t, range[i]]))
}

const pois = (lam, rnd) => { let k = 0, p = Math.exp(-lam), u = rnd(); while (u > p && k < 15) { u -= p; p *= lam / ++k } return k }

// Monte-Carlo über alle offenen Spiele. Liefert je Team die Anteile der Status aus qualify() (plus 'raus').
// Spielstärke grob aus dem Nations-League-Rang, Tore Poisson-verteilt mit Heimvorteil – ein Rechenmodell, keine Prognose.
function simulate(groups, results, cfg, n = 2000, rnd = Math.random) {
  const open = Object.values(groups).flatMap(matchesOf).filter(m => !results[m.id])
  const last = cfg.order.length - 1, out = {}
  for (const t of Object.values(groups).flat()) out[t] = { sieger: 0, zweiter: 0, gastgeber: 0, playoff: 0, 'playoff-nl': 0, raus: 0 }
  for (let i = 0; i < n; i++) {
    const r = { ...results }
    for (const m of open) {
      const d = (cfg.rank(m.a) - cfg.rank(m.h)) / last
      r[m.id] = [pois(1.45 * Math.exp(d), rnd), pois(1.15 * Math.exp(-d), rnd)]
    }
    const { status } = qualify(groups, r, cfg)
    for (const t in out) out[t][status[t] || 'raus'] += 1 / n
  }
  return out
}

// Testauslosung: Topf 1–4 auf A–L, Topf 5 auf G–L; SEPARATE-Teams und verbotene Paarungen nie in einer Gruppe.
// shortcut: Winterspielorte, Reisedistanzen und Nations-League-Platzhalter des echten Verfahrens bleiben unberücksichtigt;
// entfällt, sobald die echte Auslosung in data.js steht.
function drawGroups(order, separate, noClash, rnd = Math.random) {
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  const bad = g => g.filter(t => separate.includes(t)).length > 1 || noClash.some(([x, y]) => g.includes(x) && g.includes(y))
  for (;;) {
    const pots = [0, 12, 24, 36, 48].map(i => shuffle(order.slice(i, i + 12)))
    const gs = pots[0].map((_, i) => pots.map((p, k) => k < 4 ? p[i] : p[i - 6]).filter(Boolean))
    if (!gs.some(bad)) return Object.fromEntries(gs.map((g, i) => ['ABCDEFGHIJKL'[i], g]))
  }
}

if (typeof module !== 'undefined') module.exports = { matchesOf, stats, standings, qualify, positionRange, simulate, drawGroups }
