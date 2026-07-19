const semver = require('semver')

const pkg = require('../package.json')
const { AZURE_CLIENT_ID } = require('../app/assets/js/ipcconstants')
const NEWPLAY = require('../app/assets/js/newplayconstants')

const UPSTREAM_CLIENT_ID = '1ce6e35a-126f-48fd-97fb-54d143ac6d45'
const EXPECTED_REPOSITORY = 'git+https://github.com/morebetter-dev/NewPlay-launcher.git'

async function verifyReleaseConfig(){
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(AZURE_CLIENT_ID)
        || AZURE_CLIENT_ID === UPSTREAM_CLIENT_ID){
        throw new Error('A NewPlay Microsoft Application (client) ID is required.')
    }
    if(!semver.valid(pkg.version) || semver.prerelease(pkg.version) != null){
        throw new Error(`Release version must be stable: ${pkg.version}`)
    }
    if(pkg.repository?.url !== EXPECTED_REPOSITORY){
        throw new Error('Repository must be morebetter-dev/NewPlay-launcher.')
    }

    const response = await fetch(NEWPLAY.DISTRIBUTION_URL)
    if(!response.ok){
        throw new Error(`Distribution is unavailable: HTTP ${response.status}`)
    }
    const distro = await response.json()
    if(!Array.isArray(distro.servers)){
        throw new Error('Published distribution JSON is invalid.')
    }
    console.log('Release configuration verified.')
}

if(require.main === module){
    verifyReleaseConfig().catch(error => {
        console.error(error.message)
        process.exitCode = 1
    })
}

module.exports = { verifyReleaseConfig }
