const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const NEWPLAY = require('../app/assets/js/newplayconstants')

const PAGES_BASE_URL = 'https://morebetter-dev.github.io/NewPlay-launcher/'

function requireValue(value, message){
    if(value == null || value === ''){
        throw new Error(message)
    }
}

function hashFile(file, algorithm){
    return crypto.createHash(algorithm).update(fs.readFileSync(file)).digest('hex')
}

function localArtifactPath(siteDir, url){
    const relative = decodeURIComponent(url.slice(PAGES_BASE_URL.length))
    const local = path.resolve(siteDir, relative)
    const root = `${path.resolve(siteDir)}${path.sep}`
    if(!local.startsWith(root)){
        throw new Error(`Artifact URL escapes the Pages tree: ${url}`)
    }
    return local
}

function verifyLocalArtifact(siteDir, artifact){
    const file = localArtifactPath(siteDir, artifact.url)
    if(!fs.existsSync(file)){
        throw new Error(`Missing Pages artifact: ${artifact.path}`)
    }
    if(fs.statSync(file).size !== artifact.size){
        throw new Error(`Size mismatch: ${artifact.path}`)
    }
    if(hashFile(file, 'md5') !== artifact.MD5.toLowerCase()){
        throw new Error(`MD5 mismatch: ${artifact.path}`)
    }
}

async function verifyShaderDownload(){
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'newplay-shader-'))
    const file = path.join(tempDir, NEWPLAY.DEFAULT_SHADERPACK.fileName)
    try {
        const response = await fetch(NEWPLAY.DEFAULT_SHADERPACK.url)
        if(!response.ok){
            throw new Error(`Shader download failed: HTTP ${response.status}`)
        }
        fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()))
        if(fs.statSync(file).size !== NEWPLAY.DEFAULT_SHADERPACK.size){
            throw new Error('Shader size mismatch.')
        }
        if(hashFile(file, 'sha512') !== NEWPLAY.DEFAULT_SHADERPACK.sha512){
            throw new Error('Shader SHA-512 mismatch.')
        }
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
    }
}

async function verifyDistribution(distroPath){
    const absoluteDistro = path.resolve(distroPath)
    const siteDir = path.dirname(absoluteDistro)
    const distro = JSON.parse(fs.readFileSync(absoluteDistro, 'utf8'))

    if(distro == null || typeof distro !== 'object' || Array.isArray(distro)){
        throw new Error('Distribution must be an object.')
    }
    requireValue(distro.version, 'Distribution version is required.')
    requireValue(distro.rss, 'Distribution RSS URL is required.')
    if(!Array.isArray(distro.servers)){
        throw new Error('Distribution servers must be an array.')
    }

    let shaderCount = 0
    function verifyModules(modules){
        if(!Array.isArray(modules)){
            throw new Error('Server modules must be an array.')
        }
        for(const module of modules){
            requireValue(module.type, 'Module type is required.')
            if(module.artifact == null || typeof module.artifact !== 'object'){
                throw new Error('Module artifact is required.')
            }
            const artifact = module.artifact
            const label = artifact.path || module.id
            requireValue(artifact.url, `Artifact URL is required: ${label}`)
            if(!Number.isInteger(artifact.size) || artifact.size < 0){
                throw new Error(`Artifact size is invalid: ${label}`)
            }
            requireValue(artifact.MD5, `Artifact MD5 is required: ${label}`)

            if(artifact.url === NEWPLAY.DEFAULT_SHADERPACK.url){
                shaderCount++
                if(artifact.size !== NEWPLAY.DEFAULT_SHADERPACK.size
                    || artifact.MD5.toLowerCase() !== NEWPLAY.DEFAULT_SHADERPACK.md5){
                    throw new Error('Shader distribution metadata mismatch.')
                }
            } else if(artifact.url.startsWith(PAGES_BASE_URL)){
                verifyLocalArtifact(siteDir, artifact)
            } else {
                throw new Error(`Unsupported artifact URL: ${artifact.url}`)
            }

            if(module.subModules != null){
                verifyModules(module.subModules)
            }
        }
    }

    for(const server of distro.servers){
        requireValue(server.id, 'Server id is required.')
        requireValue(server.minecraftVersion, `Minecraft version is required: ${server.id}`)
        verifyModules(server.modules)
    }

    const newplay = distro.servers.find(server => server.address === NEWPLAY.SERVER_ADDRESS)
    if(newplay == null
        || newplay.minecraftVersion !== NEWPLAY.MINECRAFT_VERSION
        || newplay.mainServer !== true
        || newplay.autoconnect !== true){
        throw new Error('NewPlay server metadata is invalid.')
    }
    if(!JSON.stringify(newplay).includes(NEWPLAY.FABRIC_LOADER_VERSION)){
        throw new Error('Pinned Fabric loader version is missing.')
    }
    if(shaderCount !== 1){
        throw new Error(`Expected one official shader artifact, found ${shaderCount}.`)
    }

    await verifyShaderDownload()
    console.log(`Verified ${absoluteDistro}`)
}

if(require.main === module){
    verifyDistribution(process.argv[2] || path.resolve('site', 'distribution.json')).catch(error => {
        console.error(error.message)
        process.exitCode = 1
    })
}

module.exports = { verifyDistribution }
