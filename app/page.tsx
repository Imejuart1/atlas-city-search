"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Compass, Globe2, LocateFixed, MapPin, Search, TriangleAlert, X } from "lucide-react";
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

type City = { id: number; name: string; country: string; countryCode: string; admin1?: string; latitude: number; longitude: number; population?: number; timezone?: string };
type ApiResult = { id: number; name: string; country?: string; country_code?: string; admin1?: string; latitude: number; longitude: number; population?: number; timezone?: string };
type WebModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> };

const SUGGESTIONS = ["Lagos", "Lisbon", "London"];
const cityLabel = (city: City) => [city.name, city.admin1, city.country].filter(Boolean).join(", ");

function formatPopulation(population?: number) {
  if (!population) return "Population unavailable";
  return `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(population)} people`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (selectedCity && cleanQuery === cityLabel(selectedCity)) {
      requestSequence.current += 1;
      setStatus("idle");
      setOpen(false);
      return;
    }
    if (cleanQuery.length < 2) {
      requestSequence.current += 1;
      setCities([]);
      setStatus("idle");
      setOpen(false);
      return;
    }

    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      setOpen(true);
      try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=8&language=en&format=json`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search request failed");
        const payload = (await response.json()) as { results?: ApiResult[] };
        if (sequence !== requestSequence.current) return;

        const nextCities: City[] = (payload.results ?? []).map((result) => ({
          id: result.id,
          name: result.name,
          country: result.country ?? result.country_code ?? "Unknown country",
          countryCode: result.country_code?.toUpperCase() ?? "--",
          admin1: result.admin1,
          latitude: result.latitude,
          longitude: result.longitude,
          population: result.population,
          timezone: result.timezone,
        }));

        setCities(nextCities);
        setStatus(nextCities.length ? "success" : "empty");
        setAnnouncement(nextCities.length ? `${nextCities.length} places found for ${cleanQuery}` : `No places found for ${cleanQuery}`);
      } catch {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setCities([]);
        setStatus("error");
        setAnnouncement("City search failed. Please try again.");
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedCity]);

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: WebModelContext }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(modelContext.registerTool({
      name: "start_city_search",
      title: "Search cities",
      description: "Enter a city or town name in Atlas and start the visible autocomplete search.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", minLength: 2, maxLength: 100, description: "City or town name" } },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const value = (input as { query?: unknown } | null)?.query;
        if (typeof value !== "string" || value.trim().length < 2 || value.length > 100) throw new Error("Query must be 2–100 characters.");
        const nextQuery = value.trim();
        setSelectedCity(null);
        setQuery(nextQuery);
        return { status: "started", query: nextQuery };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search for a city"]')?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const cityIds = useMemo(() => cities.map((city) => String(city.id)), [cities]);

  function selectCity(id: string | null) {
    if (!id) return;
    const city = cities.find((item) => String(item.id) === id);
    if (!city) return;
    setSelectedCity(city);
    setQuery(cityLabel(city));
    setOpen(false);
    setAnnouncement(`${cityLabel(city)} selected`);
  }

  function clearSearch() {
    setQuery("");
    setCities([]);
    setSelectedCity(null);
    setStatus("idle");
    setOpen(false);
  }

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Atlas home"><span className="brand-mark"><Compass size={18} strokeWidth={2.4} /></span><span>ATLAS</span></a>
        <span className="nav-note">City index · Live data</span>
      </nav>

      <section className="search-stage" id="top">
        <div className="eyebrow"><span /> Global place search</div>
        <h1>Find your next<br /><em>place.</em></h1>
        <p className="intro">Search cities and towns around the world. Start typing and use the arrow keys to explore matches.</p>

        <div className="search-wrap">
          <Combobox items={cityIds} value={selectedCity ? String(selectedCity.id) : null} onValueChange={selectCity} itemToStringLabel={(id) => { const city = cities.find((item) => String(item.id) === id); return city ? cityLabel(city) : id; }} inputValue={query} onInputValueChange={(value) => { setQuery(value); if (selectedCity && value !== cityLabel(selectedCity)) setSelectedCity(null); }} open={open} onOpenChange={setOpen} filter={null}>
            <div className="search-field">
              <Search className="search-icon" aria-hidden="true" />
              <ComboboxInput className="atlas-input" placeholder="Search for a city..." aria-label="Search for a city" showTrigger={false} autoComplete="off" />
              {query && <button className="clear-button" type="button" onClick={clearSearch} aria-label="Clear search"><X size={18} /></button>}
              <span className="shortcut" aria-hidden="true">Ctrl K</span>
            </div>

            <ComboboxContent className="results-popover" sideOffset={10}>
              <ComboboxList className="results-list">
                {status === "loading" && <div className="state-row" role="status"><span className="loader" /><div><strong>Looking across the map</strong><small>Finding the best matches…</small></div></div>}
                {status === "empty" && <div className="state-row"><LocateFixed /><div><strong>No places found</strong><small>Try a different spelling or a nearby city.</small></div></div>}
                {status === "error" && <div className="state-row error-row" role="alert"><TriangleAlert /><div><strong>We couldn’t reach the map</strong><small>Check your connection, then edit the search to retry.</small></div></div>}
                {status === "success" && cities.map((city) => (
                  <ComboboxItem key={city.id} value={String(city.id)} className="city-option">
                    <span className="pin"><MapPin size={17} /></span>
                    <span className="city-copy"><strong>{city.name}</strong><small>{[city.admin1, city.country].filter(Boolean).join(", ")}</small></span>
                    <span className="country-code">{city.countryCode}</span>
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <div className="suggestions" aria-label="Suggested searches">
          <span>Try</span>
          {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setQuery(suggestion); setSelectedCity(null); }}>{suggestion}<ArrowRight size={13} /></button>)}
        </div>

        <p className="sr-only" aria-live="polite">{announcement}</p>

        {selectedCity && (
          <article className="selection-card" aria-label="Selected city">
            <div className="selection-topline"><Check size={14} /> Selected place</div>
            <div className="selection-grid">
              <div><p className="selection-kicker">{selectedCity.countryCode} · {selectedCity.timezone ?? "Local time"}</p><h2>{selectedCity.name}</h2><p>{[selectedCity.admin1, selectedCity.country].filter(Boolean).join(", ")}</p></div>
              <dl><div><dt>Coordinates</dt><dd>{selectedCity.latitude.toFixed(2)}°, {selectedCity.longitude.toFixed(2)}°</dd></div><div><dt>Population</dt><dd>{formatPopulation(selectedCity.population)}</dd></div></dl>
            </div>
          </article>
        )}
      </section>

      <footer><span><Globe2 size={15} /> Powered by Open-Meteo</span><span>8 results · 350 ms debounce</span></footer>
    </main>
  );
}
