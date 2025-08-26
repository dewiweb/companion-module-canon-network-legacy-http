const axios = require('axios')

class API {
	constructor(config) {
		const apiHost = config.host
		const apiPort = config.httpPort
		this.baseUrl = `http://${apiHost}:${apiPort}/-wvhttp-01-/`
	}

	async sendRequest(cmd) {
		const requestUrl = this.baseUrl + cmd
		try {
			const response = await axios.get(requestUrl)
			return { status: 'ok', response }
		} catch (err) {
			return { status: 'failed' }
		}
	}
}

module.exports = API
