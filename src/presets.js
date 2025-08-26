const ICONS = require('./icons')

module.exports = function (self) {
    const presets = {}

    const mkButton = (category, name, text, actionId, options = {}, color = 16777215, bgcolor = 0, upActionId = null, upOptions = {}, size = '14') => ({
        type: 'button',
        category,
        name,
        style: {
            text,
            size,
            color,
            bgcolor,
        },
        steps: [
            {
                down: [
                    {
                        actionId,
                        options,
                    },
                ],
                up: upActionId
                    ? [
                          {
                              actionId: upActionId,
                              options: upOptions,
                          },
                      ]
                    : [],
            },
        ],
        feedbacks: [],
    })

    const mkIconButton = (category, name, png64, actionId, options = {}, bgcolor = 0, upActionId = null, upOptions = {}, size = '18', color = 16777215) => ({
        type: 'button',
        category,
        name,
        style: {
            style: 'png',
            text: '',
            png64,
            pngalignment: 'center:center',
            size,
            color,
            bgcolor,
        },
        steps: [
            {
                down: [
                    {
                        actionId,
                        options,
                    },
                ],
                up: upActionId
                    ? [
                          {
                              actionId: upActionId,
                              options: upOptions,
                          },
                      ]
                    : [],
            },
        ],
        feedbacks: [],
    })

    const supportsPTZ = !!self.capabilities?.supportsPTZ
    const supportsZoom = !!self.capabilities?.supportsZoom
    const supportsNativePresets = !!self.capabilities?.supportsNativePresets
    const supportsPTZFPosPresets = !!self.capabilities?.posPresetsPTZF

    // Native Presets (use camera's WebView preset storage)
    if (supportsPTZ && supportsNativePresets) {
        for (let i = 1; i <= 10; i++) {
            presets[`native_preset_recall_${i}`] = mkButton('Presets', `Preset Recall ${i}`, `Recall\n${i}`, 'native_preset_recall', {
                slot: i,
            })
            presets[`native_preset_save_${i}`] = mkButton('Presets', `Preset Save ${i}`, `Save\n${i}`, 'native_preset_save', {
                slot: i,
                name: `Preset ${i}`,
            }, 0, 16753920)
        }
    }

    // PTZ Control Presets (only if PTZ is supported)
    if (supportsPTZ) {
        // Cardinal directions with stop on release (png icons, black bg)
        presets['pt_up'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Up', ICONS.UP, 'pt_up', {}, 0, 'pt_stop_tilt')
        presets['pt_down'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Down', ICONS.DOWN, 'pt_down', {}, 0, 'pt_stop_tilt')
        presets['pt_left'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Left', ICONS.LEFT, 'pt_left', {}, 0, 'pt_stop_pan')
        presets['pt_right'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Right', ICONS.RIGHT, 'pt_right', {}, 0, 'pt_stop_pan')

        // Diagonals with full stop on release (png icons)
        presets['pt_up_left'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Up Left', ICONS.UP_LEFT, 'pt_up_left', {}, 0, 'pt_stop')
        presets['pt_up_right'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Up Right', ICONS.UP_RIGHT, 'pt_up_right', {}, 0, 'pt_stop')
        presets['pt_down_left'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Down Left', ICONS.DOWN_LEFT, 'pt_down_left', {}, 0, 'pt_stop')
        presets['pt_down_right'] = mkIconButton('Pan/Tilt', 'Pan/Tilt - Down Right', ICONS.DOWN_RIGHT, 'pt_down_right', {}, 0, 'pt_stop')

        // Dedicated stop and home (text)
        presets['pt_stop'] = mkButton('Pan/Tilt', 'Pan/Tilt - Stop', 'STOP', 'pt_stop', {}, 16777215, 0, null, {}, '18')
        presets['pt_home'] = mkButton('Pan/Tilt', 'Pan/Tilt - Home', 'HOME', 'pt_home', {}, 16777215, 0, null, {}, '18')
    }

    // Zoom Control Presets (only if Zoom is supported)
    if (supportsZoom) {
        presets['zoom_in'] = mkButton('Lens', 'Zoom - In', 'ZOOM\nIN', 'zoom_in', {}, 16777215, 0, 'zoom_stop')
        presets['zoom_out'] = mkButton('Lens', 'Zoom - Out', 'ZOOM\nOUT', 'zoom_out', {}, 16777215, 0, 'zoom_stop')
        presets['zoom_stop'] = mkButton('Lens', 'Zoom - Stop', 'ZOOM\nSTOP', 'zoom_stop')
    }

    // Focus Control Presets (available on most models with focus control)
    if (supportsZoom || supportsPTZ) {
        presets['focus_near'] = mkButton('Lens', 'Focus - Near', 'FOCUS\nNEAR', 'focus_near')
        presets['focus_far'] = mkButton('Lens', 'Focus - Far', 'FOCUS\nFAR', 'focus_far')
        presets['focus_stop'] = mkButton('Lens', 'Focus - Stop', 'FOCUS\nSTOP', 'focus_stop')
        presets['autofocus_one_shot'] = mkButton('Lens', 'One Shot AF', 'One Shot\nAF', 'autofocus_one_shot')
    }

    self.setPresetDefinitions?.(presets)
}
