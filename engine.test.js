const test = require('node:test')
const assert = require('node:assert/strict')
const { standings, stats, matchesOf, qualify, positionRange, simulate, drawGroups } = require('./engine.js')
const D = require('./data.js')

const order = (teams, results, rank) => standings(teams, results, rank).map(r => r.team)
const codes = D.TEAMS.map(t => t[0])
const CFG = { rank: t => codes.indexOf(t) + 1, hosts: D.HOSTS, nlABC: D.NL_WINNERS_ABC, nlD: D.NL_WINNERS_D, order: codes }
// feste Gruppen strikt nach Setzliste: A = Rang 1, 13, 25, 37 ... L = Rang 12, 24, 36, 48, 54
const SEEDED = Object.fromEntries([...'ABCDEFGHIJKL'].map((g, i) =>
  [g, [codes[i], codes[12 + i], codes[24 + i], codes[36 + i], ...(i > 5 ? [codes[42 + i]] : [])]]))

test('Daten: 54 Teams, eindeutig, alle Verweise bekannt', () => {
  assert.equal(codes.length, 54)
  assert.equal(new Set(codes).size, 54)
  // Regeldaten festnageln: der Auslosungstest prüft nur gegen DRAW selbst
  assert.deepEqual(D.DRAW.separate, ['ENG', 'IRL', 'SCO', 'WAL', 'NIR'])
  assert.deepEqual([D.DRAW.nlPlayoff, D.DRAW.noClash, D.DRAW.winter, D.DRAW.travel].map(x => x.length), [16, 6, 7, 19])
  assert.ok(D.DRAW.qf.flat().every(t => codes.indexOf(t) < 12)) // alle Viertelfinalisten in Topf 1
  for (const t of [...D.HOSTS, ...D.NL_WINNERS_ABC, ...D.NL_WINNERS_D, ...Object.values(D.DRAW).flat(2)]) assert.ok(codes.includes(t), t)
})

test('Doppelrunde: 4er-Gruppe hat 12 Spiele, 5er-Gruppe 20', () => {
  assert.equal(matchesOf(['A', 'B', 'C', 'D']).length, 12)
  assert.equal(matchesOf(['A', 'B', 'C', 'D', 'E']).length, 20)
})

test('Punkte, Tore und Auswärtswerte werden korrekt gezählt', () => {
  const s = stats(['A', 'B'], { 'A-B': [1, 3], 'B-A': [2, 2] })
  assert.deepEqual(s.B, { team: 'B', sp: 2, s: 1, u: 1, n: 0, tf: 5, ta: 3, pkt: 4, atf: 3, aw: 1 })
  assert.equal(s.A.pkt, 1)
  assert.equal(s.A.atf, 2)
})

test('direkter Vergleich schlägt die Gesamt-Tordifferenz', () => {
  // A und B je 6 Punkte; A hat +8, B nur +2 – aber B gewann das direkte Duell
  const r = { 'B-A': [1, 0], 'A-C': [5, 0], 'A-D': [4, 0], 'B-C': [1, 0], 'C-B': [1, 0], 'B-D': [1, 0] }
  assert.deepEqual(order(['A', 'B', 'C', 'D'], r).slice(0, 2), ['B', 'A'])
})

test('Dreiervergleich: nach Abtrennung eines Teams wird a–c unter den Verbliebenen neu angewandt', () => {
  // A, B, C je 10 Punkte. Im Dreiervergleich: A 9 Pkt, B und C je 4 Pkt, -3, 1 Tor.
  // Nur B gegen C: B 4 Pkt, C 1 Pkt -> B vor C, obwohl C die klar bessere Gesamt-Tordifferenz hat.
  const r = {
    'A-B': [2, 0], 'B-A': [0, 2], 'A-C': [3, 0], 'C-A': [1, 0], 'B-C': [1, 0], 'C-B': [0, 0],
    'A-D': [0, 0], 'D-A': [1, 0], 'B-D': [1, 0], 'D-B': [0, 1], 'C-D': [5, 0], 'D-C': [0, 5],
  }
  const tab = standings(['C', 'B', 'A', 'D'], r)
  assert.deepEqual(tab.map(x => x.pkt), [10, 10, 10, 4])
  assert.deepEqual(tab.map(x => x.team), ['A', 'B', 'C', 'D'])
})

