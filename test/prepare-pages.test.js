const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const NEWPLAY = require('../app/assets/js/newplayconstants')
const { preparePages } = require('../scripts/prepare-pages')

function makeFixture(t){
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'newplay-pages-'))
    const pack = path.join(root, 'pack')
    const site = path.join(root, 'site')
    const server = path.join('servers', 'NewPlay-1.21.4')
    const shaderPath = path.join(server, 'files', 'shaderpacks', NEWPLAY.DEFAULT_SHADERPACK.fileName)
    fs.mkdirSync(path.join(pack, path.dirname(shaderPath)), { recursive: true })
    fs.mkdirSync(path.join(pack, 'meta'), { recursive: true })
    fs.writeFileSync(path.join(pack, shaderPath), 'fixture')
    fs.writeFileSync(path.join(pack, 'meta', 'distrometa.json'), '{}')
    fs.writeFileSync(path.join(pack, server, 'servermeta.json'), '{}')
    fs.writeFileSync(path.join(pack, 'distribution.json'), JSON.stringify({
        version: '1.0.0',
        rss: 'https://morebetter-dev.github.io/NewPlay-launcher/news.xml',
        servers: [{
            id: 'NewPlay-1.21.4',
            modules: [{
                type: 'File',
                artifact: {
                    path: `shaderpacks/${NEWPLAY.DEFAULT_SHADERPACK.fileName}`,
                    url: 'https://example.invalid/shader.zip',
                    size: NEWPLAY.DEFAULT_SHADERPACK.size,
                    MD5: NEWPLAY.DEFAULT_SHADERPACK.md5
                }
            }]
        }]
    }))
    t.after(() => fs.rmSync(root, { recursive: true, force: true }))
    return { pack, site, shaderPath }
}

test('pages output rewrites and removes Complementary mirror', t => {
    const { pack, site, shaderPath } = makeFixture(t)
    preparePages(pack, site)
    const distro = JSON.parse(fs.readFileSync(path.join(site, 'distribution.json')))
    const shader = distro.servers[0].modules[0]
    assert.equal(shader.artifact.url, NEWPLAY.DEFAULT_SHADERPACK.url)
    assert.equal(fs.existsSync(path.join(site, shaderPath)), false)
    assert.equal(fs.existsSync(path.join(site, 'meta')), false)
    assert.equal(fs.existsSync(path.join(site, '.nojekyll')), true)
})

test('pages output requires exactly one Complementary module', t => {
    const { pack, site } = makeFixture(t)
    const distroPath = path.join(pack, 'distribution.json')
    const distro = JSON.parse(fs.readFileSync(distroPath, 'utf8'))
    distro.servers[0].modules = []
    fs.writeFileSync(distroPath, JSON.stringify(distro))
    assert.throws(() => preparePages(pack, site), /Expected one Complementary Unbound module/)
})
