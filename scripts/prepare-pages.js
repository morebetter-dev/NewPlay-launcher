const fs = require('node:fs')
const path = require('node:path')
const NEWPLAY = require('../app/assets/js/newplayconstants')

function preparePages(packDir, siteDir){
    fs.rmSync(siteDir, { recursive: true, force: true })
    fs.cpSync(packDir, siteDir, { recursive: true })

    const distroPath = path.join(siteDir, 'distribution.json')
    const distro = JSON.parse(fs.readFileSync(distroPath, 'utf8'))
    let shaderCount = 0

    function rewriteModules(server, modules){
        for(const module of modules || []){
            if(module.artifact?.path === `shaderpacks/${NEWPLAY.DEFAULT_SHADERPACK.fileName}`){
                shaderCount++
                if(module.artifact.size !== NEWPLAY.DEFAULT_SHADERPACK.size || module.artifact.MD5 !== NEWPLAY.DEFAULT_SHADERPACK.md5){
                    throw new Error('Complementary Unbound metadata does not match the pinned file.')
                }
                module.artifact.url = NEWPLAY.DEFAULT_SHADERPACK.url
                fs.rmSync(path.join(siteDir, 'servers', server.id, 'files', module.artifact.path), { force: true })
            }
            rewriteModules(server, module.subModules)
        }
    }

    for(const server of distro.servers || []){
        rewriteModules(server, server.modules)
        fs.rmSync(path.join(siteDir, 'servers', server.id, 'servermeta.json'), { force: true })
    }

    if(shaderCount !== 1){
        throw new Error(`Expected one Complementary Unbound module, found ${shaderCount}.`)
    }

    for(const dir of ['meta', 'schemas', '.cache']){
        fs.rmSync(path.join(siteDir, dir), { recursive: true, force: true })
    }
    fs.writeFileSync(distroPath, `${JSON.stringify(distro, null, 2)}\n`)
    fs.writeFileSync(path.join(siteDir, '.nojekyll'), '')
}

if(require.main === module){
    preparePages(path.resolve('pack'), path.resolve('site'))
}

module.exports = { preparePages }
