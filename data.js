// Daten zur EM-Qualifikation 2028. Quellen: UEFA-Auslosungsverfahren (Töpfe), Reglement 2026-28, siehe README.
// Klassisches Skript (kein Modul), damit index.html per Doppelklick ohne Server läuft.

// Reihenfolge = Zwischenrangliste der Nations League 2026/27 (Stand 17.11.2026).
// Sie ist zugleich Setzliste (Topf 1-4 je 12 Teams, Topf 5 sechs Teams) und letzter Tiebreaker.
const TEAMS = [
  ['ENG', 'England'], ['POR', 'Portugal'], ['FRA', 'Frankreich'], ['GER', 'Deutschland'], ['ESP', 'Spanien'], ['BEL', 'Belgien'],
  ['NED', 'Niederlande'], ['NOR', 'Norwegen'], ['GRE', 'Griechenland'], ['ITA', 'Italien'], ['DEN', 'Dänemark'], ['CRO', 'Kroatien'],
  ['WAL', 'Wales'], ['SRB', 'Serbien'], ['TUR', 'Türkei'], ['CZE', 'Tschechien'], ['SUI', 'Schweiz'], ['SWE', 'Schweden'],
  ['AUT', 'Österreich'], ['NIR', 'Nordirland'], ['SVN', 'Slowenien'], ['BIH', 'Bosnien-Herzegowina'], ['HUN', 'Ungarn'], ['IRL', 'Irland'],
  ['UKR', 'Ukraine'], ['SCO', 'Schottland'], ['KOS', 'Kosovo'], ['POL', 'Polen'], ['ISR', 'Israel'], ['ROU', 'Rumänien'],
  ['GEO', 'Georgien'], ['MKD', 'Nordmazedonien'], ['MNE', 'Montenegro'], ['ALB', 'Albanien'], ['ISL', 'Island'], ['SVK', 'Slowakei'],
  ['EST', 'Estland'], ['BLR', 'Belarus'], ['FRO', 'Färöer'], ['CYP', 'Zypern'], ['FIN', 'Finnland'], ['MDA', 'Moldau'],
  ['ARM', 'Armenien'], ['BUL', 'Bulgarien'], ['KAZ', 'Kasachstan'], ['LUX', 'Luxemburg'], ['LVA', 'Lettland'], ['SMR', 'San Marino'],
  ['MLT', 'Malta'], ['AZE', 'Aserbaidschan'], ['LTU', 'Litauen'], ['AND', 'Andorra'], ['GIB', 'Gibraltar'], ['LIE', 'Liechtenstein'],
]

// Gastgeber spielen die Qualifikation mit; zwei EM-Plätze sind für nicht direkt qualifizierte Gastgeber reserviert (Art. 14.04).
const HOSTS = ['ENG', 'IRL', 'SCO', 'WAL']

// Play-off-Nachrücker über die Nations League 2026/27 (Art. 16.02): Gruppensieger der Ligen A-C in Ranglistenfolge, dann bester aus Liga D.
const NL_WINNERS_ABC = ['ENG', 'POR', 'FRA', 'GER', 'SUI', 'SWE', 'AUT', 'NIR', 'MNE', 'ALB', 'ISL', 'SVK']
const NL_WINNERS_D = ['MLT', 'AZE']

// Auslosungsregeln laut UEFA-Verfahren. Die Testauslosung hält sie ein, die Seite zeigt sie je Team an.
const DRAW = {
  separate: [...HOSTS, 'NIR'], // nie zwei davon in einer Gruppe
  // Viertelfinals der Nations League (25.–30.3.2027): gelost werden Platzhalter „Sieger“/„Verlierer“ je Paarung.
  // Sieger nur in Vierergruppen (A–F). Verbotene Paarungen und Reiseregeln gelten für beide Teams einer Paarung.
  qf: [['ESP', 'FRA'], ['NOR', 'ENG'], ['NED', 'POR'], ['BEL', 'GER']],
  // Teilnehmer der Nations-League-Play-offs im März 2027: je Fünfergruppe höchstens einer davon oder ein Viertelfinal-Verlierer
  nlPlayoff: ['DEN', 'CRO', 'WAL', 'SRB', 'SVN', 'BIH', 'HUN', 'IRL', 'ISR', 'ROU', 'GEO', 'MKD', 'EST', 'BLR', 'FRO', 'CYP'],
  // nie in einer Gruppe (GIB–FRA folgt aus GIB–ESP über die Viertelfinal-Paarung)
  noClash: [['ARM', 'AZE'], ['BLR', 'UKR'], ['GIB', 'ESP'], ['GIB', 'FRA'], ['KOS', 'BIH'], ['KOS', 'SRB']],
  winter: ['EST', 'FRO', 'FIN', 'ISL', 'LVA', 'LTU', 'NOR'], // höchstens zwei pro Gruppe
  // übermäßige Reisedistanz: höchstens eine solche Paarung pro Gruppe (NOR und NED über ihre Viertelfinal-Paarung mit ENG bzw. POR)
  travel: [
    ...['AND', 'ENG', 'NOR', 'FRA', 'ESP', 'GIB', 'ISL', 'MLT', 'NIR', 'POR', 'NED', 'IRL', 'SCO', 'WAL'].map(t => ['KAZ', t]),
    ['AZE', 'ISL'], ['AZE', 'POR'], ['AZE', 'NED'], ['ISL', 'ARM'], ['ISL', 'CYP'],
  ],
  neutral: ['BLR', 'UKR'], // Heimspiele auf neutralem Platz
}

// Echte Auslosung: 6.12.2026, 18 Uhr, Belfast. Danach hier eintragen, z. B. { A: ['GER', 'TUR', 'POL', 'FIN'], ... }
// A-F = 4 Teams, G-L = 5 Teams. Solange null, lost die Seite eine Testauslosung aus.
const GROUPS = null

// Offizielle Ergebnisse: 'HEIM-GAST': [Tore Heim, Tore Gast]. Erste Spiele am 26.03.2027.
const RESULTS = {}

if (typeof module !== 'undefined') module.exports = { TEAMS, HOSTS, NL_WINNERS_ABC, NL_WINNERS_D, DRAW, GROUPS, RESULTS }
