const { DistributionAPI } = require('helios-core/common')

const ConfigManager = require('./configmanager')
const NEWPLAY = require('./newplayconstants')

exports.REMOTE_DISTRO_URL = NEWPLAY.DISTRIBUTION_URL

exports.DistroAPI = new DistributionAPI(
    ConfigManager.getLauncherDirectory(),
    null, // Injected forcefully by the preloader.
    null, // Injected forcefully by the preloader.
    exports.REMOTE_DISTRO_URL,
    false
)
