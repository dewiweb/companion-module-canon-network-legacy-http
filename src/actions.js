module.exports = function (self) {
	const actions = {}
	// TODO: implement legacy HTTP actions (PTZF save/recall, lens, exposure, WB, system)
	self.setActionDefinitions?.(actions)
}
