const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const DropinModUtil = require('../app/assets/js/dropinmodutil')

const PACK = 'ComplementaryUnbound_r5.8.1.zip'

function tempInstance(t){
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'newplay-shader-'))
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
    return dir
}

test('first launch enables the bundled shader', t => {
    const dir = tempInstance(t)
    assert.equal(DropinModUtil.ensureDefaultShaderpack(dir, PACK), true)
    assert.equal(fs.readFileSync(path.join(dir, 'optionsshaders.txt'), 'utf8'),
        `shaderPack=${PACK}\nenableShaders=true`)
})

test('existing OFF choice is never overwritten', t => {
    const dir = tempInstance(t)
    const file = path.join(dir, 'optionsshaders.txt')
    fs.writeFileSync(file, 'shaderPack=OFF\nenableShaders=false')
    assert.equal(DropinModUtil.ensureDefaultShaderpack(dir, PACK), false)
    assert.equal(fs.readFileSync(file, 'utf8'), 'shaderPack=OFF\nenableShaders=false')
})

test('selecting OFF updates both Iris options', t => {
    const dir = tempInstance(t)
    DropinModUtil.setEnabledShaderpack(dir, PACK)
    DropinModUtil.setEnabledShaderpack(dir, 'OFF')
    assert.equal(fs.readFileSync(path.join(dir, 'optionsshaders.txt'), 'utf8'),
        'shaderPack=OFF\nenableShaders=false')
})

test('default shader is selected only after file repair', () => {
    const source = fs.readFileSync('app/assets/js/scripts/landing.js', 'utf8')
    const repairDone = source.indexOf('fullRepairModule.destroyReceiver()')
    const shaderDefault = source.indexOf('ShaderUtil.ensureDefaultShaderpack')
    const versionLoad = source.indexOf('new MojangIndexProcessor')
    assert.ok(repairDone < shaderDefault)
    assert.ok(shaderDefault < versionLoad)
})
