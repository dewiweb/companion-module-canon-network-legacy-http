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
		const result = await connection.sendRequest('info.cgi')
		if (result && result.response && result.response.data) {
			try {
				const lines = String(result.response.data).split('\n')
				for (const line of lines) {
					const parts = line.trim().split('=')
					parts[0] = (parts[0] || '').replace(':', '')
					this.storeData(parts)
				}
				this.updateStatus && this.updateStatus(InstanceStatus.Ok)
				this.checkVariables && this.checkVariables()
				this.checkFeedbacks && this.checkFeedbacks()
			} catch (e) {
				this.updateStatus && this.updateStatus(InstanceStatus.Error)
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
				this.data.autoFocusMode = val
				break

			// Pan/Tilt absolute values
			case 'c.1.pan':
				this.data.panValue = val
				break
			case 'c.1.tilt':
				this.data.tiltValue = val
				break

			// Exposure basics
			case 'c.1.shooting':
				this.data.exposureShootingMode = val
				break
			case 'c.1.exp':
				this.data.exposureMode = val
				break
			case 'c.1.me.shutter.mode':
				this.data.shutterMode = val
				break
			case 'c.1.me.shutter':
				this.data.shutterValue = val
				break
			case 'c.1.me.diaphragm.mode':
				this.data.irisMode = val
				break
			case 'c.1.me.diaphragm':
				this.data.irisValue = val
				break
			case 'c.1.me.gain.mode':
				this.data.gainMode = val
				break
			case 'c.1.me.gain':
				this.data.gainValue = val
				break

			// White balance basics
			case 'c.1.wb':
				this.data.whitebalanceMode = val
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

			// Presets meta
			case 'p':
				this.data.presetLastUsed = parseInt(val)
				break

			default:
				break
		}
	}
}
