### ergebinsse in der Thesis
hier ist die thesis zu finden: 
auf seite 81 folgende ergebnisse, die für diesen algorithmus relevant sind:

Abstände zwischen Knoten: Manuelle Wahl zwischen 0,5 % und
3 % relativem Abstand -> wir können den relativen abstand nicht exakt als input nutzen, da dieser erst nach dem zweiten layoutdurchlauf bestimmt werden kann. Stattdessen werden wir einfach den relativen Abstand auf basis des ersten layoutdurchlaufs nutzen, dieser ist nahe genug am gewünschten wert dran.

Angestrebtes Seitenverhältnis: 1
Reihenfolge der Knoten: Absteigend nach Größe
Größenanpassung: Relative Größenanpassung
Zweiter Layoutschritt: Neusortierung absteigend nach Größe
Mehrfache Berechnung: Nicht verwenden
Optimierung von Ordnerketten: Verwenden -> kann aber wie in der thesis gesagt eine design entscheidung sein und wird dem nutzer überlassen, der default ist aber true

Abstände zwischen Geschwistern: Keine -> kann auch eine design entscheidung sein, default ist false
Beschriftung der Knoten: Manuelle Wahl von N zwischen 2 und
5 sowie L zwischen 3 % und 10 % -> auch hier kann nicht exakt als input genutzt werden, deswegen nutzen wir wie beim abstand eine annäherung basierend auf dem ersten layoutdurchlauf.


## INput:

### Abstände
relative abstandsgröße (ca. weil das auf dem ersten layout durchlauf basiert)
oder
eine funktion, die die abstände dynamisch bestimmt basieren auf den daten und der größe des layouts
oder 
ein wert für die abstandsgröße aber es wird eine dymamische funktion verwendet, die den wert anpasst basierend auf den daten und der größe des layouts

### Labels

anzahl top labels und deren größe 
oder 
funktion, die bestimmt, wieviele top labels angezeigt werden und deren größe
oder
ein wert zwischen 0 und 1, der als input für eine eigene automatische funktion dient

### einstellungen
sortingOption: SortingOption, -> sortieroption für die knoten
applySiblingMargin: boolean, -> abstände zwischen geschwistern
collapseFolders: boolean, -> faltet ordnerketten zusammen zu einem ordner
minSize: number, -> minimalgröße der länge oder breite eines knotens 
