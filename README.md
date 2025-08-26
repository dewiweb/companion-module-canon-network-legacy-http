# Companion module: Canon Network (Legacy HTTP)

Module id: `canon-network-legacy-http`

This module targets Canon legacy network cameras using the webview HTTP interface (e.g., VB-H41). For XC-protocol PTZ cameras (CR-N series), use `canon-ptz` instead.

## Status
- Initial scaffold
- To be populated by extracting HTTP-specific logic from `companion-module-canon-ptz`

## Development
- Entry: `companion/manifest.json` -> `src/index.js`
- HTTP client: `src/api.js`
- Polling/parser: `src/polling.js`
- Actions/Variables/Choices/Models/Presets under `src/`
