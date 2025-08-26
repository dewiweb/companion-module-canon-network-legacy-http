module.exports = function (self) {
	const feedbacks = {}

	feedbacks.power_state = {
		name: 'Power State',
		description: 'Change style when power state matches',
		type: 'boolean',
		defaultStyle: {
			color: 0xFFFFFF,
			bgcolor: 0x33691E, // green-ish when matched
		},
		options: [
			{
				type: 'dropdown',
				label: 'State',
				id: 'state',
				default: 'idle',
				choices: [
					{ id: 'idle', label: 'On (idle)' },
					{ id: 'standby', label: 'Standby' },
				],
			},
		],
		callback: (fb) => {
			return self.data?.powerState === fb.options?.state
		},
	}

	feedbacks.focus_mode = {
		name: 'Focus Mode',
		description: 'Change style when focus mode matches',
		type: 'boolean',
		defaultStyle: {
			color: 0xFFFFFF,
			bgcolor: 0x1E88E5, // blue when matched
		},
		options: [
			{
				type: 'dropdown',
				label: 'Mode',
				id: 'mode',
				default: 'auto',
				choices: [
					{ id: 'auto', label: 'Auto' },
					{ id: 'manual', label: 'Manual' },
				],
			},
		],
		callback: (fb) => {
			const mode = self.data?.focusMode || self.data?.autoFocusMode
			return mode === fb.options?.mode
		},
	}

	self.setFeedbackDefinitions?.(feedbacks)
}
