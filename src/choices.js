module.exports = function (self) {
	// Helper to convert a list array into Companion dropdown choices
	const makeChoices = (arr, labelMap) => {
		if (!Array.isArray(arr) || arr.length === 0) return undefined
		return arr.map((id) => ({ id, label: labelMap?.[id] || String(id) }))
	}

	return {
		// Focus mode choices
		focusChoices: makeChoices(self.data?.focusList, { auto: 'Auto', manual: 'Manual', infinity: 'Infinity' }),
		// Exposure mode choices
		exposureChoices: makeChoices(self.data?.exposureModeList, { auto: 'Auto', flickerfree: 'Flicker Free', tv: 'Shutter Priority', manual: 'Manual' }),
		// Photometry choices
		photometryChoices: makeChoices(self.data?.photometryList, { center: 'Center', average: 'Average', spot: 'Spot' }),
		// White balance mode choices
		wbChoices: makeChoices(self.data?.wbModeList, { auto: 'Auto', manual: 'Manual', one_shot: 'One Shot', sodium: 'Sodium', halogen: 'Halogen', mercury: 'Mercury', fluorescent_w: 'Fluorescent W', fluorescent_l: 'Fluorescent L', fluorescent_h: 'Fluorescent H' }),
		// AE Brightness choices (if provided as a list)
		aeBrightnessChoices: makeChoices(self.data?.aeBrightnessList),
		// Manual exposure shutter list (preferred when setting me.shutter)
		shutterChoices: makeChoices(self.data?.meShutterList || self.data?.aeShutterList),
		// Ranges (used when lists are not present)
		ranges: {
			aeBrightness: {
				min: Number(self.data?.aeBrightnessMin ?? -8),
				max: Number(self.data?.aeBrightnessMax ?? 8),
				default: Number(self.data?.aeBrightness ?? 0),
			},
			iris: {
				min: self.data?.irisMin !== undefined ? Number(self.data?.irisMin) : undefined,
				max: self.data?.irisMax !== undefined ? Number(self.data?.irisMax) : undefined,
				default: self.data?.irisValue !== undefined ? Number(self.data?.irisValue) : undefined,
			},
			gain: {
				min: self.data?.gainMin !== undefined ? Number(self.data?.gainMin) : undefined,
				max: self.data?.gainMax !== undefined ? Number(self.data?.gainMax) : undefined,
				default: self.data?.gainValue !== undefined ? Number(self.data?.gainValue) : undefined,
			},
		},
	}
}
