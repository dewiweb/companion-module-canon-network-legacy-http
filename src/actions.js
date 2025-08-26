const API = require('./api')
const { MODELS, SERIES_SPECS } = require('./models')
const Choices = require('./choices')

module.exports = function (self) {
    // Determine model capabilities
    const modelId = self.config?.model
    const model = MODELS.find((m) => m.id === modelId)
    const series = SERIES_SPECS.find((s) => s.id === model?.series)
    const supportsPTZ = !!series?.supportsPTZ
    const supportsZoom = !!series?.supportsZoom
    const supportsPTZFPosPresets = !!series?.posPresetsPTZF
    const presetChoices = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: String(i + 1) }))

    // Centralized model-driven choices from info.cgi lists/ranges
    const { focusChoices, exposureChoices, photometryChoices, wbChoices, aeBrightnessChoices, shutterChoices, ranges } = Choices(self)

    const actions = {
        refresh_info: {
            name: 'Refresh info (poll now)',
            options: [],
            callback: async () => {
                try {
                    await self.getCameraInformation?.()
                } catch (e) {
                    // swallow
                }
            },
        },

        raw_cgi_get: {
            name: 'Send raw CGI (GET)',
            options: [
                {
                    type: 'textinput',
                    id: 'cmd',
                    label: 'Command (e.g. info.cgi or cmd.cgi?pt=... )',
                    default: 'info.cgi',
                },
                {
                    type: 'checkbox',
                    id: 'refresh',
                    label: 'Refresh info after call',
                    default: true,
                },
            ],
            callback: async (event) => {
                const cmd = (event.options?.cmd || '').trim()
                if (!cmd) return

                const api = new API(self.config)
                await api.sendRequest(cmd)
                if (event.options?.refresh) {
                    await self.getCameraInformation?.()
                }
            },
        },

        posPresetSave: {
            name: 'Position Preset - Save (PTZF)',
            options: [
                {
                    type: 'dropdown',
                    label: 'Preset Slot',
                    id: 'slot',
                    default: 1,
                    choices: presetChoices,
                },
            ],
            learn: () => undefined,
            callback: async (action) => {
                try {
                    if (typeof self.getCameraInformation === 'function') {
                        await self.getCameraInformation()
                    }
                } catch (_) {
                    // Non-fatal; continue with cached values
                }
                const slot = parseInt(action.options.slot) || 1
                const idx = Math.min(Math.max(slot, 1), 10) - 1

                const pan = String(self.data.panValue ?? '')
                const tilt = String(self.data.tiltValue ?? '')
                const zoom = String(self.data.zoomValue ?? '')
                const focus = String(self.data.focusValue ?? '')

                self.data.positionPresets = self.data.positionPresets || new Array(10).fill(null)
                self.data.positionPresets[idx] = { pan, tilt, zoom, focus }

                if (self.config?.verbose) {
                    self.log?.('info', `Saved PTZF to Position Preset ${slot}: pan=${pan}, tilt=${tilt}, zoom=${zoom}, focus=${focus}`)
                }

                self.checkVariables?.()
            },
        },

        posPresetRecall: {
            name: 'Position Preset - Recall (PTZF)',
            options: [
                {
                    type: 'dropdown',
                    label: 'Preset Slot',
                    id: 'slot',
                    default: 1,
                    choices: presetChoices,
                },
            ],
            callback: async (action) => {
                const slot = parseInt(action.options.slot) || 1
                const idx = Math.min(Math.max(slot, 1), 10) - 1
                const preset = (self.data.positionPresets || [])[idx] || {}

                const pan = preset.pan ?? ''
                const tilt = preset.tilt ?? ''
                const zoom = preset.zoom ?? ''
                const focus = preset.focus ?? ''

                if (pan === '' && tilt === '' && zoom === '' && focus === '') {
                    self.log?.('error', `Position Preset ${slot} is empty. Save it first.`)
                    return
                }

                const parts = []
                if (pan !== '' && tilt !== '') {
                    parts.push(`pan=${pan}`)
                    parts.push(`tilt=${tilt}`)
                }
                if (zoom !== '') {
                    parts.push(`zoom=${zoom}`)
                }
                if (focus !== '' && self.data?.focusMode === 'manual') {
                    parts.push(`focus.value=${focus}`)
                }

                const cmd = parts.join('&')
                if (cmd.length > 0) {
                    if (self.config?.verbose) {
                        self.log?.('info', `Recalling Position Preset ${slot} with: ${cmd}`)
                    }
                    await self.sendPTZ(self.ptzCommand, cmd)
                    self.getCameraInformation_Delayed?.()
                }
            },
        },

        // -----------------------
        // System / Power / Name
        // -----------------------
        power_off: {
            name: 'System - Power Off',
            options: [],
            callback: async () => {
                const cmd = 'cmd=standby'
                await self.sendPTZ(self.powerCommand, cmd)
                self.data.powerState = 'standby'
                self.getCameraInformation_Delayed?.()
            },
        },

        power_on: {
            name: 'System - Power On',
            options: [],
            callback: async () => {
                const cmd = 'cmd=idle'
                await self.sendPTZ(self.powerCommand, cmd)
                self.data.powerState = 'idle'
                self.getCameraInformation_Delayed?.()
            },
        },

        power_toggle: {
            name: 'System - Power Toggle',
            options: [],
            callback: async () => {
                let cmd = 'cmd=idle'
                if (self.data.powerState === 'idle') {
                    cmd = 'cmd=standby'
                    self.data.powerState = 'standby'
                } else {
                    cmd = 'cmd=idle'
                    self.data.powerState = 'idle'
                }
                await self.sendPTZ(self.powerCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        camera_name: {
            name: 'Set Camera Name',
            options: [
                {
                    type: 'textinput',
                    id: 'name',
                    label: 'Camera Name',
                    default: 'Camera',
                },
            ],
            callback: async (event) => {
                const name = (event.options?.name || '').trim()
                if (!name) return
                const cmd = 'c.1.name.utf8=' + name
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        // -----------------------
        // Pan / Tilt controls (PTZ only)
        // -----------------------
        pt_left: {
            name: 'Pan/Tilt - Pan Left',
            options: [],
            callback: async () => {
                const cmd = 'pan=left&pan.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_right: {
            name: 'Pan/Tilt - Pan Right',
            options: [],
            callback: async () => {
                const cmd = 'pan=right&pan.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_up: {
            name: 'Pan/Tilt - Tilt Up',
            options: [],
            callback: async () => {
                const cmd = 'tilt=up&tilt.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_down: {
            name: 'Pan/Tilt - Tilt Down',
            options: [],
            callback: async () => {
                const cmd = 'tilt=down&tilt.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_up_left: {
            name: 'Pan/Tilt - Up Left',
            options: [],
            callback: async () => {
                const cmd = 'pan=left&pan.speed.dir=' + self.ptSpeed + '&tilt=up&tilt.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_up_right: {
            name: 'Pan/Tilt - Up Right',
            options: [],
            callback: async () => {
                const cmd = 'pan=right&pan.speed.dir=' + self.ptSpeed + '&tilt=up&tilt.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_down_left: {
            name: 'Pan/Tilt - Down Left',
            options: [],
            callback: async () => {
                const cmd = 'pan=left&pan.speed.dir=' + self.ptSpeed + '&tilt=down&tilt.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_down_right: {
            name: 'Pan/Tilt - Down Right',
            options: [],
            callback: async () => {
                const cmd = 'pan=right&pan.speed.dir=' + self.ptSpeed + '&tilt=down&tilt.speed.dir=' + self.ptSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_stop: {
            name: 'Pan/Tilt - Stop',
            options: [],
            callback: async () => {
                const cmd = 'pan=stop&tilt=stop'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_stop_pan: {
            name: 'Pan/Tilt - Stop Pan Only',
            options: [],
            callback: async () => {
                const cmd = 'pan=stop'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_stop_tilt: {
            name: 'Pan/Tilt - Stop Tilt Only',
            options: [],
            callback: async () => {
                const cmd = 'tilt=stop'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        pt_home: {
            name: 'Pan/Tilt - Home',
            options: [],
            callback: async () => {
                const cmd = 'pan=0&tilt=0'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        // -----------------------
        // Zoom controls (PTZ only if lens supports zoom)
        // -----------------------
        zoom_in: {
            name: 'Lens - Zoom In',
            options: [],
            // Momentary: start on press, stop on release
            subscribe: async () => {
                const cmd = 'zoom=tele&zoom.speed.dir=' + self.zSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
            unsubscribe: async () => {
                const cmd = 'zoom=stop'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
            // Fallback single-shot execution (eg from macros)
            callback: async () => {
                const cmd = 'zoom=tele&zoom.speed.dir=' + self.zSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        zoom_out: {
            name: 'Lens - Zoom Out',
            options: [],
            // Momentary: start on press, stop on release
            subscribe: async () => {
                const cmd = 'zoom=wide&zoom.speed.dir=' + self.zSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
            unsubscribe: async () => {
                const cmd = 'zoom=stop'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
            // Fallback single-shot execution (eg from macros)
            callback: async () => {
                const cmd = 'zoom=wide&zoom.speed.dir=' + self.zSpeed
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        zoom_stop: {
            name: 'Lens - Zoom Stop',
            options: [],
            callback: async () => {
                const cmd = 'zoom=stop'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        // -----------------------
        // Focus controls
        // -----------------------
        focus_near: {
            name: 'Lens - Focus Near',
            options: [],
            callback: async () => {
                const cmd = 'focus.action=near'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        focus_far: {
            name: 'Lens - Focus Far',
            options: [],
            callback: async () => {
                const cmd = 'focus.action=far'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        focus_stop: {
            name: 'Lens - Focus Stop',
            options: [],
            callback: async () => {
                const cmd = 'focus.action=stop'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        autofocus_mode: {
            name: 'Lens - Focus Mode',
            options: [
                focusChoices
                    ? {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'Mode',
                          default: self.data?.focusMode || focusChoices?.[0]?.id || 'auto',
                          choices: focusChoices,
                      }
                    : {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'Mode',
                          default: 'auto',
                          choices: [
                              { id: 'auto', label: 'Auto' },
                              { id: 'manual', label: 'Manual' },
                          ],
                      },
            ],
            callback: async (event) => {
                const mode = event.options?.mode || 'auto'
                const cmd = `focus=${mode}`
                self.data.focusMode = mode
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        exposure_mode_set: {
            name: 'Exposure - Mode',
            options: [
                exposureChoices
                    ? {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'Exposure Mode',
                          default: self.data?.exposureMode || exposureChoices?.[0]?.id || 'auto',
                          choices: exposureChoices,
                      }
                    : {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'Exposure Mode',
                          default: 'auto',
                          choices: [
                              { id: 'auto', label: 'Auto' },
                              { id: 'flickerfree', label: 'Flicker Free' },
                              { id: 'tv', label: 'Shutter Priority' },
                              { id: 'manual', label: 'Manual' },
                          ],
                      },
            ],
            callback: async (event) => {
                const mode = event.options?.mode || 'auto'
                const cmd = `exp=${mode}`
                self.data.exposureMode = mode
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        ae_photometry_set: {
            name: 'Exposure - Photometry',
            options: [
                photometryChoices
                    ? {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'Photometry',
                          default: self.data?.photometry || photometryChoices?.[0]?.id || 'center',
                          choices: photometryChoices,
                      }
                    : {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'Photometry',
                          default: 'center',
                          choices: [
                              { id: 'center', label: 'Center' },
                              { id: 'average', label: 'Average' },
                              { id: 'spot', label: 'Spot' },
                          ],
                      },
            ],
            callback: async (event) => {
                const mode = event.options?.mode || 'center'
                const cmd = `ae.photometry=${mode}`
                self.data.photometry = mode
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        wb_mode_set: {
            name: 'White Balance - Mode',
            options: [
                wbChoices
                    ? {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'WB Mode',
                          default: self.data?.whitebalanceMode || wbChoices?.[0]?.id || 'auto',
                          choices: wbChoices,
                      }
                    : {
                          type: 'dropdown',
                          id: 'mode',
                          label: 'WB Mode',
                          default: 'auto',
                          choices: [
                              { id: 'auto', label: 'Auto' },
                              { id: 'manual', label: 'Manual' },
                          ],
                      },
            ],
            callback: async (event) => {
                const mode = event.options?.mode || 'auto'
                const cmd = `wb=${mode}`
                self.data.whitebalanceMode = mode
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        ae_brightness_set: {
            name: 'Exposure - AE Brightness',
            options: [
                aeBrightnessChoices
                    ? {
                        type: 'dropdown',
                        id: 'value',
                        label: 'AE Brightness',
                        default: String(self.data?.aeBrightness ?? '0'),
                        choices: aeBrightnessChoices,
                      }
                    : {
                        type: 'number',
                        id: 'value',
                        label: `AE Brightness (${ranges?.aeBrightness?.min ?? '-8'}..${ranges?.aeBrightness?.max ?? '8'})`,
                        min: Number(ranges?.aeBrightness?.min ?? -8),
                        max: Number(ranges?.aeBrightness?.max ?? 8),
                        default: Number(ranges?.aeBrightness?.default ?? 0),
                      },
            ],
            callback: async (event) => {
                const value = event.options?.value
                if (value === undefined || value === null || value === '') return
                const cmd = `ae.brightness=${value}`
                self.data.aeBrightness = String(value)
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        me_shutter_set: {
            name: 'Manual Exposure - Shutter',
            options: [
                shutterChoices
                    ? {
                          type: 'dropdown',
                          id: 'value',
                          label: 'Shutter',
                          default: String(self.data?.shutterValue ?? ''),
                          choices: shutterChoices,
                      }
                    : {
                          type: 'textinput',
                          id: 'value',
                          label: 'Shutter (value from camera list)',
                          default: String(self.data?.shutterValue ?? ''),
                      },
            ],
            callback: async (event) => {
                const value = event.options?.value
                if (value === undefined || value === null || value === '') return
                const cmd = `me.shutter=${value}`
                self.data.shutterValue = String(value)
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        me_iris_set: {
            name: 'Manual Exposure - Iris',
            options: [
                {
                    type: 'number',
                    id: 'value',
                    label: ranges?.iris?.min !== undefined && ranges?.iris?.max !== undefined
                        ? `Iris (${ranges.iris.min}..${ranges.iris.max})`
                        : 'Iris',
                    min: ranges?.iris?.min,
                    max: ranges?.iris?.max,
                    default: ranges?.iris?.default,
                },
            ],
            callback: async (event) => {
                const value = event.options?.value
                if (value === undefined || value === null || value === '') return
                const cmd = `me.diaphragm=${value}`
                self.data.irisValue = String(value)
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        me_gain_set: {
            name: 'Manual Exposure - Gain',
            options: [
                {
                    type: 'number',
                    id: 'value',
                    label: ranges?.gain?.min !== undefined && ranges?.gain?.max !== undefined
                        ? `Gain (${ranges.gain.min}..${ranges.gain.max})`
                        : 'Gain',
                    min: ranges?.gain?.min,
                    max: ranges?.gain?.max,
                    default: ranges?.gain?.default,
                },
            ],
            callback: async (event) => {
                const value = event.options?.value
                if (value === undefined || value === null || value === '') return
                const cmd = `me.gain=${value}`
                self.data.gainValue = String(value)
                await self.sendPTZ(self.ptzCommand, cmd)
                self.getCameraInformation_Delayed?.()
            },
        },

        autofocus_one_shot: {
            name: 'Lens - One Shot Auto Focus',
            options: [],
            callback: async () => {
                const cmd = 'focus=one_shot'
                await self.sendPTZ(self.ptzCommand, cmd)
            },
        },

        // -----------------------
        // Native Presets (WebView HTTP/Settings)
        // -----------------------
        native_preset_recall: {
            name: 'Native Preset - Recall (WebView)',
            options: [
                {
                    type: 'dropdown',
                    label: 'Preset Slot',
                    id: 'slot',
                    default: 1,
                    choices: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, label: String(i + 1) })),
                },
            ],
            callback: async (event) => {
                const slot = parseInt(event.options?.slot) || 1
                try {
                    if (typeof self.getCameraInformation === 'function') {
                        await self.getCameraInformation()
                    }
                } catch (_) {}

                const getP = (k) => {
                    const key = `p.${slot}.${k}`
                    const v = self.infoRaw?.[key]
                    return v === undefined || v === null ? '' : String(v)
                }

                const pan = getP('pan')
                const tilt = getP('tilt')
                const zoom = getP('zoom')
                const focusMode = getP('focus')
                const aeB = getP('ae.brightness')
                const shade = getP('shade')
                const shadeParam = getP('shade.param')
                const wb = getP('wb')

                const parts = []
                if (pan !== '') parts.push(`pan=${pan}`)
                if (tilt !== '') parts.push(`tilt=${tilt}`)
                if (zoom !== '') parts.push(`zoom=${zoom}`)
                if (focusMode !== '') {
                    if (focusMode === 'manual') {
                        // Prefer preset focus value if present, else current c.1 focus value
                        const fvPreset = getP('focus.value')
                        const fvCurrent = self.infoRaw?.['c.1.focus.value']
                        if (fvPreset) parts.push(`focus.value=${fvPreset}`)
                        else if (fvCurrent) parts.push(`focus.value=${fvCurrent}`)
                        parts.push('focus=manual')
                    } else {
                        parts.push(`focus=${focusMode}`)
                    }
                }
                if (aeB !== '') parts.push(`ae.brightness=${aeB}`)
                if (shade !== '') parts.push(`shade=${shade}`)
                if (shadeParam !== '') parts.push(`shade.param=${shadeParam}`)
                if (wb !== '') parts.push(`wb=${wb}`)

                const cmd = parts.join('&')
                if (cmd) {
                    if (self.config?.verbose) self.log?.('info', `Native preset recall ${slot} -> ${cmd}`)
                    await self.sendPTZ(self.ptzCommand, cmd)
                    self.getCameraInformation_Delayed?.()
                } else {
                    self.log?.('error', `Native preset ${slot} appears empty in info.cgi`)
                }
            },
        },

        native_preset_save: {
            name: 'Native Preset - Save (WebView Settings)',
            options: [
                {
                    type: 'dropdown',
                    label: 'Preset Slot',
                    id: 'slot',
                    default: 1,
                    choices: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, label: String(i + 1) })),
                },
                {
                    type: 'textinput',
                    label: 'Preset Name',
                    id: 'name',
                    default: 'preset',
                },
            ],
            callback: async (event) => {
                const slot = parseInt(event.options?.slot) || 1
                // Settings protocol (eaXX-<index>) uses 0-based indices, while info.cgi reports 1-based (p.1..p.20)
                const slot0 = Math.max(0, (slot | 0) - 1)
                const name = (event.options?.name || '').trim() || `preset_${slot}`
                try {
                    if (typeof self.getCameraInformation === 'function') {
                        await self.getCameraInformation()
                    }
                } catch (_) {}

                const getC = (k) => {
                    const key = `c.1.${k}`
                    const v = self.infoRaw?.[key]
                    return v === undefined || v === null ? '' : String(v)
                }

                const pan = getC('pan')
                const tilt = getC('tilt')
                const zoom = getC('zoom')
                const aeB = getC('ae.brightness')
                const shadeParam = getC('shade.param')
                const focusMode = getC('focus')
                const focusValue = getC('focus.value')

                const toFixed2 = (n) => {
                    if (n === '') return ''
                    const f = Number(n)
                    if (!isFinite(f)) return ''
                    return (f / 100).toFixed(2)
                }
                const panFx = toFixed2(pan)
                const tiltFx = toFixed2(tilt)
                const zoomFx = toFixed2(zoom)
                const aeSettings = aeB === '' ? '' : String(Math.trunc(Number(aeB) / 2))
                const shadeParamSettings = shadeParam === '' ? '' : String(Number(shadeParam) + 1)

                const tx = []
                tx.push(`ea00-${slot0}=1`)
                // Write both ASCII and UTF-8 names to keep fields in sync
                tx.push(`ea01-${slot0}=${encodeURIComponent(name)}`)
                tx.push(`ea02-${slot0}=${encodeURIComponent(name)}`)
                if (panFx) tx.push(`ea04-${slot0}=${panFx}`)
                if (tiltFx) tx.push(`ea05-${slot0}=${tiltFx}`)
                if (zoomFx) tx.push(`ea06-${slot0}=${zoomFx}`)
                if (aeSettings !== '') tx.push(`ea07-${slot0}=${aeSettings}`)
                if (shadeParamSettings !== '') tx.push(`ea12-${slot0}=${shadeParamSettings}`)
                // If current focus is manual and we have a numeric value, persist it in the preset (settings protocol uses ea10 for manual focus value)
                if (focusMode === 'manual' && focusValue !== '') {
                    tx.push(`ea10-${slot0}=${focusValue}`)
                }

                const txStr = tx.join('&')
                if (self.config?.verbose) self.log?.('info', `Native preset save ${slot} (ea index ${slot0}) WRITE -> ${txStr}`)
                const api = new API(self.config)
                // Use GET for settings protocol; some devices ignore POST bodies on /admin/-set-?
                await api.sendRequest('/admin/-set-?' + txStr)
                if (self.config?.verbose) self.log?.('info', `Native preset save ${slot} (ea index ${slot0}) SAVE -> pt=4`)
                // Commit via admin settings endpoint; add small retry/backoff for transient C006
                const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
                let ok = false
                for (let attempt = 0; attempt < 3 && !ok; attempt++) {
                    const commit = await api.sendRequest('/admin/-set-?pt=4')
                    const body = commit?.response?.data ? String(commit.response.data) : ''
                    if (commit?.status === 'ok' && /Status=0/.test(body)) {
                        ok = true
                        break
                    }
                    if (self.config?.verbose) {
                        const msg = body && body.length < 200 ? body.replace(/\s+/g, ' ') : commit?.status
                        self.log?.('warn', `Commit pt=4 attempt ${attempt + 1} not OK: ${msg}`)
                    }
                    await sleep([200, 400, 800][attempt] || 400)
                }
                // Allow more time for info.cgi to reflect the new preset values
                self.getCameraInformation_Delayed?.(1500)
            },
        },
    }

    // Hide native preset actions if PTZ not supported at all or native presets unsupported
    const supportsNativePresets = !!self.capabilities?.supportsNativePresets
    if (!supportsPTZ || !supportsNativePresets) {
        const nKeys = ['native_preset_recall', 'native_preset_save']
        for (const k of nKeys) delete actions[k]
    }

    self.setActionDefinitions?.(actions)
}
