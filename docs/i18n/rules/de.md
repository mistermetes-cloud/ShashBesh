# ShashBesh — Regeln v1

DRAFT_REVIEW_REQUIRED. Übersetzung zur Prüfung, nicht unabhängig muttersprachlich geprüft. Quelle: docs/RULES_V1.md mit der Genehmigung GAME UPDATE 06. Andere offene Auslegungen bleiben offen.

## Spiel und Brett

2–4 Spieler mit je fünf Figuren. Wer zuerst alle fünf Positionen seiner Zielbahn lückenlos besetzt, gewinnt. Der geschlossene Außenweg hat 48 Felder, 1→2→…→48→1; Bewegung in aufsteigender Reihenfolge. Startfelder: P1=1, P2=13, P3=25, P4=37. Jede Zielbahn umfasst das gemeinsame äußere Startfeld und vier innere Felder: für P1: 1, Д1.2, Д1.3, Д1.4, Д1.5; entsprechend für die anderen. 48 äußere + 16 innere = 64 unterschiedliche physische Felder. Ecken: 7, 19, 31, 43. Die CSV legt die genaue Geometrie fest.

## Beginn und Reihenfolge

Jeder würfelt einen W6. Der höchste Wert beginnt; bei Gleichstand würfeln nur die führenden Gleichstehenden erneut, bis einer übrig bleibt. Danach im Uhrzeigersinn. Alle anderen warten, bis der aktive Spieler seine gesamte Serie von Zusatzwürfen beendet hat.

## Würfe und Aktionen

Zwei unabhängige sechsseitige Würfel. Ein normaler Wurf a–b gibt getrennte Aktionen mit a und b. Reihenfolge und Verteilung auf Figuren unterliegen dem Vorrang legaler Ecksprünge; Schlagen ist freiwillig und Restwerte dürfen mit jeder legalen Figur genutzt werden. Jeder Pasch n–n gibt vier einzelne Aktionen n und einen Zusatzwurf: 6–6 bedeutet vier Sechsen, nicht zwei oder drei. 6–5 oder 5–6 („ShashBesh“) gibt die Aktionen sechs und fünf sowie einen Zusatzwurf. Zusatzwürfe sind unbegrenzt. Jeden Wurf vollständig ausspielen und protokollieren, bevor der nächste beginnt. Aktionen verschiedener Würfe dürfen weder gemischt noch übertragen werden.

Die größtmögliche Summe der Aktionswerte muss genutzt werden, unter Berücksichtigung vollständiger Folgen, Ecksprungpflichten. Sind 6+3=9 möglich, darf ein Sechserzug die Nutzung der Drei nicht verhindern. Ist nur einer von fünf und drei nutzbar, muss fünf genutzt werden. Bei gleicher maximaler Summe besteht freie Strategiewahl.

## Einsetzen, Bewegung und Schlagen

Eine Reservefigur wird für eine Aktion sechs auf ihr eigenes Startfeld gesetzt; sie geht dabei nicht sechs Felder. Eine eigene Figur auf dem Start verhindert das Einsetzen; ein Gegner dort wird geschlagen. Höchstens eine Figur pro physischem Feld. Eigene Figuren dürfen weder passiert, übersprungen noch auf demselben Feld besetzt werden; Gegner dürfen übersprungen werden. Exaktes Landen auf einem Gegner erzwingt Schlagen: Er kehrt in die Reserve zurück und sein Wegfortschritt wird zurückgesetzt. Die Wahl eines Schlagzugs ist freiwillig; andere legale Züge bleiben möglich. Keine zusätzlichen Paare, Blockaden, Stapel oder nicht genannten sicheren Außenfelder einführen.

## Ecksprünge — vom Eigentümer bestätigter Vorrang

Eckenzyklus: 31→43→7→19→31. Ein erlaubter Sprung hat absoluten Vorrang vor Schlagen, einer anderen Figur und der Würfelreihenfolge. Vor der Strategiewahl werden vollständige erlaubte Folgen geprüft. Das Erreichen einer Ecke ist eine gewöhnliche Aktion und verbraucht ihren Wert. Der Sprung benötigt eine ungenutzte Eins und verbraucht sie als eigene Aktion. Beispiel ab 40 mit 3–1: 40→41→42→43 verbraucht drei; 43→44→45→46→47→48→1→2→3→4→5→6→7 verbraucht eins. Diese Eins darf nicht anderweitig verwendet werden; der Sprung ist nicht kostenlos.

Steht eine Figur bereits an einer Ecke, ist bei verfügbarer Eins ein erlaubter Sprung Pflicht. Ohne Eins erzeugt das Erreichen der Ecke allein keinen Vorrang. Der Außenfortschritt steigt um die Anlaufschritte und um zwölf für den Sprung; verbraucht werden die jeweiligen Aktionswerte. Eigene Figuren sperren sowohl Anlauf als auch zwölf Felder des Sprungwegs. Dazwischenstehende Gegner bleiben; geschlagen wird nur ein Gegner auf dem Sprungziel. Ein durch eigene Figuren verbotener Sprung erzeugt keine Pflichtmöglichkeit; gewöhnliche Aktionen werden nach den festgelegten Regeln geprüft.

Alle erlaubten Eckalternativen, die Pflichten und maximale Summe erfüllen, bleiben bestehen. Schlagen entfernt keine andere Eckalternative. Nach dem Sprung darf jede Figur die Restwerte legal nutzen. Bei 1–2 zuerst mit 1 springen, dann den Zug mit 2 frei wählen; die 2 wird nicht automatisch verbraucht. Hat keine Figur eine erlaubte Aktion, bleibt der bisherige Abschluss eines unspielbaren Wurfs. Die Arbeitsregel `jumpEntry: skip` beim Überspringen des Eingangs bleibt; ältere offene Fragen werden dadurch nicht automatisch geklärt.

## Zielbahn und Sieg

Nach einer vollständigen Außenrunde biegt die Figur am eigenen Eingang in die Zielbahn ab; freiwillige weitere Runden sind verboten (Pflichtsprünge können eine weitere Runde bewirken). Die vier inneren Zielfelder sind geschützt: Gegner dürfen dort weder eintreten noch schlagen. Mehrere eigene noch bewegliche Figuren dürfen dort stehen, einander jedoch weder passieren noch dasselbe Feld belegen. Steht A auf Д1.3, darf B auf Д1.2 eintreten, aber A nicht überspringen.

Der genaue Aktionswert ist erforderlich: kein Überschreiten des letzten Feldes oder des Ziels. Ein zu großer Wert ist für diese Figur unzulässig, kann aber einer anderen dienen. Figuren bleiben in der Zielbahn und werden dauerhaft unbeweglich, lückenlos vom hinteren Ende aus: Д1.5, Д1.4, Д1.3, Д1.2, zuletzt das gemeinsame äußere Startfeld (1, 13, 25 oder 37) nach einer vollständigen Runde. Bewegliche Figuren dürfen eintreten, bevor vorherige feststehen. Alle fünf Positionen zu füllen gewinnt. Beispiel 1–1 mit A auf Д1.3 und B auf Д1.2, ohne Pflichtsprung: A→Д1.4; B→Д1.3; A→Д1.5; B→Д1.4 ist erlaubt.

## Zurückgestellt / ausgeschlossen

Vom Tisch gefallene physische Würfel werden nicht modelliert. Schlagzüge sind freiwillig; beim Landen auf einem Gegner wird dieser automatisch geschlagen. Keine Annahmen über Geldeinsätze oder Blockchain: Die Hashkette ist eine lokale technische Funktion.
