# Area True Treemap

Dieses Repository enthält eine Erweiterung des **squarified Treemap**-Algorithmus mit dem Ziel, Abstände zwischen Knoten zu ermöglichen, ohne dass einzelne Knoten verschwinden oder ihre Flächenzuordnung verlieren.
Dieser Algorithmus basiert auf den in der Arbeit [Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf) beschriebenen Konzepten. 

## Features

- Flächentreue Treemap-Visualisierung mit rechteckigen Knoten.
- Unterstützung von Abständen/„Padding“ zwischen Nodes, ohne Verlust von Nodes.
- Erweiterter Layout-Algorithmus auf Basis des squarified-Treemap-Ansatzes.
- Integrierte 2D-Testumgebung zur Visualisierung und zum Debugging des Layouts.

## Motivation

Klassische squarified Treemaps sind flächentreu, bieten aber typischerweise keine echten Abstände zwischen Knoten, ohne dabei Layout-Eigenschaften oder Knoten zu opfern.  
Dieses Projekt untersucht, wie sich Abstände zwischen Nodes hinzufügen lassen, während:

- die Flächenrelationen der Knoten weitgehend erhalten bleiben  
- keine Knoten „verschwinden“  
- das Layout weiterhin gut lesbar und kompakt bleibt  

## Projektstruktur

Eine mögliche Struktur (je nach deiner tatsächlichen Implementierung anpassbar):

- `areaTrueAlgorithm/`  
  - Algorithmus-Implementierung der area-true Treemap mit Gaps  
- ``demo/`  
  - 2D-Testumgebung zur interaktiven Visualisierung des Layouts
- `examples/`  
  - Beispiel-Datensätze und Konfigurationen für das Layout  

Passe die Namen der Ordner so an, wie du sie im Repo tatsächlich verwendest.

## Getting Started

### Voraussetzungen

- Programmiersprache/Runtime: *[hier eintragen, z.B. Node.js, Python, C++, etc.]*  
- Abhängigkeiten: *[z.B. npm/Yarn-Pakete, Pip-Pakete oder Bibliotheken]*  

### Installation

