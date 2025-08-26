const axios = require('axios')
const crypto = require('crypto')

class API {
	constructor(config) {
		const apiHost = config.host
		const apiPort = config.httpPort
		this.rootUrl = `http://${apiHost}:${apiPort}/`
		this.baseUrl = this.rootUrl + '-wvhttp-01-/'
		this.username = config.username || ''
		this.password = config.password || ''
		this.timeout = typeof config.httpTimeout === 'number' ? config.httpTimeout : 5000
		this.verbose = !!config.verbose
		this._nc = 0
	}

	async sendRequest(cmd) {
		// Support absolute URLs, absolute paths, or relative (to WebView base)
		let requestUrl
		if (typeof cmd === 'string' && (cmd.startsWith('http://') || cmd.startsWith('https://'))) {
			requestUrl = cmd
		} else if (typeof cmd === 'string' && cmd.startsWith('/')) {
			// Absolute path from server root (e.g., /admin/-set-?...)
			requestUrl = this.rootUrl.replace(/\/$/, '') + cmd
		} else {
			requestUrl = this.baseUrl + cmd
		}
		try {
			const axiosConfig = {
				timeout: this.timeout,
				headers: {},
			}
			if (this.username || this.password) {
				axiosConfig.auth = { username: this.username, password: this.password }
			}
			if (this.verbose) {
				console.log(`[Canon Legacy HTTP] GET ${requestUrl}`)
			}
			const response = await axios.get(requestUrl, axiosConfig)
			return { status: 'ok', response }
		} catch (err) {
			// If unauthorized and Digest is required, retry with Digest auth
			const res = err?.response
			const www = res?.headers?.['www-authenticate'] || res?.headers?.['WWW-Authenticate']
			const needsDigest = res?.status === 401 && typeof www === 'string' && www.toLowerCase().startsWith('digest')
			if (needsDigest && (this.username || this.password)) {
				try {
					const method = 'GET'
					const uri = new URL(requestUrl).pathname + (new URL(requestUrl).search || '')
					const authHeader = this._buildDigestHeader(www, method, uri)
					const axiosConfig2 = {
						timeout: this.timeout,
						headers: { Authorization: authHeader },
					}
					if (this.verbose) {
						console.log('[Canon Legacy HTTP] Retrying with Digest auth')
					}
					const response2 = await axios.get(requestUrl, axiosConfig2)
					return { status: 'ok', response: response2 }
				} catch (err2) {
					if (this.verbose) {
						console.warn(`[Canon Legacy HTTP] Digest retry failed for ${requestUrl}: ${err2?.message || err2}`)
					}
					return { status: 'failed', error: err2 }
				}
			}
			if (this.verbose) {
				console.warn(`[Canon Legacy HTTP] Request failed for ${requestUrl}: ${err?.message || err}`)
			}
			return { status: 'failed', error: err }
		}
	}

	_buildDigestHeader(wwwAuthenticate, method, uri) {
		// Parse WWW-Authenticate header
		// Example: Digest realm="IPCAM", nonce="...", qop="auth", algorithm=MD5, opaque="..."
		const header = wwwAuthenticate.replace(/^Digest\s+/i, '')
		const params = {}
		for (const part of header.split(',')) {
			const [kRaw, vRaw] = part.trim().split('=')
			if (!kRaw) continue
			const k = kRaw.trim().toLowerCase()
			let v = (vRaw || '').trim()
			if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
			params[k] = v
		}

		const realm = params['realm'] || ''
		const nonce = params['nonce'] || ''
		const qop = (params['qop'] || '').split(',')[0] || undefined
		const opaque = params['opaque']
		const algorithm = (params['algorithm'] || 'MD5').toUpperCase()

		// Build digest parts
		const cnonce = crypto.randomBytes(8).toString('hex')
		this._nc = (this._nc || 0) + 1
		const nc = ('00000000' + this._nc.toString(16)).slice(-8)

		const ha1_raw = `${this.username}:${realm}:${this.password}`
		const ha1_md5 = crypto.createHash('md5').update(ha1_raw).digest('hex')
		const ha1 = algorithm === 'MD5-SESS' ? crypto.createHash('md5').update(`${ha1_md5}:${nonce}:${cnonce}`).digest('hex') : ha1_md5

		const ha2_raw = `${method}:${uri}`
		const ha2 = crypto.createHash('md5').update(ha2_raw).digest('hex')

		let response
		if (qop) {
			response = crypto
				.createHash('md5')
				.update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
				.digest('hex')
		} else {
			response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex')
		}

		let hdr = 'Digest '
		hdr += `username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`
		if (opaque) hdr += `, opaque="${opaque}"
		`
		if (algorithm) hdr += `, algorithm=${algorithm}`
		if (qop) hdr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`
		return hdr
	}
}

module.exports = API
