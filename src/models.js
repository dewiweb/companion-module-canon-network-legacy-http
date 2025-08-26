module.exports = {
	MODELS: [
		{ id: 'VB-H41', label: 'VB-H41 (PTZ)', series: 'legacy-http-ptz' },
		{ id: 'VB-H730F', label: 'VB-H730F (Static)', series: 'legacy-http-static' },
	],
	SERIES_SPECS: [
		{
			id: 'legacy-http-ptz',
			label: 'Legacy HTTP PTZ Series',
			supportsPTZ: true,
			supportsZoom: true,
			supportsNativePresets: true,
			// Disable legacy PTZF variables-based position presets in favor of native presets
			posPresetsPTZF: false,
			// Variables to expose for PTZ series and their source keys in info.cgi
			variableSpec: [
				{ id: 'cameraName', name: 'Camera name', fromKey: 'c.1.name.utf8' },
				{ id: 'firmwareVersion', name: 'Firmware version', fromKey: 's.firmware' },
				{ id: 'protocolVersion', name: 'Protocol version', fromKey: 's.protocol' },
				{ id: 'exposureMode', name: 'Exposure mode', fromKey: 'c.1.exp' },
				{ id: 'photometry', name: 'Photometry', fromKey: 'c.1.ae.photometry' },
				{ id: 'aeBrightness', name: 'AE brightness', fromKey: 'c.1.ae.brightness' },
				{ id: 'shutterValue', name: 'Shutter', fromKey: 'c.1.me.shutter' },
				{ id: 'irisValue', name: 'Iris', fromKey: 'c.1.me.diaphragm' },
				{ id: 'gainValue', name: 'Gain', fromKey: 'c.1.me.gain' },
				{ id: 'whitebalanceMode', name: 'White balance mode', fromKey: 'c.1.wb' },
				{ id: 'autoFocusMode', name: 'AF mode', fromKey: 'c.1.focus' },
				{ id: 'focusValue', name: 'Focus value', fromKey: 'c.1.focus.value' },
				{ id: 'panValue', name: 'Pan value', fromKey: 'c.1.pan' },
				{ id: 'tiltValue', name: 'Tilt value', fromKey: 'c.1.tilt' },
				{ id: 'zoomValue', name: 'Zoom value', fromKey: 'c.1.zoom' },
			],
		},
		{
			id: 'legacy-http-static',
			label: 'Legacy HTTP Static Series',
			supportsPTZ: false,
			supportsZoom: false,
			supportsNativePresets: false,
			// Variables to expose for static series
			variableSpec: [
				{ id: 'cameraName', name: 'Camera name', fromKey: 'c.1.name.utf8' },
				{ id: 'firmwareVersion', name: 'Firmware version', fromKey: 's.firmware' },
				{ id: 'protocolVersion', name: 'Protocol version', fromKey: 's.protocol' },
				{ id: 'exposureMode', name: 'Exposure mode', fromKey: 'c.1.exp' },
				{ id: 'photometry', name: 'Photometry', fromKey: 'c.1.ae.photometry' },
				{ id: 'aeBrightness', name: 'AE brightness', fromKey: 'c.1.ae.brightness' },
				{ id: 'shutterValue', name: 'Shutter', fromKey: 'c.1.me.shutter' },
				{ id: 'irisValue', name: 'Iris', fromKey: 'c.1.me.diaphragm' },
				{ id: 'gainValue', name: 'Gain', fromKey: 'c.1.me.gain' },
				{ id: 'whitebalanceMode', name: 'White balance mode', fromKey: 'c.1.wb' },
				{ id: 'autoFocusMode', name: 'AF mode', fromKey: 'c.1.focus' },
				{ id: 'focusValue', name: 'Focus value', fromKey: 'c.1.focus.value' },
				// Note: omit PTZ and Zoom values to avoid implying control; we can add later if desired
			],
		},
	],
}