test('a–c werden komplett angewandt, bevor neu verglichen wird (Präzedenz EM 2024, Gruppe E)', () => {
  // alle vier 4 Punkte; ROU und BEL beide +1, BEL schlug ROU 2:0 – trotzdem ROU vorn wegen mehr Toren
  const r = { 'ROU-UKR': [3, 0], 'BEL-SVK': [0, 1], 'SVK-UKR': [1, 2], 'BEL-ROU': [2, 0], 'SVK-ROU': [1, 1], 'UKR-BEL': [0, 0] }
  assert.deepEqual(order(['BEL', 'SVK', 'ROU', 'UKR'], r), ['ROU', 'BEL', 'SVK', 'UKR'])
})

test('völliger Gleichstand: Gesamt-Tordifferenz, dann Nations-League-Rang', () => {
  const rank = t => ({ A: 3, B: 1, C: 2 })[t]
  assert.deepEqual(order(['A', 'B', 'C'], {}, rank), ['B', 'C', 'A'])
  // A-B 1:1 und B-A 1:1 -> direkter Vergleich gleich; A schlägt C höher als B
  const r = { 'A-B': [1, 1], 'B-A': [1, 1], 'A-C': [3, 0], 'B-C': [1, 0] }
  assert.deepEqual(order(['A', 'B', 'C'], r, rank), ['A', 'B', 'C'])
})

test('Art. 23: Spiele gegen den Fünften zählen im Gruppenvergleich nicht', () => {
  const groups = { A: ['a1', 'a2', 'a3', 'a4'], G: ['g1', 'g2', 'g3', 'g4', 'g5'] }
  const r = { 'a1-a3': [2, 0], 'a2-a3': [1, 0], 'g1-g5': [1, 0], 'g5-g1': [0, 1], 'g1-g3': [1, 0], 'g2-g5': [9, 0], 'g5-g2': [0, 9] }
  const q = qualify(groups, r, { rank: () => 0, hosts: [], nlABC: [], nlD: [], order: [] })
  assert.deepEqual(q.tabs.G.map(x => x.team), ['g1', 'g2', 'g4', 'g3', 'g5'])
  assert.equal(q.tabs.G[1].pkt, 6) // in der Gruppentabelle zählen alle Spiele
  assert.deepEqual(q.seconds.map(e => [e.team, e.pkt, e.sp]), [['a2', 3, 1], ['g2', 0, 0]])
})

test('Qualifikation ohne Ergebnisse: 20 direkt, 2 Gastgeberplätze, Play-offs 8 Teams um 2 Tickets', () => {
  const q = qualify(SEEDED, {}, CFG)
  const having = s => codes.filter(t => q.status[t] === s)
  assert.deepEqual(having('sieger'), codes.slice(0, 12))
  assert.deepEqual(having('zweiter'), codes.slice(12, 20))
  assert.deepEqual(having('gastgeber'), ['IRL', 'SCO']) // IRL verlässt als Zweiter die Play-offs, SCO ist Dritter
  assert.deepEqual(q.playoff, { size: 8, berths: 2, teams: ['SVN', 'BIH', 'HUN', 'MNE', 'ALB', 'ISL', 'SVK', 'MLT'] })
  assert.equal(codes.filter(t => q.status[t]).length, 30)
})

test('ein Gastgeberplatz genutzt: 12 Teams um 3 Tickets, Auffüllen nach Art. 16.02 b–d', () => {
  // SCO gewinnt Gruppe B -> nur IRL braucht einen reservierten Platz; POR ist nicht mehr unter den ersten zwei
  const q = qualify(SEEDED, { 'SCO-POR': [1, 0], 'SCO-SRB': [1, 0] }, CFG)
  assert.equal(q.status.SCO, 'sieger')
  assert.equal(q.status.IRL, 'gastgeber')
  assert.deepEqual(q.playoff, { size: 12, berths: 3, teams: ['BIH', 'HUN', 'BLR', 'POR', 'MNE', 'ALB', 'ISL', 'SVK', 'MLT', 'SRB', 'UKR', 'KOS'] })
})

