const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

test('NewPlay constants pin the supported client', () => {
    const cfg = require('../app/assets/js/newplayconstants')
    assert.equal(cfg.SERVER_ID, 'NewPlay')
    assert.equal(cfg.SERVER_ADDRESS, 'newplay.kr')
    assert.equal(cfg.MINECRAFT_VERSION, '1.21.4')
    assert.equal(cfg.FABRIC_LOADER_VERSION, '0.16.9')
    assert.equal(cfg.DEFAULT_SHADERPACK.fileName, 'ComplementaryUnbound_r5.8.1.zip')
    assert.equal(cfg.DEFAULT_SHADERPACK.size, 546928)
})

test('distribution manager uses GitHub Pages', () => {
    const source = fs.readFileSync('app/assets/js/distromanager.js', 'utf8')
    assert.match(source, /NEWPLAY\.DISTRIBUTION_URL/)
    assert.doesNotMatch(source, /helios-files\.geekcorner/)
})

test('NewPlay uses its own game data directory', () => {
    const source = fs.readFileSync('app/assets/js/configmanager.js', 'utf8')
    assert.match(source, /\.newplaylauncher/)
    assert.doesNotMatch(source, /\.helioslauncher/)
})
