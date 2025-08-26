const { InstanceBase, runEntrypoint } = require('@companion-module/base')
const Actions = require('./actions')
const Variables = require('./variables')
const Polling = require('./polling')

class CanonLegacyHttpInstance extends InstanceBase {
	async init(config) {
		this.config = config
		this.data = { positionPresets: new Array(10).fill(null) }
		this.initActions()
		this.initVariables()
		Object.assign(this, Polling)
		this.initPolling()
	}

	async configUpdated(config) {
		this.config = config
		this.initActions()
		this.initVariables()
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

	checkVariables() {
		const values = {
			panValue: this.data.panValue ?? '',
			tiltValue: this.data.tiltValue ?? '',
			zoomValue: this.data.zoomValue ?? '',
			focusValue: this.data.focusValue ?? '',
			autoFocusMode: this.data.autoFocusMode ?? '',
			exposureMode: this.data.exposureMode ?? '',
			shutterValue: this.data.shutterValue ?? '',
			irisValue: this.data.irisValue ?? '',
			gainValue: this.data.gainValue ?? '',
			whitebalanceMode: this.data.whitebalanceMode ?? '',
			cameraName: this.data.cameraName ?? '',
			firmwareVersion: this.data.firmwareVersion ?? '',
			protocolVersion: this.data.protocolVersion ?? '',
			presetLastUsed: this.data.presetLastUsed ?? '',
		}
		this.setVariableValues?.(values)
	}
}

runEntrypoint(CanonLegacyHttpInstance, {
	// TODO: Upgrade scripts if any
})
