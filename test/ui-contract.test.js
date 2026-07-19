const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

test('landing is single-server and has no news or selector', () => {
    const landing = read('app/landing.ejs')
    assert.match(landing, /id="server_address"/)
    assert.match(landing, /id="server_version"/)
    assert.doesNotMatch(landing, /server_selection_button|newsContainer|mojangStatusWrapper/)
})

test('only Microsoft login is visible', () => {
    assert.doesNotMatch(read('app/loginOptions.ejs'), /loginOptionMojang/)
    assert.doesNotMatch(read('app/settings.ejs'), /settingsAddMojangAccount/)
})

test('shader dropdown escapes its tab clipping boundary', () => {
    const css = read('app/assets/css/newplay.css')
    assert.match(css, /#settingsTabMods[^}]*overflow:\s*visible/s)
    assert.match(css, /\.settingsSelectOptions[^}]*z-index:\s*9999/s)
    assert.match(css, /\.settingsSelectOptions[^}]*max-height:\s*300px/s)
    assert.match(css, /\.settingsSelectOptions[^}]*overflow-y:\s*auto/s)
})

test('NewPlay stylesheet and status layout are active', () => {
    const app = read('app/app.ejs')
    const css = read('app/assets/css/newplay.css')
    assert.match(app, /launcher\.css[\s\S]*newplay\.css/)
    assert.match(css, /#server_status_wrapper[^}]*width:\s*fit-content/s)
    assert.match(css, /#server_status_wrapper[^}]*white-space:\s*nowrap/s)
})

test('Discord integration is not shipped', () => {
    const pkg = JSON.parse(read('package.json'))
    assert.equal(pkg.dependencies['discord-rpc-patch'], undefined)
    assert.doesNotMatch(read('app/assets/js/scripts/landing.js'), /DiscordWrapper/)
})

test('Korean overrides load before launcher custom text', () => {
    const loader = read('app/assets/js/langloader.js')
    assert.match(loader, /loadLanguage\('en_US'\)[\s\S]*loadLanguage\('ko_KR'\)[\s\S]*loadLanguage\('_custom'\)/)
})
