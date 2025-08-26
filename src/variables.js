module.exports = function (self) {
	const variables = []

	// From series spec: curated model-driven variables
	const spec = self.seriesSpec?.variableSpec || []
	if (Array.isArray(spec)) {
		for (const v of spec) {
			if (!v || !v.id || !v.name) continue
			variables.push({ variableId: v.id, name: v.name })
		}
	}

	// Always include presetLastUsed
	variables.push({ variableId: 'presetLastUsed', name: 'Preset last used' })

	// Add PTZF Position Preset variables when supported
	if (self.capabilities?.posPresetsPTZF) {
		for (let i = 1; i <= 10; i++) {
			variables.push({ variableId: `pospreset_${i}_pan`, name: `PTZF Preset ${i} - Pan` })
			variables.push({ variableId: `pospreset_${i}_tilt`, name: `PTZF Preset ${i} - Tilt` })
			variables.push({ variableId: `pospreset_${i}_zoom`, name: `PTZF Preset ${i} - Zoom` })
			variables.push({ variableId: `pospreset_${i}_focus`, name: `PTZF Preset ${i} - Focus` })
		}
	}

	// Native camera presets from info.cgi (WebView) — expose only when supported
	if (self.capabilities?.supportsNativePresets) {
		variables.push({ variableId: 'preset_count', name: 'Native Presets - Count' })
		for (let i = 1; i <= 20; i++) {
			variables.push({ variableId: `native_preset_${i}_name`, name: `Native Preset ${i} - Name` })
			variables.push({ variableId: `native_preset_${i}_pan`, name: `Native Preset ${i} - Pan` })
			variables.push({ variableId: `native_preset_${i}_tilt`, name: `Native Preset ${i} - Tilt` })
			variables.push({ variableId: `native_preset_${i}_zoom`, name: `Native Preset ${i} - Zoom` })
			variables.push({ variableId: `native_preset_${i}_focus`, name: `Native Preset ${i} - Focus` })
			variables.push({ variableId: `native_preset_${i}_ae_brightness`, name: `Native Preset ${i} - AE Brightness` })
			variables.push({ variableId: `native_preset_${i}_shade`, name: `Native Preset ${i} - Shade` })
			variables.push({ variableId: `native_preset_${i}_shade_param`, name: `Native Preset ${i} - Shade Param` })
			variables.push({ variableId: `native_preset_${i}_wb`, name: `Native Preset ${i} - White Balance` })
		}
	}

	self.setVariableDefinitions?.(variables)
}