test('kein Gastgeberplatz genutzt: 8 Teams um 4 Tickets', () => {
  const q = qualify(SEEDED, { 'SCO-POR': [1, 0], 'SCO-SRB': [1, 0], 'IRL-CRO': [1, 0] }, CFG)
  assert.deepEqual(D.HOSTS.map(t => q.status[t]), ['sieger', 'sieger', 'sieger', 'zweiter'])
  assert.deepEqual(q.playoff, { size: 8, berths: 4, teams: ['BIH', 'HUN', 'SVK', 'BLR', 'POR', 'MNE', 'ALB', 'ISL'] })
})

test('mehr als zwei Gastgeber scheitern: nur die zwei Bestplatzierten bekommen einen Platz', () => {
  // ENG und WAL (beide Gruppe A) verlieren alles, SCO und IRL bleiben wie gesetzt
  const r = {}
  for (const t of ['UKR', 'EST']) for (const h of ['ENG', 'WAL']) { r[t + '-' + h] = [1, 0]; r[h + '-' + t] = [0, 1] }
  const q = qualify(SEEDED, r, CFG)
  assert.deepEqual(D.HOSTS.filter(t => q.status[t] === 'gastgeber'), ['IRL', 'SCO']) // Zweiter und Dritter vor Dritter/Vierter
  assert.ok(!['sieger', 'zweiter', 'gastgeber'].includes(q.status.WAL))
  assert.equal(q.status.ENG, 'playoff-nl') // als Nations-League-Gruppensieger weiter im Rennen
})

test('mögliche Platzierungen: Durchzählen der offenen Spiele', () => {
  const r = { 'A-B': [1, 0], 'B-A': [0, 1], 'A-C': [1, 0], 'C-A': [0, 1] } // offen: B-C, C-B
  assert.deepEqual(positionRange(['A', 'B', 'C'], r), { A: [1, 1], B: [2, 3], C: [2, 3] })
  assert.equal(positionRange(['A', 'B', 'C', 'D', 'E'], {}), null) // 20 offene Spiele: zu viele
  assert.equal(positionRange(['A', 'B'], { 'A-B': [1, 0], 'B-A': [0, 0] }), null) // abgeschlossen
})

test('Testauslosung hält alle Auslosungsregeln ein', () => {
  const R = D.DRAW, n = (g, list) => g.filter(t => list.includes(t)).length
  for (let i = 0; i < 200; i++) {
    const g = drawGroups(codes, R), five = Object.values(g).slice(6)
    assert.deepEqual(Object.values(g).map(x => x.length), [4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5])
    assert.equal(new Set(Object.values(g).flat()).size, 54)
    for (const teams of Object.values(g)) {
      teams.forEach((t, k) => assert.equal(Math.floor(codes.indexOf(t) / 12), k)) // je ein Team pro Topf
      assert.ok(n(teams, R.separate) <= 1)
      assert.ok(n(teams, R.winter) <= 2)
      assert.ok(R.noClash.every(p => n(teams, p) < 2))
      assert.ok(R.travel.filter(p => n(teams, p) === 2).length <= 1)
    }
    for (const teams of five) assert.ok(n(teams, [...R.nlPlayoff, ...R.qf.flat()]) <= 1) // Nations-League-Teams
    for (const p of R.qf) assert.ok(five.every(teams => n(teams, p) === 0) || five.filter(teams => n(teams, p)).length === 1) // Sieger passt in A–F
  }
})

test('Simulation: Anteile je Team ergeben 1, je Lauf 12 Gruppensieger und 24 EM-/Play-off-Kandidaten im Soll', () => {
  const sim = simulate(SEEDED, { 'GER-CZE': [2, 1] }, CFG, 40)
  const sum = k => codes.reduce((a, t) => a + sim[t][k], 0)
  for (const t of codes) assert.ok(Math.abs(Object.values(sim[t]).reduce((a, b) => a + b) - 1) < 1e-9)
  assert.ok(Math.abs(sum('sieger') - 12) < 1e-9)
  assert.ok(Math.abs(sum('zweiter') - 8) < 1e-9)
  assert.ok(sim.ENG.sieger > sim.EST.sieger) // Favorit vor Topf-4-Team derselben Gruppe
})
