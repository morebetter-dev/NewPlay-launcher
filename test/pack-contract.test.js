const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const serverRoot = path.join('pack', 'servers', 'NewPlay-1.21.4')

test('server metadata pins NewPlay 1.21.4 Fabric', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(serverRoot, 'servermeta.json')))
    assert.equal(meta.meta.address, 'newplay.kr')
    assert.equal(meta.meta.mainServer, true)
    assert.equal(meta.meta.autoconnect, true)
    assert.equal(meta.meta.javaOptions.supported, '>=21 <22')
    assert.equal(meta.meta.javaOptions.ram.minimum, 2048)
    assert.equal(meta.meta.javaOptions.ram.recommended, 4096)
    assert.equal(meta.fabric.version, '0.16.9')
})

test('required inputs exist but shader zip is ignored', () => {
    const mods = fs.readdirSync(path.join(serverRoot, 'fabricmods', 'required')).sort()
    assert.deepEqual(mods, [
        'KeyChecker-1.21.4.jar',
        'fabric-api-0.119.4+1.21.4.jar',
        'iris-fabric-1.8.8+mc1.21.4.jar',
        'sodium-fabric-0.6.9+mc1.21.4.jar'
    ])
    const ignore = fs.readFileSync('.gitignore', 'utf8')
    assert.match(ignore, /pack\/servers\/NewPlay-1\.21\.4\/files\/shaderpacks\/\*\.zip/)
})
