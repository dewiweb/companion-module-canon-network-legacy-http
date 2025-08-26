module.exports = function (self) {
	const presets = {}
	// TODO: PTZF position presets (1–10) when supported
	self.setPresetDefinitions?.(presets)
}
