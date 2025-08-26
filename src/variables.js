module.exports = function (self) {
	const variables = []
	// TODO: define variables for legacy HTTP models (pan/tilt/zoom/focus, exposure, wb, system)
	self.setVariableDefinitions?.(variables)
}
