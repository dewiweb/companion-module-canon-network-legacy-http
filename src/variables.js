module.exports = function (self) {
	const variables = [
		{ variableId: 'panValue', name: 'Pan value' },
		{ variableId: 'tiltValue', name: 'Tilt value' },
		{ variableId: 'zoomValue', name: 'Zoom value' },
		{ variableId: 'focusValue', name: 'Focus value' },
		{ variableId: 'autoFocusMode', name: 'AF mode' },

		{ variableId: 'exposureMode', name: 'Exposure mode' },
		{ variableId: 'shutterValue', name: 'Shutter' },
		{ variableId: 'irisValue', name: 'Iris' },
		{ variableId: 'gainValue', name: 'Gain' },
		{ variableId: 'whitebalanceMode', name: 'White balance mode' },

		{ variableId: 'cameraName', name: 'Camera name' },
		{ variableId: 'firmwareVersion', name: 'Firmware version' },
		{ variableId: 'protocolVersion', name: 'Protocol version' },
		{ variableId: 'presetLastUsed', name: 'Preset last used' },
	]

	self.setVariableDefinitions?.(variables)
}
