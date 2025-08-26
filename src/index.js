const { InstanceBase, runEntrypoint } = require('@companion-module/base')

class CanonLegacyHttpInstance extends InstanceBase {
	async init(config) {
		this.config = config
		this.data = {}
		// TODO: init actions/feedbacks/variables/polling once implemented
	}

	async configUpdated(config) {
		this.config = config
		// TODO: re-init if needed
	}

	async destroy() {
		// TODO: cleanup timers/sockets if any
	}
}

runEntrypoint(CanonLegacyHttpInstance, {
	// TODO: Upgrade scripts if any
})
