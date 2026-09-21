# Atlas City Search

An accessible typeahead built with React, Next.js, TypeScript, and the public Open-Meteo geocoding API.

## Run locally

```bash
pnpm install
pnpm dev
```

## Engineering notes

I chose a client-side request flow because this is a small, public-data interaction where an extra server hop would add latency without protecting a secret. Input is debounced by 350 ms to balance responsiveness against unnecessary requests. Each search creates an `AbortController`, and a monotonically increasing sequence number guards state updates; cancellation saves work in the common case, while the sequence check still prevents stale results if a response wins the race before cancellation takes effect.

The autocomplete uses an accessible combobox primitive, so arrow-key navigation, Enter selection, focus management, and listbox semantics are handled consistently. Loading, empty, error, and selected states are explicit, and a polite live region announces result counts without interrupting typing. Queries shorter than two characters never reach the API.

At higher traffic, I would proxy requests through an edge function, normalize and cache popular prefixes with a short TTL, add request coalescing, and enforce rate limits per client. I would also add observability around latency and zero-result rates, virtualize unusually large result sets, and define a provider fallback.

For testing, I would combine unit tests for debounce and stale-response behavior, mocked integration tests for every request state, keyboard-only accessibility tests, automated axe checks, and a small Playwright suite covering search, rapid query changes, selection, clearing, mobile layout, and API failure recovery.
