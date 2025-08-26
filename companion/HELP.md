Canon Network (Legacy HTTP)

This module supports Canon legacy network cameras using the webview HTTP interface (e.g., VB-H41). It is separate from the XC protocol module to avoid cross-protocol inconsistencies.

Supported cameras (initial):
- VB-H41

Scope highlights:
- HTTP transport (info.cgi) polling and parsing
- Lens, Exposure, White Balance, System controls as exposed by HTTP API
- Position Presets (PTZF) 1–10 when supported by the model
- Model-specific gating (lists pulled from camera where applicable)

Notes:
- Focus recall is sent only in Manual Focus mode, per camera behavior.
- Some features (e.g., ND filter, Kelvin) may be unsupported on certain legacy models and will be hidden/disabled.

Remaining work before first release:
- Implement polling and parser for info.cgi
- Implement actions/variables/choices/presets for VB-H41
- Author tests/validation checklist
- Expand supported models list as verified
