# EM-Qualifikation 2028 – Gruppenrechner

Rechner und Auswertung für die Qualifikationsgruppen zur UEFA EURO 2028: Tabellen nach den offiziellen
Tiebreakern, Rangliste der Gruppenzweiten, Gastgeberplätze, Play-off-Feld und Szenarien für offene Spiele.

## Benutzen

`index.html` im Browser öffnen (Doppelklick genügt, kein Server, keine Installation).

- **Spiele** einer Gruppe aufklappen und Ergebnisse eintragen – alles rechnet sofort mit. Eingaben bleiben im Browser gespeichert.
- **Simulation starten** spielt alle offenen Spiele 2000-mal durch und zeigt je Team die Anteile für Gruppensieg, EM-Ticket ohne Play-offs und Play-offs.
- **Mögl.** zeigt die rechnerisch noch erreichbaren Plätze, sobald in einer Gruppe höchstens 10 Spiele offen sind.

Tests: `npm test` (Node 18+, keine Abhängigkeiten).

## Stand der Daten (25.11.2026)

- Die Auslosung ist am **6.12.2026** in Belfast. Bis dahin lost die Seite eine **Testauslosung** aus den offiziellen Töpfen.
- Danach die echten Gruppen in `data.js` bei `GROUPS` eintragen, offizielle Ergebnisse bei `RESULTS` (erste Spiele 26.03.2027).
- Acht Topf-1-Plätze werden als Platzhalter gelost (Sieger/Verlierer der Nations-League-Viertelfinals ESP–FRA, NOR–ENG,
  NED–POR, BEL–GER) und stehen erst Ende März 2027 fest. Bis dahin für diese Plätze eine Annahme eintragen.

## Umgesetzte Regeln (UEFA-Reglement 2026-28)

- 54 Teams, 12 Gruppen: A–F mit vier, G–L mit fünf Teams, Hin- und Rückspiel.
- **Gruppentabelle (Art. 15):** Punkte; bei Gleichstand direkter Vergleich (Punkte, Tordifferenz, Tore), bei Teilentscheid
  erneut nur unter den Verbliebenen; dann Tordifferenz, Tore, Auswärtstore, Siege, Auswärtssiege, Nations-League-Rang.
- **Gruppenvergleich (Art. 23):** Platz, Punkte, Tordifferenz, Tore, Auswärtstore, Siege, Auswärtssiege, Nations-League-Rang.
  In Fünfergruppen zählen für die Plätze 1–4 die Spiele gegen den Fünften nicht.
- **Direkt qualifiziert (Art. 14.03):** 12 Gruppensieger und die 8 besten Zweiten.
- **Gastgeber (Art. 14.04):** England, Irland, Schottland und Wales spielen mit. Zwei Plätze sind für die bestplatzierten
  Gastgeber reserviert, die sich nicht direkt qualifizieren.
- **Play-offs (Art. 16):** je nach genutzten Gastgeberplätzen 8 Teams um 2 Tickets, 12 um 3 oder 8 um 4. Dabei sind die übrigen
  Gruppenzweiten, aufgefüllt über die Nations League 2026/27 (Gruppensieger der Ligen A–C, dann der beste aus Liga D, dann nach Rangliste).

## Grenzen

- Die Fairplay-Wertung (Karten) wird nicht erfasst; an dieser Stelle entscheidet direkt der Nations-League-Rang.
- Das Reglement gilt formal erst nach dem letzten Spieltag. Zwischenstände nach denselben Kriterien sind Konvention.
- „Mögl.“ rechnet nur mit Punkten und wertet Punktgleichheit als offen – eher zu vorsichtig als zu früh „sicher“.
- Die Simulation ist ein einfaches Modell (Spielstärke aus dem Nations-League-Rang, Poisson-Tore, Heimvorteil), keine Prognose.
  Die Play-off-Spiele selbst werden nicht simuliert.
- Die Testauslosung beachtet Töpfe, Gastgebertrennung und verbotene Paarungen, nicht aber Winterspielorte und Reisedistanzen.
- Kein Spielplan: UEFA verteilt ihn erst ab dem 7.12.2026. Die Spiele stehen deshalb ohne Datum und Spieltag da.

## Quellen

- [UEFA-Reglement der Europameisterschaft 2026-28](https://documents.uefa.com/r/Regulations-of-the-UEFA-European-Football-Championship-2026-28-Online)
- [UEFA-Auslosungsverfahren (Töpfe, Sperren)](https://editorial.uefa.com/resources/02ab-221968265425-d5c7eee03b62-1000/eq_draw_procedure.pdf)
- [UEFA: Alles zur Auslosung](https://www.uefa.com/euro2028/news/02ab-222391e639b1-eada623fd7a9-1000--uefa-euro-2028-qualifying-group-stage-draw-all-you-need-to/)
- [UEFA-Rundschreiben 58/2026 (Spieltage)](https://editorial.uefa.com/resources/02a9-219f1f402437-f40293ffae95-1000/20260918_circular_2026_58_en.pdf)
