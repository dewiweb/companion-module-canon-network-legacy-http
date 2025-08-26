const { Regex } = require('@companion-module/base')
const { MODELS } = require('./models')

module.exports = {
	getConfigFields() {
		const modelChoices = MODELS.map((m) => ({ id: m.id, label: m.label }))
		return [
			{
				type: 'static-text',
				id: 'info',
				label: 'Info',
				value: 'Canon legacy HTTP (webview) control. Enter camera IP and options below.'
			},
			{
				type: 'dropdown',
				id: 'model',
				label: 'Camera Model',
				width: 6,
				choices: modelChoices,
				default: modelChoices[0]?.id || 'VB-H41',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Camera IP',
				width: 6,
				regex: Regex.IP,
				default: ''
			},
			{
				type: 'textinput',
				id: 'username',
				label: 'Username',
				width: 3,
				default: ''
			},
			{
				type: 'textinput',
				id: 'password',
				label: 'Password',
				width: 3,
				isPassword: true,
				default: ''
			},
			{
				type: 'number',
				id: 'httpPort',
				label: 'HTTP Port',
				width: 3,
				min: 1,
				max: 65535,
				default: 80,
			},
			{
				type: 'number',
				id: 'httpTimeout',
				label: 'HTTP Timeout (ms)',
				width: 3,
				min: 500,
				max: 60000,
				step: 100,
				default: 5000,
			},
			{
				type: 'number',
				id: 'poll_interval',
				label: 'Polling interval (ms)',
				width: 3,
				min: 250,
				max: 60000,
				step: 50,
				default: 2000,
			},
			{
				type: 'checkbox',
				id: 'verbose',
				label: 'Verbose logging',
				default: false,
			},
		]
	},
}

