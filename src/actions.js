const API = require('./api')

module.exports = function (self) {
    const actions = {
        refresh_info: {
            name: 'Refresh info (poll now)',
            options: [],
            callback: async () => {
                try {
                    await self.getCameraInformation?.()
                } catch (e) {
                    // swallow
                }
            },
        },

        raw_cgi_get: {
            name: 'Send raw CGI (GET)',
            options: [
                {
                    type: 'textinput',
                    id: 'cmd',
                    label: 'Command (e.g. info.cgi or cmd.cgi?pt=... )',
                    default: 'info.cgi',
                },
                {
                    type: 'checkbox',
                    id: 'refresh',
                    label: 'Refresh info after call',
                    default: true,
                },
            ],
            callback: async (event) => {
                const cmd = (event.options?.cmd || '').trim()
                if (!cmd) return

                const api = new API(self.config)
                await api.sendRequest(cmd)
                if (event.options?.refresh) {
                    await self.getCameraInformation?.()
                }
            },
        },
    }

    self.setActionDefinitions?.(actions)
}
