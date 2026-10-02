(() => {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const relativeFormatter = new Intl.RelativeTimeFormat("pl-PL", { numeric: "auto" });
  const exactFormatter = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const state = {
    events: [],
    archive: null,
    generatedAt: null,
    latestEventAt: null,
    filter: "all",
    now: Date.now(),
    eventsError: false,
    archiveError: false,
    loading: false,
    archiveUpdatedAt: null,
  };

  const elements = {
    freshness: document.querySelector("#freshness"),
    freshnessTitle: document.querySelector("#freshness-title"),
    freshnessTime: document.querySelector("#freshness-time"),
    refreshButton: document.querySelector("#refresh-button"),
    eventsError: document.querySelector("#events-error"),
    asksSection: document.querySelector("#asks-section"),
    asksCount: document.querySelector("#asks-count"),
    openAsks: document.querySelector("#open-asks"),
    resultsSection: document.querySelector("#results-section"),
    resultsCount: document.querySelector("#results-count"),
    resultsList: document.querySelector("#results-list"),
    historySection: document.querySelector("#history-section"),
    historyCount: document.querySelector("#history-count"),
    resolvedAsks: document.querySelector("#resolved-asks"),
    archiveSection: document.querySelector("#archive-section"),
    archiveContent: document.querySelector("#archive-content"),
    archiveUpdated: document.querySelector("#archive-updated"),
  };

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function validDate(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function exactDate(date) {
    return exactFormatter.format(date);
  }

  function relativeDate(date) {
    const seconds = Math.round((date.getTime() - state.now) / 1000);
    const magnitude = Math.abs(seconds);
    if (magnitude < 60) return relativeFormatter.format(seconds, "second");
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return relativeFormatter.format(days, "day");
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return relativeFormatter.format(months, "month");
    return relativeFormatter.format(Math.round(days / 365), "year");
  }

  function addTimestamp(parent, value, label) {
    const date = validDate(value);
    if (!date) return false;
    const wrapper = make("span", "event-meta-item");
    const time = document.createElement("time");
    time.dateTime = date.toISOString();
    time.setAttribute("aria-label", `${label}: ${exactDate(date)}`);
    time.title = exactDate(date);
    time.append(make("span", "meta-relative", relativeDate(date)));
    time.append(make("span", "meta-exact", `· ${exactDate(date)}`));
    wrapper.append(time);
    parent.append(wrapper);
    return true;
  }

  function cleanPublicText(value, maxLength = 1800) {
    if (typeof value !== "string") return "";
    let text = value
      .replace(/\u0000/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\b[A-Za-z]:[\\/](?:[^\s<>|"']+[\\/])*[^\s<>|"']*/g, "")
      .replace(/(^|[\s(])(?:artifacts|experiments|docs|cabcam|configs)\/[\w./-]+/g, "$1")
      .replace(/\b(?=[a-f\d]{7,64}\b)(?=[a-f\d]*[a-f])(?=[a-f\d]*\d)[a-f\d]{7,64}\b/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.;!?])/g, "$1")
      .trim();
    if (text.length > maxLength) text = `${text.slice(0, maxLength - 1).trimEnd()}…`;
    return text;
  }

  function inlineStrong(parent, rawText) {
    const text = cleanPublicText(rawText, 5000);
    const pieces = text.split(/(\*\*[^*]+\*\*)/g);
    for (const piece of pieces) {
      if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
        parent.append(make("strong", "", piece.slice(2, -2)));
      } else if (piece) {
        parent.append(document.createTextNode(piece));
      }
    }
  }

  function safeLink(value) {
    if (typeof value !== "string" || value.length > 2048) return null;
    const raw = value.trim();
    const codexMatch = /^codex:\/\/threads\/([a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i.exec(raw);
    if (codexMatch) return { href: raw, kind: "codex", hostname: "" };
    try {
      const parsed = new URL(raw);
      if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) return null;
      return { href: parsed.href, kind: "external", hostname: parsed.hostname.replace(/^www\./i, "") };
    } catch {
      return null;
    }
  }

  function normalizedEvents(payload) {
    if (!payload || payload.schema_version !== 1 || !Array.isArray(payload.events)) {
      throw new Error("Nieprawidłowy format wpisów.");
    }
    return payload.events.filter((event) =>
      event &&
      typeof event.id === "string" &&
      (event.kind === "ask" || event.kind === "result") &&
      typeof event.text === "string" &&
      (event.origin === "agent" || event.origin === "imported") &&
      (event.status === "open" || event.status === "resolved" || event.status === "recorded")
    );
  }

  function createEventCard(event) {
    const isAsk = event.kind === "ask";
    const isResolved = event.status === "resolved";
    const card = make("article", "event-card");
    card.dataset.kind = event.kind;
    card.dataset.status = event.status;

    const top = make("div", "event-card-top");
    top.append(make("span", "event-kind", isAsk ? (isResolved ? "Pytanie" : "Czeka na odpowiedź") : "Ważny wynik"));
    if (isAsk) top.append(make("span", "event-status", isResolved ? "Zamknięte" : "Otwarte"));
    card.append(top);

    const headline = cleanPublicText(event.text, 500);
    if (headline) card.append(make("h3", "event-text", headline));
    const detail = cleanPublicText(event.detail, 1800);
    if (detail && detail !== headline) card.append(make("p", "event-detail", detail));

    const meta = make("div", "event-meta");
    const authorName = cleanPublicText(event.author && event.author.name, 80) || "Zespół SimFactor";
    const author = make("span", "event-meta-item", `Od: ${authorName}`);
    meta.append(author);
    const origin = event.origin === "imported" ? "Zaimportowane" : "Oryginalne";
    meta.append(make("span", "origin-badge", origin));
    const sourceLabel = cleanPublicText(event.source_label, 80);
    if (sourceLabel) meta.append(make("span", "event-meta-item source-label", `Źródło: ${sourceLabel}`));
    addTimestamp(meta, event.created_at, "Dodano");
    card.append(meta);

    const updated = validDate(event.updated_at);
    const created = validDate(event.created_at);
    if (updated && (!created || updated.getTime() - created.getTime() > 60_000)) {
      const updateMeta = make("div", "event-meta event-meta-update");
      addTimestamp(updateMeta, event.updated_at, "Zaktualizowano");
      card.append(updateMeta);
    }
    if (isResolved && validDate(event.resolved_at)) {
      const resolution = cleanPublicText(event.resolution, 800);
      if (resolution) card.append(make("p", "event-detail", `Rozwiązanie: ${resolution}`));
      const resolvedMeta = make("div", "event-meta event-meta-update");
      addTimestamp(resolvedMeta, event.resolved_at, "Rozwiązano");
      card.append(resolvedMeta);
    }

    const link = safeLink(event.url);
    if (link) {
      const actions = make("div", "event-actions");
      const anchor = make("a", "event-link");
      anchor.href = link.href;
      if (link.kind === "external") {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        const label = sourceLabel || link.hostname || "źródło zewnętrzne";
        anchor.append(make("span", "event-link-label", `Otwórz źródło · ${label}`));
        anchor.setAttribute("aria-label", `Otwórz źródło zewnętrzne: ${label}`);
      } else {
        anchor.dataset.linkKind = "codex";
        anchor.append(make("span", "event-link-icon", "🔒"));
        anchor.append(make("span", "event-link-label", "Otwórz prywatną sesję Codex"));
        anchor.setAttribute("aria-label", "Otwórz prywatną sesję Codex");
      }
      actions.append(anchor);
      card.append(actions);
    }
    return card;
  }

  function fillList(container, events, emptyText) {
    container.replaceChildren();
    if (!events.length) {
      container.append(make("p", "empty-state", emptyText));
      return;
    }
    for (const event of events) container.append(createEventCard(event));
  }

  function renderFreshness() {
    const box = elements.freshness;
    box.dataset.state = "fresh";
    if (state.loading && !state.generatedAt) {
      box.dataset.state = "loading";
      elements.freshnessTitle.textContent = "Sprawdzam najnowsze informacje…";
      elements.freshnessTime.textContent = "";
      return;
    }
    if (state.eventsError) {
      box.dataset.state = "error";
      elements.freshnessTitle.textContent = "Nie udało się sprawdzić aktualności wpisów.";
      elements.freshnessTime.textContent = "Odśwież stronę, aby spróbować ponownie.";
      return;
    }
    const published = validDate(state.generatedAt);
    if (!published) {
      box.dataset.state = "unknown";
      elements.freshnessTitle.textContent = "Brak informacji o czasie publikacji.";
      elements.freshnessTime.textContent = "Nie możemy potwierdzić, czy wpisy są aktualne.";
      return;
    }
    const age = Math.max(0, state.now - published.getTime());
    const stamp = `${relativeDate(published)} · ${exactDate(published)}`;
    if (age > 7 * DAY_MS) {
      box.dataset.state = "old";
      elements.freshnessTitle.textContent = "Te informacje mogą być nieaktualne.";
      elements.freshnessTime.textContent = `Ostatnia publikacja: ${stamp}`;
    } else if (age > DAY_MS) {
      box.dataset.state = "stale";
      elements.freshnessTitle.textContent = "Minęła ponad doba od ostatniej publikacji.";
      elements.freshnessTime.textContent = `Ostatnia publikacja: ${stamp}`;
    } else {
      box.dataset.state = "fresh";
      const latest = validDate(state.latestEventAt);
      const quiet = latest && state.now - latest.getTime() > DAY_MS;
      elements.freshnessTitle.textContent = quiet ? "Publikacja świeża; brak nowych wpisów od ponad doby." : "Informacje są świeże.";
      elements.freshnessTime.textContent = `Ostatnia publikacja: ${stamp}`;
    }
  }

  function renderFilters() {
    for (const button of document.querySelectorAll("[data-filter]")) {
      const selected = button.dataset.filter === state.filter;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function renderEvents() {
    const openAsks = state.events
      .filter((event) => event.kind === "ask" && event.status === "open")
      .sort((a, b) => dateOrder(b.created_at) - dateOrder(a.created_at));
    const results = state.events
      .filter((event) => event.kind === "result" && event.status !== "resolved")
      .sort((a, b) => dateOrder(b.created_at) - dateOrder(a.created_at));
    const resolved = state.events
      .filter((event) => event.kind === "ask" && event.status === "resolved")
      .sort((a, b) => dateOrder(b.resolved_at || b.updated_at || b.created_at) - dateOrder(a.resolved_at || a.updated_at || a.created_at));

    elements.asksCount.textContent = String(openAsks.length);
    elements.resultsCount.textContent = String(results.length);
    elements.historyCount.textContent = String(resolved.length);
    elements.asksCount.setAttribute("aria-label", `${openAsks.length} otwartych pytań`);
    elements.resultsCount.setAttribute("aria-label", `${results.length} ważnych wyników`);
    elements.historyCount.setAttribute("aria-label", `${resolved.length} zamkniętych pytań`);

    const asksVisible = state.filter === "all" || state.filter === "asks";
    const resultsVisible = state.filter === "all" || state.filter === "results";
    const historyVisible = state.filter === "all" || state.filter === "asks" || state.filter === "history";
    elements.asksSection.hidden = !asksVisible;
    elements.resultsSection.hidden = !resultsVisible;
    elements.historySection.hidden = !historyVisible;
    elements.eventsError.hidden = !state.eventsError;

    if (state.eventsError) {
      fillList(elements.openAsks, [], "Wpisy są chwilowo niedostępne.");
      fillList(elements.resultsList, [], "Wpisy są chwilowo niedostępne.");
      fillList(elements.resolvedAsks, [], "Historia jest chwilowo niedostępna.");
    } else {
      fillList(elements.openAsks, openAsks, "Na razie nic nie czeka na Twoją odpowiedź.");
      fillList(elements.resultsList, results, "Nowe wyniki pojawią się tutaj.");
      fillList(elements.resolvedAsks, resolved, "Nie ma jeszcze zamkniętych pytań.");
    }
  }

  function dateOrder(value) {
    const date = validDate(value);
    return date ? date.getTime() : 0;
  }

  function isHeading(line) { return /^#{1,6}\s+/.test(line); }
  function isTableLine(line) { return /^\s*\|?.*\|.*\|?\s*$/.test(line) && line.includes("|"); }
  function isTableDivider(line) { return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line); }
  function isUnorderedItem(line) { return /^\s*[-*+]\s+/.test(line); }
  function isOrderedItem(line) { return /^\s*\d+[.)]\s+/.test(line); }
  function isBlockStart(lines, index) {
    return isHeading(lines[index]) || isUnorderedItem(lines[index]) || isOrderedItem(lines[index]) ||
      (isTableLine(lines[index]) && index + 1 < lines.length && isTableDivider(lines[index + 1]));
  }

  function tableCells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }

  function renderArchiveMarkdown(markdown) {
    elements.archiveContent.replaceChildren();
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    let index = 0;
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) { index += 1; continue; }

      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        const level = Math.min(5, Math.max(3, heading[1].length + 1));
        const node = make(`h${level}`);
        inlineStrong(node, heading[2]);
        elements.archiveContent.append(node);
        index += 1;
        continue;
      }

      if (isTableLine(line) && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
        const headerCells = tableCells(line);
        const wrapper = make("div", "archive-table-wrap");
        wrapper.tabIndex = 0;
        wrapper.setAttribute("role", "region");
        wrapper.setAttribute("aria-label", "Tabela z archiwum osiągnięć");
        const table = make("table", "archive-table");
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        for (const cell of headerCells) {
          const th = document.createElement("th");
          th.scope = "col";
          inlineStrong(th, cell);
          headRow.append(th);
        }
        thead.append(headRow);
        table.append(thead);
        const tbody = document.createElement("tbody");
        index += 2;
        while (index < lines.length && isTableLine(lines[index].trim())) {
          const cells = tableCells(lines[index]);
          const row = document.createElement("tr");
          for (let cellIndex = 0; cellIndex < headerCells.length; cellIndex += 1) {
            const td = document.createElement("td");
            inlineStrong(td, cells[cellIndex] || "");
            row.append(td);
          }
          tbody.append(row);
          index += 1;
        }
        table.append(tbody);
        wrapper.append(table);
        elements.archiveContent.append(wrapper);
        continue;
      }

      if (isUnorderedItem(line) || isOrderedItem(line)) {
        const ordered = isOrderedItem(line);
        const list = document.createElement(ordered ? "ol" : "ul");
        while (index < lines.length && (ordered ? isOrderedItem(lines[index]) : isUnorderedItem(lines[index]))) {
          const itemText = lines[index].trim().replace(ordered ? /^\d+[.)]\s+/ : /^[-*+]\s+/, "");
          const li = document.createElement("li");
          inlineStrong(li, itemText);
          list.append(li);
          index += 1;
        }
        elements.archiveContent.append(list);
        continue;
      }

      const paragraphLines = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
        paragraphLines.push(lines[index].trim());
        index += 1;
      }
      const paragraph = make("p");
      inlineStrong(paragraph, paragraphLines.join(" "));
      elements.archiveContent.append(paragraph);
    }
  }

  function renderArchive() {
    elements.archiveSection.hidden = false;
    if (state.archiveError || !state.archive) {
      elements.archiveContent.replaceChildren(make("p", "empty-state", "Nie udało się pobrać archiwum osiągnięć."));
      elements.archiveUpdated.textContent = "";
      return;
    }
    renderArchiveMarkdown(state.archive);
    const updated = validDate(state.archiveUpdatedAt);
    elements.archiveUpdated.textContent = updated ? `Opublikowano ${relativeDate(updated)} · ${exactDate(updated)}` : "";
  }

  async function getJson(path) {
    const response = await fetch(path, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Nie udało się pobrać danych.");
    return response.json();
  }

  async function loadData() {
    state.loading = true;
    elements.refreshButton.disabled = true;
    elements.eventsError.hidden = true;
    renderFreshness();
    const [eventsResult, archiveResult] = await Promise.allSettled([
      getJson("./events.json"),
      getJson("./archive.json"),
    ]);

    if (eventsResult.status === "fulfilled") {
      try {
        state.events = normalizedEvents(eventsResult.value);
        state.generatedAt = eventsResult.value.generated_at;
        state.latestEventAt = eventsResult.value.latest_event_at;
        state.eventsError = false;
      } catch {
        state.events = [];
        state.eventsError = true;
      }
    } else {
      state.events = [];
      state.eventsError = true;
    }

    if (archiveResult.status === "fulfilled" && archiveResult.value && typeof archiveResult.value.markdown === "string") {
      state.archive = archiveResult.value.markdown;
      state.archiveUpdatedAt = archiveResult.value.updated_at;
      state.archiveError = false;
    } else {
      state.archive = null;
      state.archiveUpdatedAt = null;
      state.archiveError = true;
    }
    state.loading = false;
    elements.refreshButton.disabled = false;
    renderAll();
  }

  function renderAll() {
    renderFreshness();
    renderFilters();
    renderEvents();
    renderArchive();
  }

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      if (state.filter === "history") document.querySelector("#history-details").open = true;
      renderFilters();
      renderEvents();
    });
  });

  document.querySelectorAll("[data-retry]").forEach((button) => button.addEventListener("click", loadData));
  elements.refreshButton.addEventListener("click", loadData);
  window.setInterval(() => {
    state.now = Date.now();
    renderFreshness();
    if (state.archive) renderArchive();
    renderEvents();
  }, 60_000);

  loadData();
})();
