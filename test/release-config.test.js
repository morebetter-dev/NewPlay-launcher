const test = require('node:test')
const assert = require('node:assert/strict')

const { AZURE_CLIENT_ID } = require('../app/assets/js/ipcconstants')

test('release uses the approved NewPlay client id', () => {
    assert.match(AZURE_CLIENT_ID, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    assert.notEqual(AZURE_CLIENT_ID, '1ce6e35a-126f-48fd-97fb-54d143ac6d45')
})
