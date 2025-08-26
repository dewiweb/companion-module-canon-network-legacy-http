const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const Actions = require('./actions')
const Config = require('./config')
const Variables = require('./variables')
const Presets = require('./presets')
const Feedbacks = require('./feedbacks')
const Polling = require('./polling')
const { MODELS, SERIES_SPECS } = require('./models')

class CanonLegacyHttpInstance extends InstanceBase {
    getConfigFields() {
        // Expose config fields early for the host UI
        return Config.getConfigFields()
    }
	async init(config) {
		this.config = config
		this.data = { positionPresets: new Array(10).fill(null) }
		// Command base paths used by actions
		this.ptzCommand = 'control.cgi?'
		this.powerCommand = 'standby.cgi?'
		this.maintainCommand = 'maintain?'
		// Default speeds
		this.ptSpeed = 625
		this.zSpeed = 8
		this.fSpeed = 1
		this.computeCapabilitiesFromConfig()
		Object.assign(this, Config)
		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.initPresets()
		Object.assign(this, Polling)
		this.initPolling()
	}

	async configUpdated(config) {
		this.config = config
		// Defaults
		if (!this.config || typeof this.config.httpPort !== 'number') this.config.httpPort = 80
		if (!this.config || typeof this.config.poll_interval !== 'number') this.config.poll_interval = 2000
		if (!this.config || typeof this.config.httpTimeout !== 'number') this.config.httpTimeout = 5000
		if (!this.config || typeof this.config.username !== 'string') this.config.username = ''
		if (!this.config || typeof this.config.password !== 'string') this.config.password = ''
		this.computeCapabilitiesFromConfig()
		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.initPresets()
		this.initPolling()
	}

	async destroy() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			delete this.pollTimer
		}
	}

	initActions() {
		Actions(this)
	}

	initVariables() {
		Variables(this)
	}

	initFeedbacks() {
		Feedbacks(this)
	}

	initPresets() {
		Presets(this)
	}

	computeCapabilitiesFromConfig() {
		const modelId = this.config?.model
		const model = MODELS.find((m) => m.id === modelId)
		const series = SERIES_SPECS.find((s) => s.id === model?.series)
		this.seriesSpec = series || {}
		this.capabilities = {
			supportsPTZ: !!series?.supportsPTZ,
			supportsZoom: !!series?.supportsZoom,
			supportsNativePresets: !!series?.supportsNativePresets,
			posPresetsPTZF: !!series?.posPresetsPTZF,
		}
	}

	updateCapabilitiesFromData() {
		// Some fixed cameras report read-only pan/tilt/zoom values.
		// Only elevate capabilities if they are currently undefined, not when explicitly false per series.
		const hasPanTilt = this.data?.panValue !== undefined || this.data?.tiltValue !== undefined
		const hasZoom = this.data?.zoomValue !== undefined
		let changed = false
		if (hasPanTilt && this.capabilities && this.capabilities.supportsPTZ === undefined) {
			this.capabilities.supportsPTZ = true
			changed = true
		}
		if (hasZoom && this.capabilities && this.capabilities.supportsZoom === undefined) {
			this.capabilities.supportsZoom = true
			changed = true
		}
		if (changed) {
			this.initActions()
			this.initVariables?.()
			this.initPresets?.()
		}
	}

	checkVariables() {
		const values = {}
		// Publish model-driven variables from series variableSpec
		const spec = this.seriesSpec?.variableSpec || []
		if (Array.isArray(spec)) {
			for (const v of spec) {
				if (!v || !v.id) continue
				const key = v.fromKey
				if (key && this.infoRaw && Object.prototype.hasOwnProperty.call(this.infoRaw, key)) {
					values[v.id] = this.infoRaw[key] ?? ''
				} else {
					// fallback to normalized data fields if present
					values[v.id] = this.data?.[v.id] ?? ''
				}
			}
		}
		// Always include presetLastUsed
		values['presetLastUsed'] = this.data?.presetLastUsed ?? ''
		// Also expose PTZF preset slots as variables if supported
		if (this.capabilities?.posPresetsPTZF) {
			const presets = this.data.positionPresets || []
			for (let i = 1; i <= 10; i++) {
				const p = presets[i - 1] || {}
				values[`pospreset_${i}_pan`] = p.pan ?? ''
				values[`pospreset_${i}_tilt`] = p.tilt ?? ''
				values[`pospreset_${i}_zoom`] = p.zoom ?? ''
				values[`pospreset_${i}_focus`] = p.focus ?? ''
			}
		}

		// Populate native camera preset variables from info.cgi (only when supported)
		if (this.capabilities?.supportsNativePresets && this.infoRaw) {
			const countRaw = this.infoRaw['p.count']
			const count = typeof countRaw === 'string' || typeof countRaw === 'number' ? String(countRaw) : ''
			values['preset_count'] = count
			for (let i = 1; i <= 20; i++) {
				const nameAsc = this.infoRaw[`p.${i}.name.asc`]
				values[`native_preset_${i}_name`] = (nameAsc ?? '')
				values[`native_preset_${i}_pan`] = this.infoRaw[`p.${i}.pan`] ?? ''
				values[`native_preset_${i}_tilt`] = this.infoRaw[`p.${i}.tilt`] ?? ''
				values[`native_preset_${i}_zoom`] = this.infoRaw[`p.${i}.zoom`] ?? ''
				values[`native_preset_${i}_focus`] = this.infoRaw[`p.${i}.focus`] ?? ''
				values[`native_preset_${i}_ae_brightness`] = this.infoRaw[`p.${i}.ae.brightness`] ?? ''
				values[`native_preset_${i}_shade`] = this.infoRaw[`p.${i}.shade`] ?? ''
				values[`native_preset_${i}_shade_param`] = this.infoRaw[`p.${i}.shade.param`] ?? ''
				values[`native_preset_${i}_wb`] = this.infoRaw[`p.${i}.wb`] ?? ''
			}
		}
		this.setVariableValues?.(values)
	}

	// Simple helpers adapted for legacy HTTP
	async sendPTZ(command, query) {
		try {
			if (query !== undefined) {
				const API = require('./api')
				const connection = new API(this.config)
				const res = await connection.sendRequest(`${command}${query}`)
				if (!res || res.status !== 'ok') {
					if (this.config?.verbose) {
						const msg = res?.error?.message || res?.error || 'unknown error'
						console.warn(`[Canon Legacy HTTP] Action request failed: ${command}${query} -> ${msg}`)
					}
					this.updateStatus && this.updateStatus(InstanceStatus.Error)
				}
			}
		} catch (e) {
			if (this.config?.verbose) {
				console.warn(`[Canon Legacy HTTP] Action request exception: ${command}${query} -> ${e?.message || e}`)
			}
			this.updateStatus && this.updateStatus(InstanceStatus.Error)
		}
	}

	getCameraInformation_Delayed(ms = 300) {
		setTimeout(() => {
			this.getCameraInformation?.()
		}, ms)
	}
}

runEntrypoint(CanonLegacyHttpInstance, UpgradeScripts)
