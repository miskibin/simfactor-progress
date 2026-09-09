---
layout: default
title: Postępy SimFactor
---

# Postępy SimFactor

Potwierdzone osiągnięcia i aktualny stan planu. Aktualizacja: **9 września 2026**.

## Plan

| Zadanie | Status |
|---|---|
| T1 · Lokalizacja pociągu | W toku — trwa domykanie i walidacja VO. |
| T2 · Korekty lokalizacji przez operatora | Zaplanowane po T1. |
| T3 · Dataset i detektor | W toku — v1 zachowane; pierwsza próba lokalnych anotatorów zakończona, potrzebna pełna ocena jakości. |
| T4 · Śledzenie obiektów | Zaplanowane. |
| T5 · Geolokalizacja obiektów | Zaplanowane; wymaga odbioru T1. |
| T6 · Łączenie źródeł danych | Zaplanowane. |
| T7 · Weryfikacja obiektów przez operatora | Zaplanowane. |
| T8 · Obiekty jako kotwice lokalizacji | Zaplanowane. |
| T9 · Rejestr, mapa i eksport | Zaplanowane. |

## Co się udało

### 2026-09-09 · Sprawdzone pokrycie dużych obiektów

- Audyt wykazał, że dataset v1 ma **378 adnotacji w 5 z 20 zadeklarowanych klas**; bramownice trakcyjne i podpory sygnałowe mają w nim **0 adnotacji**. Istniejące propozycje wymagają oceny.
- Wykryto niespójne przypisanie bramownic sygnałowych do trakcyjnych. Zapisano lukę oraz propozycję priorytetów dużych i ważnych obiektów; etykiety i taksonomia w kodzie pozostają niezmienione.

### 2026-09-09 · Pierwsza próba lokalnej anotacji

- Moondream 3.1 odnalazł **10 z 12 ludzkich ramek** przy IoU ≥0,5, a 4 z 12 przy ≥0,75. To mała próba z częściowymi etykietami; nie mierzy jeszcze precyzji ani kompletności całych scen.
- Qwen Image Edit przy 1024 px narysował dwie sensowne ramki na jednym kontrolnym obrazie, zachowując układ sceny. To obiecujący przykład, wymagający sprawdzenia na większym zestawie.
- Przeniesiono same współrzędne tych ramek na oryginalny obraz: **0 zmienionych pikseli poza liniami ramek**. Usuwa to dodatkowe rozmycie od generacji; poprawność lokalizacji nadal wymaga oceny.
- Zachowano dotychczasowe etykiety i bramkę jakości. Wyników tej próby nie dodano do treningu.

### 2026-09-09 · Nowa baza do rozwoju datasetu

- Odbudowano dataset v1: **378 adnotacji** na trzech trasach, z identycznymi plikami adnotacji po migracji.
- Uruchomiono niezależne środowisko projektu: **32 testy przeszły**, a checkpoint załadowano z pełną zgodnością 794 tensorów.
- Zachowano **95 kart zamrożonej bramki jakości**, dzięki czemu kolejne modele będzie można porównywać na tej samej referencji.

To odbiór migracji i zachowanie punktu odniesienia; nowy model nie był jeszcze trenowany w tym etapie.
