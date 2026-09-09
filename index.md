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
| T3 · Dataset i detektor | W toku — v1 zachowane; trwa rozbudowa i próba automatycznej anotacji. |
| T4 · Śledzenie obiektów | Zaplanowane. |
| T5 · Geolokalizacja obiektów | Zaplanowane; wymaga odbioru T1. |
| T6 · Łączenie źródeł danych | Zaplanowane. |
| T7 · Weryfikacja obiektów przez operatora | Zaplanowane. |
| T8 · Obiekty jako kotwice lokalizacji | Zaplanowane. |
| T9 · Rejestr, mapa i eksport | Zaplanowane. |

## Co się udało

### 2026-09-09 · Nowa baza do rozwoju datasetu

- Odbudowano dataset v1: **378 adnotacji** na trzech trasach, z identycznymi plikami adnotacji po migracji.
- Uruchomiono niezależne środowisko projektu: **32 testy przeszły**, a checkpoint załadowano z pełną zgodnością 794 tensorów.
- Zachowano **95 kart zamrożonej bramki jakości**, dzięki czemu kolejne modele będzie można porównywać na tej samej referencji.

To odbiór migracji i zachowanie punktu odniesienia; nowy model nie był jeszcze trenowany w tym etapie.
