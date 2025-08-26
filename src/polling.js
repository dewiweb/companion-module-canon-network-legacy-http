const { InstanceStatus } = require('@companion-module/base')
const API = require('./api')

module.exports = {
	initPolling() {
		if (this.pollTimer) clearInterval(this.pollTimer)
		if (this.config.poll_interval > 0) {
			this.pollTimer = setInterval(() => this.getCameraInformation(), this.config.poll_interval)
		}
	},

	async getCameraInformation() {
		const connection = new API(this.config)
		this.config?.verbose && console.log('[Canon Legacy HTTP] Polling info.cgi')
		const result = await connection.sendRequest('info.cgi')
		if (!result || result.status !== 'ok' || !result.response) {
			this.updateStatus && this.updateStatus(InstanceStatus.Error)
			this.config?.verbose && console.warn('[Canon Legacy HTTP] Polling failed')
			return
		}
		if (result && result.response && result.response.data) {
			try {
				const lines = String(result.response.data).split('\n')
				this._listsChanged = false
				this.infoRaw = this.infoRaw || {}
				this._infoKeysSet = this._infoKeysSet || new Set(Object.keys(this.infoRaw))
				let newKeysDiscovered = false
				for (const line of lines) {
					const parts = line.trim().split('=')
					parts[0] = (parts[0] || '').replace(':', '')
					// Keep raw map of info.cgi values
					const key = parts[0]
					const val = parts[1]
					if (key) {
						this.infoRaw[key] = val
						if (!this._infoKeysSet.has(key)) {
							this._infoKeysSet.add(key)
							newKeysDiscovered = true
						}
					}
					this.storeData(parts)
				}
				this.updateCapabilitiesFromData?.()
				if (this._listsChanged) {
					this.initActions?.()
					this.initVariables?.()
					this._listsChanged = false
				}
				// Rebuild variables if new info.cgi keys appeared
				if (newKeysDiscovered) {
					this.initVariables?.()
				}
				// If the presence of PTZ/Zoom values changed since last poll, rebuild variables
				const ptzPresentNow = this.data?.panValue !== undefined || this.data?.tiltValue !== undefined
				const zoomPresentNow = this.data?.zoomValue !== undefined || this.data?.focusValue !== undefined
				if (ptzPresentNow !== this._ptzPresent || zoomPresentNow !== this._zoomPresent) {
					this._ptzPresent = ptzPresentNow
					this._zoomPresent = zoomPresentNow
					this.initVariables?.()
				}
				this.updateStatus && this.updateStatus(InstanceStatus.Ok)
				this.checkVariables && this.checkVariables()
				this.checkFeedbacks && this.checkFeedbacks()
			} catch (e) {
				this.updateStatus && this.updateStatus(InstanceStatus.Error)
				this.config?.verbose && console.warn('[Canon Legacy HTTP] Polling parse error', e)
			}
		}
	},

	storeData(parts) {
		// Basic parser for legacy HTTP models (e.g., VB-H41)
		// parts[0] = key, parts[1] = value
		if (!Array.isArray(parts) || parts.length < 2) return
		const key = parts[0]
		const val = parts[1]

		this.data = this.data || {}

		switch (key) {
			// System
			case 'c.1.type':
				this.data.modelDetected = val
				break
			case 's.hardware':
				this.data.hardwareModel = val
				break
			case 'c.1.name.utf8':
				this.data.cameraName = val
				break
			case 'f.standby':
				this.data.powerState = val
				break
			case 'f.tally':
				this.data.tallyState = val
				break
			case 's.firmware':
				this.data.firmwareVersion = val
				break
			case 's.protocol':
				this.data.protocolVersion = val
				break

			// Lens core
			case 'c.1.zoom':
				this.data.zoomValue = val
				break
			case 'c.1.focus.value':
				this.data.focusValue = val
				break
			case 'c.1.focus':
				// Some models report 'auto'/'manual'; others may differ
				this.data.autoFocusMode = val
				this.data.focusMode = val
				break
			case 'c.1.focus.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.focusList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.focusList = next
						this._listsChanged = true
					}
				}
				break

			// Pan/Tilt absolute values
			case 'c.1.pan':
				this.data.panValue = val
				break
			case 'c.1.tilt':
				this.data.tiltValue = val
				break
			case 'c.1.pan.min':
				this.data.panMin = val
				break
			case 'c.1.pan.max':
				this.data.panMax = val
				break
			case 'c.1.pan.limit.min':
				this.data.panLimitMin = val
				break
			case 'c.1.pan.limit.max':
				this.data.panLimitMax = val
				break
			case 'c.1.pan.speed.min':
				this.data.panSpeedMin = val
				break
			case 'c.1.pan.speed.max':
				this.data.panSpeedMax = val
				break
			case 'c.1.pan.speed.ratio.min':
				this.data.panSpeedRatioMin = val
				break
			case 'c.1.pan.speed.ratio.max':
				this.data.panSpeedRatioMax = val
				break

			case 'c.1.tilt.min':
				this.data.tiltMin = val
				break
			case 'c.1.tilt.max':
				this.data.tiltMax = val
				break
			case 'c.1.tilt.limit.min':
				this.data.tiltLimitMin = val
				break
			case 'c.1.tilt.limit.max':
				this.data.tiltLimitMax = val
				break
			case 'c.1.tilt.speed.min':
				this.data.tiltSpeedMin = val
				break
			case 'c.1.tilt.speed.max':
				this.data.tiltSpeedMax = val
				break
			case 'c.1.tilt.speed.ratio.min':
				this.data.tiltSpeedRatioMin = val
				break
			case 'c.1.tilt.speed.ratio.max':
				this.data.tiltSpeedRatioMax = val
				break

			// Exposure basics
			case 'c.1.shooting':
				this.data.exposureShootingMode = val
				break
			case 'c.1.exp':
				this.data.exposureMode = val
				break
			case 'c.1.exp.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.exposureModeList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.exposureModeList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.ae.brightness':
				this.data.aeBrightness = val
				break
			case 'c.1.ae.brightness.min':
				this.data.aeBrightnessMin = val
				break
			case 'c.1.ae.brightness.max':
				this.data.aeBrightnessMax = val
				break
			case 'c.1.ae.brightness.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.aeBrightnessList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.aeBrightnessList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.ae.photometry':
				this.data.photometry = val
				break
			case 'c.1.ae.photometry.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.photometryList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.photometryList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.ae.shutter.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.aeShutterList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.aeShutterList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.me.shutter.mode':
				this.data.shutterMode = val
				break
			case 'c.1.me.shutter':
				this.data.shutterValue = val
				break
			case 'c.1.me.shutter.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.meShutterList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.meShutterList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.me.diaphragm.mode':
				this.data.irisMode = val
				break
			case 'c.1.me.diaphragm':
				this.data.irisValue = val
				break
			case 'c.1.me.iris.min':
				this.data.irisMin = val
				break
			case 'c.1.me.iris.max':
				this.data.irisMax = val
				break
			case 'c.1.me.gain.mode':
				this.data.gainMode = val
				break
			case 'c.1.me.gain':
				this.data.gainValue = val
				break
			case 'c.1.me.gain.min':
				this.data.gainMin = val
				break
			case 'c.1.me.gain.max':
				this.data.gainMax = val
				break

			// White balance basics
			case 'c.1.wb':
				this.data.whitebalanceMode = val
				break
			case 'c.1.wb.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.wbModeList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.wbModeList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.wb.kelvin':
				this.data.kelvinValue = val
				break
			case 'c.1.wb.shift.rgain':
				this.data.rGainValue = val
				break
			case 'c.1.wb.shift.bgain':
				this.data.bGainValue = val
				break

			// Image enhancements and modes
			case 'c.1.dn':
				this.data.dn = val
				break
			case 'c.1.dn.mode':
				this.data.dnMode = val
				break
			case 'c.1.dn.mode.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.dnModeList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.dnModeList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.nr':
				this.data.nr = val
				break
			case 'c.1.nr.min':
				this.data.nrMin = val
				break
			case 'c.1.nr.max':
				this.data.nrMax = val
				break
			case 'c.1.ac':
				this.data.ac = val
				break
			case 'c.1.ac.min':
				this.data.acMin = val
				break
			case 'c.1.ac.max':
				this.data.acMax = val
				break
			case 'c.1.saturation':
				this.data.saturation = val
				break
			case 'c.1.saturation.min':
				this.data.saturationMin = val
				break
			case 'c.1.saturation.max':
				this.data.saturationMax = val
				break
			case 'c.1.shade':
				this.data.shade = val
				break
			case 'c.1.shade.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.shadeList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.shadeList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.shade.param':
				this.data.shadeParam = val
				break
			case 'c.1.shade.param.min':
				this.data.shadeParamMin = val
				break
			case 'c.1.shade.param.max':
				this.data.shadeParamMax = val
				break
			case 'c.1.defog':
				this.data.defog = val
				break
			case 'c.1.defog.list':
				{
					const next = (val || '').split(',').filter(Boolean)
					const prev = this.data.defogList || []
					if (JSON.stringify(prev) !== JSON.stringify(next)) {
						this.data.defogList = next
						this._listsChanged = true
					}
				}
				break
			case 'c.1.defog.param.min':
				this.data.defogParamMin = val
				break
			case 'c.1.defog.param.max':
				this.data.defogParamMax = val
				break

			// Zoom ranges
			case 'c.1.zoom.min':
				this.data.zoomMin = val
				break
			case 'c.1.zoom.max':
				this.data.zoomMax = val
				break
			case 'c.1.zoom.limit.min':
				this.data.zoomLimitMin = val
				break
			case 'c.1.zoom.limit.max':
				this.data.zoomLimitMax = val
				break
			case 'c.1.zoom.speed.min':
				this.data.zoomSpeedMin = val
				break
			case 'c.1.zoom.speed.max':
				this.data.zoomSpeedMax = val
				break
			case 'c.1.zoom.d':
				this.data.zoomDigitalStep = val
				break

			// Home / view
			case 'c.1.home.pan':
				this.data.homePan = val
				break
			case 'c.1.home.tilt':
				this.data.homeTilt = val
				break
			case 'c.1.home.zoom':
				this.data.homeZoom = val
				break
			case 'c.1.home.focus':
				this.data.homeFocus = val
				break
			case 'c.1.home.wb':
				this.data.homeWb = val
				break
			case 'c.1.home.ae.brightness':
				this.data.homeAeBrightness = val
				break
			case 'c.1.view':
				this.data.view = val
				break
			case 'c.1.view.restriction':
				this.data.viewRestriction = val
				break

			// Presets meta
			case 'p':
				this.data.presetLastUsed = parseInt(val)
				break

			default:
				break
		}
	}
}
