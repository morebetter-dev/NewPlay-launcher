const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const pkg = require('../package.json')

test('product metadata is NewPlay and Windows-only', () => {
    assert.equal(pkg.name, 'newplay-launcher')
    assert.equal(pkg.productName, '뉴플레이 런처')
    assert.equal(pkg.version, '1.0.0')
    assert.equal(pkg.license, 'MIT')
    assert.equal(pkg.scripts['dist:mac'], undefined)
    assert.equal(pkg.scripts['dist:linux'], undefined)

    const builder = fs.readFileSync(path.join(root, 'electron-builder.yml'), 'utf8')
    assert.match(builder, /appId: 'kr\.newplay\.launcher'/)
    assert.match(builder, /arch: 'x64'/)
    assert.doesNotMatch(builder, /^mac:/m)
    assert.doesNotMatch(builder, /^linux:/m)
})

test('launcher windows use the NewPlay brand icon', () => {
    const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8')
    assert.match(source, /getPlatformIcon\('NewPlay'\)/)
    assert.doesNotMatch(source, /getPlatformIcon\('SealCircle'\)/)
    assert.equal(fs.existsSync(path.join(root, 'app/assets/images/NewPlay.png')), true)
    assert.equal(fs.existsSync(path.join(root, 'build/icon.png')), true)
})
