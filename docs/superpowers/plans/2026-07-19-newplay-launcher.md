# NewPlay Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Windows x64에서 Microsoft 계정으로 로그인하고 Minecraft 1.21.4/Fabric 모드팩을 자동 복구한 뒤 `newplay.kr`에 바로 접속하는 `뉴플레이 런처`를 만든다.

**Architecture:** HeliosLauncher의 인증·Java 검색·파일 복구·실행·자동 업데이트 엔진은 유지하고, 단일 서버 UI와 뉴플레이 테마만 얹는다. Nebula가 만든 배포 트리는 공식 GitHub Pages Actions 아티팩트로 게시하되, 직접 재업로드가 금지된 Complementary Unbound는 Modrinth 공식 CDN에서 받도록 생성 결과를 후처리한다. 런처 설치 파일과 updater 메타데이터는 GitHub Releases에 둔다.

**Tech Stack:** Electron 39, Node.js 22, EJS, CommonJS, Helios Core, Nebula, Node 내장 `node:test`, electron-builder/NSIS, GitHub Actions/Pages/Releases

## Global Constraints

- 구현 시작 시 `superpowers:using-git-worktrees`를 먼저 사용한다. 현재 작업 폴더의 미추적 `mods/`, `shaderpacks/`, `newplay-main-logo.png`는 사용자 원본이므로 이동·삭제하지 말고 필요한 파일만 새 worktree로 복사한다.
- 구현 브랜치는 `website/newplay-launcher`를 사용한다.
- 대상은 Windows x64뿐이다. macOS/Linux 빌드 스크립트와 CI 매트릭스를 남기지 않는다.
- 기존 Helios 다운로드·복구·Java 설치·Microsoft 인증 코드를 재작성하지 않는다.
- `optionsshaders.txt`는 Nebula 배포/해시 추적 대상에 넣지 않는다. 사용자가 셰이더를 끈 설정은 복구 과정에서 되돌리지 않는다.
- Complementary Unbound ZIP은 Git 저장소, GitHub Pages, GitHub Releases에 커밋하거나 업로드하지 않는다. 공식 Modrinth 파일 URL만 사용하고, 내려받은 파일의 크기와 SHA-512를 검증한다.
- `KeyChecker-1.21.4.jar`의 작성자는 메타데이터상 `xlxk_`이고 라이선스 표기가 없다. 사용자가 작성자이거나 재배포 허가를 보유했다는 확인 전에는 이 JAR을 커밋·게시하지 않는다. 확인 전까지 로컬 실행 검증만 허용한다.
- Microsoft Application Client ID는 공개 가능한 식별자지만 액세스 토큰·갱신 토큰·Client Secret은 절대 저장소나 로그에 기록하지 않는다.
- 코드 서명 인증서가 없는 첫 배포에서 SmartScreen 경고가 생길 수 있음을 README와 Release 노트에 명시한다.
- 각 작업은 실패하는 테스트/검사 → 최소 구현 → 통과 확인 → 해당 파일만 커밋 순서로 진행한다.

---

### Task 1: 작업용 worktree와 원본 저장소 통합

**Files:**

- Preserve: `docs/superpowers/specs/2026-07-19-newplay-launcher-design.md`
- Preserve: `newplay-main-logo.png`
- Preserve locally: `mods/*.jar`, `shaderpacks/*.zip`
- Import: HeliosLauncher 전체 소스
- Preserve: `LICENSE`, `LICENSE.txt`

- [ ] **Step 1: 별도 worktree 준비**

`superpowers:using-git-worktrees`를 호출한 뒤 현재 저장소에 두 remote를 등록하고 fetch한다.

```powershell
git remote add origin https://github.com/morebetter-dev/NewPlay-launcher.git
git remote add upstream https://github.com/dscalzi/HeliosLauncher.git
git fetch origin main
git fetch upstream master
git worktree add ..\NewPlay-launcher-worktree -b website/newplay-launcher
```

Expected: `..\NewPlay-launcher-worktree`가 생성되고 현재 브랜치는 `website/newplay-launcher`다.

- [ ] **Step 2: 사용자 저장소와 Helios 이력 병합**

worktree 안에서 다음 순서로 병합한다.

```powershell
git merge origin/main --allow-unrelated-histories -m "chore: 원격 저장소 이력 병합"
git merge upstream/master --allow-unrelated-histories -m "chore: HeliosLauncher 기반 소스 도입"
```

Expected: `LICENSE`와 Helios의 `LICENSE.txt`가 모두 남고, 승인된 설계 문서도 보존된다.

- [ ] **Step 3: 사용자 입력 파일 복사**

원래 작업 폴더에서 로고만 worktree 루트로 복사한다. 모드 JAR은 Task 6의 권리 확인 이후 `pack/`으로 복사하고, 셰이더 ZIP은 복사하지 않는다.

```powershell
Copy-Item -LiteralPath '..\뉴플레이 커스텀 런처\newplay-main-logo.png' -Destination '.\newplay-main-logo.png' -Force
```

- [ ] **Step 4: upstream 기준선 검증**

```powershell
npm ci
npm run lint
```

Expected: 의존성 설치와 ESLint가 exit code 0으로 끝난다. upstream 자체 오류가 있다면 변경 전에 로그를 기록한다.

- [ ] **Step 5: 통합 상태 확인**

```powershell
git status --short
```

두 merge commit 외의 변경이 없어야 한다. `.superpowers/`와 사용자 원본 폴더 전체를 한꺼번에 stage하지 않는다.

---

### Task 2: Windows 전용 제품 메타데이터와 빌드 계약

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `electron-builder.yml`
- Modify: `dev-app-update.yml`
- Modify: `index.js`
- Create: `test/product-contract.test.js`
- Create: `scripts/make-brand-assets.ps1`
- Create: `app/assets/images/NewPlay.png`
- Create: `build/icon.png`

- [ ] **Step 1: 제품 계약 테스트 작성**

`test/product-contract.test.js`를 먼저 만든다.

```js
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
```

`package.json`에 먼저 `"test": "node --test"`만 추가한 후 실행한다.

```powershell
npm test -- --test-name-pattern="product metadata"
```

Expected: 기존 Helios 메타데이터 때문에 FAIL.

- [ ] **Step 2: package와 updater 메타데이터 변경**

`package.json` 핵심 값을 다음과 같이 바꾸고 `discord-rpc-patch` 의존성을 제거한다.

```json
{
  "name": "newplay-launcher",
  "version": "1.0.0",
  "productName": "뉴플레이 런처",
  "description": "newplay.kr 전용 Minecraft 1.21.4 런처",
  "author": "morebetter-dev",
  "license": "MIT",
  "homepage": "https://github.com/morebetter-dev/NewPlay-launcher",
  "bugs": { "url": "https://github.com/morebetter-dev/NewPlay-launcher/issues" },
  "private": true,
  "scripts": {
    "start": "electron .",
    "test": "node --test",
    "dist": "electron-builder build",
    "dist:win": "npm run dist -- -w --x64",
    "lint": "eslint ."
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/morebetter-dev/NewPlay-launcher.git"
  }
}
```

나머지 기존 dependencies/devDependencies는 유지한다. 이어서 lockfile을 갱신한다.

```powershell
npm install --package-lock-only
```

`dev-app-update.yml`:

```yaml
owner: morebetter-dev
repo: NewPlay-launcher
provider: github
```

`electron-builder.yml`은 다음 Windows 핵심만 유지한다.

```yaml
appId: 'kr.newplay.launcher'
productName: '뉴플레이 런처'
artifactName: '${productName}-setup-${version}.${ext}'
copyright: 'Copyright © 2026 morebetter-dev; HeliosLauncher © Daniel Scalzi'
asar: true
compression: 'maximum'
files:
  - '!{dist,.gitignore,.vscode,docs,dev-app-update.yml,.nvmrc,eslint.config.mjs,test,scripts,pack,site}'
extraResources:
  - 'libraries'
win:
  icon: 'build/icon.png'
  target:
    - target: 'nsis'
      arch: 'x64'
nsis:
  oneClick: false
  perMachine: false
  allowElevation: true
  allowToChangeInstallationDirectory: true
directories:
  buildResources: 'build'
  output: 'dist'
publish:
  provider: github
  owner: morebetter-dev
  repo: NewPlay-launcher
  releaseType: draft
```

- [ ] **Step 3: 로고에서 투명 정사각형 PNG 생성**

`scripts/make-brand-assets.ps1`은 `System.Drawing`으로 원본 비율을 유지해 1024×1024 투명 캔버스 중앙에 로고를 배치하고 `app/assets/images/NewPlay.png`, `build/icon.png` 두 파일을 쓴다. 원본 1441×910을 강제로 늘이지 않는다. 생성 뒤 두 출력 모두 1024×1024인지 검사한다.

`index.js`의 세 BrowserWindow 아이콘 호출을 `getPlatformIcon('NewPlay')`로 바꾸고, Windows도 PNG를 읽게 함수를 단순화한다.

```js
function getPlatformIcon(filename){
    return path.join(__dirname, 'app', 'assets', 'images', `${filename}.png`)
}
```

- [ ] **Step 4: 계약 테스트와 Windows 패키징 확인**

```powershell
npm test
npm run lint
npm run dist:win
```

Expected: 테스트/린트 통과, `dist/뉴플레이 런처-setup-1.0.0.exe` 생성.

- [ ] **Step 5: 커밋**

```powershell
git add newplay-main-logo.png package.json package-lock.json electron-builder.yml dev-app-update.yml index.js test/product-contract.test.js scripts/make-brand-assets.ps1 app/assets/images/NewPlay.png build/icon.png
git commit -m "feat: Windows 전용 뉴플레이 제품 정보 적용"
```

---

### Task 3: 단일 서버 상수와 배포 주소 고정

**Files:**

- Create: `app/assets/js/newplayconstants.js`
- Modify: `app/assets/js/distromanager.js`
- Modify: `app/assets/js/configmanager.js`
- Create: `test/newplay-config.test.js`

- [ ] **Step 1: 실패하는 구성 테스트 작성**

```js
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
```

```powershell
npm test -- --test-name-pattern="NewPlay|distribution manager"
```

Expected: `newplayconstants.js`가 없어 FAIL.

- [ ] **Step 2: 실제 고정값 구현**

`app/assets/js/newplayconstants.js`:

```js
module.exports = Object.freeze({
    PRODUCT_NAME: '뉴플레이 런처',
    SERVER_ID: 'NewPlay',
    SERVER_ADDRESS: 'newplay.kr',
    MINECRAFT_VERSION: '1.21.4',
    FABRIC_LOADER_VERSION: '0.16.9',
    DISTRIBUTION_URL: 'https://morebetter-dev.github.io/NewPlay-launcher/distribution.json',
    DEFAULT_SHADERPACK: Object.freeze({
        fileName: 'ComplementaryUnbound_r5.8.1.zip',
        url: 'https://cdn.modrinth.com/data/R6NEzAwj/versions/VMHXIk50/ComplementaryUnbound_r5.8.1.zip',
        size: 546928,
        md5: '0a3553109dbe689a9f76d1aedc8f50c6',
        sha512: '9098dd9e0c18b80f7aba2839cea33ce9a614d97665bbfcac87ccce6e4771667c41602d99088852cb1642ccab20b2ceff9b98af8f2e795bd0d3b90b7c9cbab914'
    })
})
```

`distromanager.js`:

```js
const { DistributionAPI } = require('helios-core/common')
const ConfigManager = require('./configmanager')
const NEWPLAY = require('./newplayconstants')

exports.REMOTE_DISTRO_URL = NEWPLAY.DISTRIBUTION_URL

exports.DistroAPI = new DistributionAPI(
    ConfigManager.getLauncherDirectory(),
    null,
    null,
    exports.REMOTE_DISTRO_URL,
    false
)
```

`configmanager.js`의 legacy Helios 데이터 경로도 뉴플레이 전용으로 바꿔 다른 Helios 기반 런처와 인스턴스가 섞이지 않게 한다.

```js
const dataPath = path.join(sysRoot, '.newplaylauncher')
```

- [ ] **Step 3: 검증과 커밋**

```powershell
npm test
npm run lint
git add app/assets/js/newplayconstants.js app/assets/js/distromanager.js app/assets/js/configmanager.js test/newplay-config.test.js
git commit -m "feat: 뉴플레이 단일 서버 구성 고정"
```

---

### Task 4: 뉴플레이 단일 서버 UI와 드롭다운 잘림 수정

**Files:**

- Modify: `app/app.ejs`
- Modify: `app/landing.ejs`
- Modify: `app/loginOptions.ejs`
- Modify: `app/settings.ejs`
- Modify: `app/assets/js/scripts/loginOptions.js`
- Modify: `app/assets/js/scripts/landing.js`
- Modify: `app/assets/js/scripts/uibinder.js`
- Modify: `app/assets/js/scripts/settings.js`
- Modify: `app/assets/js/langloader.js`
- Modify: `app/assets/lang/_custom.toml`
- Create: `app/assets/lang/ko_KR.toml`
- Create: `app/assets/css/newplay.css`
- Create: `test/ui-contract.test.js`

- [ ] **Step 1: UI 회귀 계약 테스트 작성**

```js
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

test('Korean overrides load before launcher custom text', () => {
    const loader = read('app/assets/js/langloader.js')
    assert.match(loader, /loadLanguage\('en_US'\)[\s\S]*loadLanguage\('ko_KR'\)[\s\S]*loadLanguage\('_custom'\)/)
})
```

```powershell
npm test -- --test-name-pattern="landing|Microsoft|dropdown"
```

Expected: 기존 다중 서버/뉴스/Mojang UI 때문에 FAIL.

- [ ] **Step 2: stylesheet 연결과 기본 언어 변경**

`app/app.ejs`에서 `<html lang="ko">`로 바꾸고 `launcher.css` 다음에 다음 줄을 추가한다.

```html
<link type="text/css" rel="stylesheet" href="./assets/css/newplay.css">
```

로딩 이미지는 `assets/images/NewPlay.png`로 바꾼다. `langloader.js`는 fallback인 `en_US`, 번역인 `ko_KR`, 제품별 문구인 `_custom` 순서로 merge한다.

```js
exports.setupLanguage = function(){
    exports.loadLanguage('en_US')
    exports.loadLanguage('ko_KR')
    exports.loadLanguage('_custom')
}
```

`ko_KR.toml`에는 실제로 노출되는 EJS 문구와 다음 JS 오류 그룹을 빠짐없이 한국어로 override한다.

- `js.index`
- `js.landing.launch`, `serverStatus`, `systemScan`, `downloadJava`, `dlAsync`
- `js.settings.mstfLogin`, `mstfLogout`, `authAccountSelect`, `authAccountLogout`, `java`, `updates`, `msftLogin`
- `js.uibinder.startup`, `uibinder.validateAccount`
- `js.uicore.autoUpdate`
- `js.auth.microsoft.error`

예를 들어 배포 인덱스 최초 로드 실패는 다음처럼 쓴다.

```toml
[js.landing.dlAsync]
loadingServerInfo = "서버 정보를 불러오는 중..."
fatalError = "필수 정보를 불러오지 못했습니다"
unableToLoadDistributionIndex = "배포 정보를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요."
validatingFileIntegrity = "게임 파일을 검사하는 중..."
downloadingFiles = "필요한 파일을 다운로드하는 중..."
errorDuringFileDownloadTitle = "파일 다운로드 실패"
preparingToLaunch = "게임 실행을 준비하는 중..."
launchingGame = "게임을 실행하는 중..."
doneEnjoyServer = "준비 완료. 뉴플레이에 접속합니다!"
```

`_custom.toml`의 제품명·환영 문구·원본 링크는 다음 값으로 고정한다.

```toml
[ejs.app]
title = "뉴플레이 런처"

[ejs.welcome]
welcomeHeader = "뉴플레이에 오신 것을 환영합니다"
welcomeDescription = "Minecraft 1.21.4와 필수 모드를 자동으로 준비합니다."
welcomeDescCTA = "Microsoft 계정으로 로그인하면 바로 시작할 수 있습니다."

[ejs.settings]
sourceGithubLink = "https://github.com/dscalzi/HeliosLauncher"
supportLink = "https://github.com/morebetter-dev/NewPlay-launcher/issues"
```

- [ ] **Step 3: landing markup를 필요한 ID만 유지해 교체**

`landing.ejs`는 다음 구조를 사용한다. 기존 JS가 필요한 progress/account/settings ID는 유지하고, 뉴스·외부 SNS·Mojang 상태·서버 선택 요소는 제거한다.

```html
<div id="landingContainer" style="display: none;">
    <header class="newplayHeader">
        <img class="newplayLogo" src="assets/images/NewPlay.png" alt="뉴플레이">
        <div class="newplayAccount">
            <div id="avatarContainer"><button id="avatarOverlay">계정 변경</button></div>
            <span id="user_text">Microsoft 로그인 필요</span>
            <button id="settingsMediaButton">설정</button>
        </div>
    </header>
    <main class="newplayDashboard">
        <section class="newplayCard newplayServerCard">
            <span class="newplayEyebrow">NEWPLAY SERVER</span>
            <h1 id="server_address">newplay.kr</h1>
            <p id="server_version">Minecraft 1.21.4 · Fabric 0.16.9</p>
            <div id="server_status_wrapper">
                <span id="landingPlayerLabel">서버 상태</span>
                <span id="player_count">확인 중</span>
            </div>
        </section>
        <section class="newplayCard newplayPackCard">
            <span class="newplayEyebrow">CLIENT PACK</span>
            <h2>뉴플레이 1.0.0</h2>
            <p>Fabric · Iris · Sodium · Complementary Unbound</p>
        </section>
    </main>
    <footer class="newplayLaunchBar">
        <div id="launch_content">
            <button id="launch_button">게임 시작</button>
        </div>
        <div id="launch_details">
            <span id="launch_progress_label">0%</span>
            <progress id="launch_progress" value="0" max="100"></progress>
            <span id="launch_details_text">준비 중</span>
        </div>
    </footer>
    <script src="./assets/js/scripts/landing.js"></script>
</div>
```

- [ ] **Step 4: landing JS를 단일 서버에 맞춰 축소**

`landing.js`에서 `MojangRestAPI`, `RestResponseStatus`, `DiscordWrapper`, `server_selection_button`, Mojang 상태 함수, Discord RPC 블록, 전체 News 섹션을 제거한다. `updateSelectedServer`는 선택 버튼 대신 고정 정보만 갱신한다.

```js
function updateSelectedServer(serv){
    ConfigManager.setSelectedServer(serv != null ? serv.rawServer.id : null)
    ConfigManager.save()
    if(serv != null){
        document.getElementById('server_address').textContent = serv.rawServer.address
        document.getElementById('server_version').textContent =
            `Minecraft ${serv.rawServer.minecraftVersion} · 팩 ${serv.rawServer.version}`
    }
    setLaunchEnabled(serv != null)
}
```

서버 상태 조회 실패 시 기존처럼 offline 표시만 하고 `setLaunchEnabled(false)`를 호출하지 않는다. `uibinder.js`의 `initNews()` 두 호출과 뉴스 tabindex 처리도 제거한다.

- [ ] **Step 5: Microsoft 전용 로그인과 설정 화면 정리**

`loginOptions.ejs`에서 Mojang 버튼을 삭제하고 `loginOptions.js`의 `loginOptionMojang` 선언/handler를 삭제한다. `settings.ejs`의 Mojang 계정 카드도 삭제하고, `settings.js`에서 해당 버튼에 직접 바인딩하는 블록과 `settingsCurrentMojangAccounts` 쓰기를 제거한다. 인증 DB에 과거 Mojang 값이 있더라도 화면에 렌더링하지 않는다.

설정의 사용자 노출 범위는 다음만 남긴다.

- Microsoft 계정
- 해상도/전체화면
- 셰이더 선택
- 최소/최대 메모리와 Java 경로
- 게임 데이터 폴더
- 원본 Helios 저작권/업데이트

서버 전환 버튼, 필수 모드 토글, optional/drop-in mod 추가 UI는 EJS에서 제거한다. 삭제된 요소를 조회하는 settings.js 바인딩도 함께 삭제하고 `prepareSettings()`가 null DOM을 접근하지 않는지 확인한다.

Mods tab 준비와 설정 저장은 셰이더만 다루도록 줄인다.

```js
async function prepareModsTab(){
    await resolveShaderpacksForUI()
    bindShaderpackButton()
}

function fullSettingsSave(){
    saveSettingsValues()
    ConfigManager.save()
    saveShaderpackSettings()
}
```

F5 drop-in mod 갱신 handler, `resolveModsForUI()`, `resolveDropinModsForUI()`, `saveModConfiguration()`, `saveDropinModConfiguration()`의 호출 경로를 제거한다. 필수 모드는 distribution에서 required로 고정되어 ProcessBuilder가 계속 로드한다.

- [ ] **Step 6: 디자인 시스템과 드롭다운 stacking 적용**

`newplay.css`의 필수 토큰과 드롭다운 규칙:

```css
:root {
    --np-bg: #0f0f0f;
    --np-bg-low: #0a0a0a;
    --np-card: #1a1a1a;
    --np-inner: #252525;
    --np-border: #333333;
    --np-brand: oklch(0.63 0.151 9);
    --np-text: #f5f5f5;
    --np-muted: #b8b8b8;
}

body, #main, #landingContainer, #settingsContainer {
    background: var(--np-bg);
    color: var(--np-text);
    font-family: Pretendard, "Segoe UI", sans-serif;
}

button:focus-visible, input:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 2px;
}

.newplayCard {
    background: var(--np-card);
    border: 1px solid #252525;
    border-radius: 8px;
}

button:hover {
    box-shadow: inset 0 0 0 999px color-mix(in oklch, var(--np-brand) 15%, transparent);
}

#settingsContainer,
#settingsContainerRight,
#settingsTabMods,
#settingsModsContainer,
#settingsShadersContainer,
#settingsShaderpackWrapper,
.settingsSelectContainer {
    overflow: visible;
}

#settingsTabMods { position: relative; }
#settingsShadersContainer { position: relative; z-index: 50; }
.settingsSelectOptions {
    position: absolute;
    z-index: 9999;
    max-height: 300px;
    overflow-y: auto;
    background: var(--np-inner);
    border: 1px solid var(--np-border);
}
```

`#settingsTabMods`에는 셰이더 영역만 남으므로 기존 `overflow-y:auto`를 `overflow:visible`로 바꿔도 설정 내용이 잘리지 않는다.

- [ ] **Step 7: 자동/수동 UI 검증**

```powershell
npm test
npm run lint
npm start
```

수동 확인:

1. 980×552 기본 창에서 카드/버튼이 겹치지 않는다.
2. 설정 → 셰이더 드롭다운이 아래로 열리고 설정 tab 경계에서 잘리지 않는다.
3. 항목이 많아지면 300px부터 드롭다운 내부만 스크롤된다.
4. Tab 키 focus ring이 보인다.
5. 뉴스/서버 선택/Mojang 로그인/Discord 표시가 없다.

- [ ] **Step 8: 커밋**

```powershell
git add app/app.ejs app/landing.ejs app/loginOptions.ejs app/settings.ejs app/assets/js/scripts/loginOptions.js app/assets/js/scripts/landing.js app/assets/js/scripts/uibinder.js app/assets/js/scripts/settings.js app/assets/js/langloader.js app/assets/lang/ko_KR.toml app/assets/lang/_custom.toml app/assets/css/newplay.css test/ui-contract.test.js
git commit -m "feat: 뉴플레이 단일 서버 화면과 설정 디자인 적용"
```

---

### Task 5: 셰이더 기본 활성화와 사용자 OFF 설정 보존

**Files:**

- Modify: `app/assets/js/dropinmodutil.js`
- Modify: `app/assets/js/scripts/landing.js`
- Create: `test/dropinmodutil.test.js`

- [ ] **Step 1: 셰이더 설정 동작 테스트 작성**

```js
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
```

```powershell
npm test -- --test-name-pattern="shader|OFF"
```

Expected: `ensureDefaultShaderpack`이 없어 FAIL.

- [ ] **Step 2: 설정 upsert와 최초 실행 helper 구현**

`dropinmodutil.js`에 다음 최소 helper를 추가하고 기존 `setEnabledShaderpack`이 이를 사용하게 한다.

```js
function setShaderOption(buf, key, value){
    const option = new RegExp(`^${key}=.*$`, 'm')
    if(option.test(buf)){
        return buf.replace(option, `${key}=${value}`)
    }
    return `${buf.length > 0 ? `${buf.trimEnd()}\n` : ''}${key}=${value}`
}

exports.setEnabledShaderpack = function(instanceDir, pack){
    exports.validateDir(instanceDir)
    const optionsShaders = path.join(instanceDir, SHADER_CONFIG)
    let buf = fs.existsSync(optionsShaders)
        ? fs.readFileSync(optionsShaders, {encoding: 'utf-8'})
        : ''
    buf = setShaderOption(buf, 'shaderPack', pack)
    buf = setShaderOption(buf, 'enableShaders', pack === 'OFF' ? 'false' : 'true')
    fs.writeFileSync(optionsShaders, buf, {encoding: 'utf-8'})
}

exports.ensureDefaultShaderpack = function(instanceDir, pack){
    exports.validateDir(instanceDir)
    if(fs.existsSync(path.join(instanceDir, SHADER_CONFIG))){
        return false
    }
    exports.setEnabledShaderpack(instanceDir, pack)
    return true
}
```

- [ ] **Step 3: FullRepair 이후 최초 기본값 적용**

`landing.js` 상단에 `DropinModUtil`과 `NEWPLAY`를 import하고, `dlAsync()`에서 파일 다운로드/검증이 끝난 뒤 `ProcessBuilder`를 만들기 전에 다음을 호출한다.

```js
const instanceDir = path.join(ConfigManager.getInstanceDirectory(), serv.rawServer.id)
DropinModUtil.ensureDefaultShaderpack(instanceDir, NEWPLAY.DEFAULT_SHADERPACK.fileName)
```

이 호출은 셰이더 ZIP 다운로드 성공 뒤에 있어야 하지만 `optionsshaders.txt`를 배포 복구 대상으로 넣어서는 안 된다.

- [ ] **Step 4: 검증과 커밋**

```powershell
npm test
npm run lint
git add app/assets/js/dropinmodutil.js app/assets/js/scripts/landing.js test/dropinmodutil.test.js
git commit -m "feat: 최초 셰이더 활성화와 사용자 설정 보존"
```

---

### Task 6: Nebula 입력 팩과 제3자 파일 정책

**Files:**

- Create: `pack/meta/distrometa.json`
- Create: `pack/news.xml`
- Create: `pack/servers/NewPlay-1.21.4/servermeta.json`
- Create: `pack/servers/NewPlay-1.21.4/NewPlay.png`
- Create: `pack/servers/NewPlay-1.21.4/fabricmods/required/*.jar`
- Create: `pack/servers/NewPlay-1.21.4/files/shaderpacks/.gitkeep`
- Create: `scripts/fetch-third-party.ps1`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `.gitignore`
- Create: `test/pack-contract.test.js`

- [ ] **Step 1: KeyChecker 권리 확인**

사용자에게 `xlxk_` 본인이거나 이 JAR을 공개 배포할 허가가 있는지 확인한다. 부정/불명확하면 공개 Pages 배포는 중단하고, KeyChecker 제작자에게 허가를 받거나 해당 모드를 빼는 결정을 요청한다. 긍정 답변을 작업 기록과 `THIRD_PARTY_NOTICES.md`에 남긴 뒤에만 JAR을 복사한다.

- [ ] **Step 2: 팩 계약 테스트 작성**

```js
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
    const mods = fs.readdirSync(path.join(serverRoot, 'fabricmods', 'required'))
    assert.equal(mods.filter(x => x.endsWith('.jar')).length, 4)
    const ignore = fs.readFileSync('.gitignore', 'utf8')
    assert.match(ignore, /pack\/servers\/NewPlay-1\.21\.4\/files\/shaderpacks\/\*\.zip/)
})
```

Expected: pack metadata가 없어 FAIL.

- [ ] **Step 3: Nebula metadata 작성**

`pack/meta/distrometa.json`:

```json
{
  "meta": {
    "rss": "https://morebetter-dev.github.io/NewPlay-launcher/news.xml"
  }
}
```

`pack/news.xml`은 뉴스 UI가 없어도 schema의 유효한 URL을 유지하기 위한 최소 RSS 2.0 문서로 만든다.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel><title>뉴플레이 런처</title><link>https://newplay.kr</link><description>뉴플레이 런처 배포 피드</description></channel></rss>
```

`servermeta.json`:

```json
{
  "meta": {
    "version": "1.0.0",
    "name": "뉴플레이",
    "description": "뉴플레이 Minecraft 1.21.4",
    "icon": "https://morebetter-dev.github.io/NewPlay-launcher/servers/NewPlay-1.21.4/NewPlay.png",
    "address": "newplay.kr",
    "mainServer": true,
    "autoconnect": true,
    "javaOptions": {
      "supported": ">=21 <22",
      "suggestedMajor": 21,
      "ram": { "minimum": 2048, "recommended": 4096 }
    }
  },
  "fabric": { "version": "0.16.9" },
  "untrackedFiles": []
}
```

- [ ] **Step 4: 모드와 아이콘 입력 배치**

확인된 네 JAR을 이름 변경 없이 `fabricmods/required/`로 복사한다. `NewPlay.png`는 Task 2의 정사각형 브랜드 자산을 복사한다. `THIRD_PARTY_NOTICES.md`에 Fabric API(Apache-2.0), Iris(LGPL-3.0-only), Sodium(PolyForm Shield 1.0.0), Key Checker(권리 확인 결과), Complementary Unbound(공식 Modrinth 배포, 수정 없음)를 기록한다.

`.gitignore`에는 최소 다음을 추가한다.

```gitignore
node_modules/
dist/
site/
pack/schemas/
pack/.cache/
pack/servers/NewPlay-1.21.4/files/shaderpacks/*.zip
!pack/servers/NewPlay-1.21.4/files/shaderpacks/.gitkeep
```

- [ ] **Step 5: 공식 셰이더 fetch/검증 script 작성**

`scripts/fetch-third-party.ps1`은 `newplayconstants.js`와 같은 URL/크기/SHA-512 값을 사용해 파일이 없거나 해시가 다를 때만 Modrinth에서 다시 받는다. 최종 해시가 다르면 파일을 삭제하고 non-zero로 끝낸다. 저장 위치는 다음 하나뿐이다.

```text
pack/servers/NewPlay-1.21.4/files/shaderpacks/ComplementaryUnbound_r5.8.1.zip
```

- [ ] **Step 6: 검증과 커밋**

```powershell
powershell.exe -NoProfile -File scripts/fetch-third-party.ps1
npm test
npm run lint
git status --short
```

Expected: 셰이더 ZIP은 `git status`에 나타나지 않고 네 모드 JAR만 pack 입력으로 나타난다.

```powershell
git add .gitignore THIRD_PARTY_NOTICES.md pack scripts/fetch-third-party.ps1 test/pack-contract.test.js
git commit -m "feat: Minecraft 1.21.4 Fabric 배포 팩 구성"
```

---

### Task 7: Pages 게시 트리 후처리와 검증

**Files:**

- Create: `scripts/prepare-pages.js`
- Create: `scripts/verify-distribution.js`
- Create: `test/prepare-pages.test.js`
- Modify: `package.json`

- [ ] **Step 1: 후처리 실패 테스트 작성**

테스트 fixture는 temp 폴더에 최소 `distribution.json`과 셰이더 파일을 만든다. `preparePages(pack, site)` 실행 후 다음을 검증한다.

```js
test('pages output rewrites and removes Complementary mirror', t => {
    const { preparePages } = require('../scripts/prepare-pages')
    const { pack, site, shaderPath } = makeFixture(t)
    preparePages(pack, site)
    const distro = JSON.parse(fs.readFileSync(path.join(site, 'distribution.json')))
    const shader = distro.servers[0].modules[0]
    assert.equal(shader.artifact.url, NEWPLAY.DEFAULT_SHADERPACK.url)
    assert.equal(fs.existsSync(path.join(site, shaderPath)), false)
    assert.equal(fs.existsSync(path.join(site, '.nojekyll')), true)
})
```

```powershell
npm test -- --test-name-pattern="Pages output"
```

Expected: module을 찾을 수 없어 FAIL.

- [ ] **Step 2: deterministic Pages 후처리 구현**

`prepare-pages.js`는 CommonJS module로 다음 순서를 수행한다.

1. 기존 `site/` 삭제 후 `pack/`을 재귀 복사한다.
2. `distribution.json`의 모든 server/module/subModules를 순회한다.
3. `artifact.path === 'shaderpacks/ComplementaryUnbound_r5.8.1.zip'`인 정확히 한 module의 URL을 Modrinth URL로 변경한다.
4. size와 MD5가 상수와 다르면 실패한다.
5. `site/`의 셰이더 ZIP, `meta/`, `schemas/`, `.cache/`, `servermeta.json`을 제거한다.
6. 수정된 JSON과 빈 `.nojekyll`을 쓴다.
7. 셰이더 module이 0개 또는 2개 이상이면 실패한다.

CLI 진입점:

```js
if(require.main === module){
    preparePages(path.resolve('pack'), path.resolve('site'))
}

module.exports = { preparePages }
```

- [ ] **Step 3: 배포 검증 script 구현**

`verify-distribution.js`는 다음만 검증한다.

- `site/distribution.json`이 object이며 `version`, `rss`, `servers[]`, 각 server의 `id`, `minecraftVersion`, `modules[]`, 각 module의 `type`과 `artifact` 필드를 갖는다.
- `https://morebetter-dev.github.io/NewPlay-launcher/`로 시작하는 각 artifact URL이 `site/`의 파일로 매핑되고 size/MD5가 일치한다.
- Modrinth 셰이더 URL을 temp로 내려받아 size/SHA-512가 상수와 일치한다.
- `distribution.json`에 `newplay.kr`, Minecraft `1.21.4`, Fabric `0.16.9`, `mainServer/autoconnect=true`가 있다.

package scripts:

```json
{
  "pack:prepare": "node scripts/prepare-pages.js",
  "pack:verify": "node scripts/verify-distribution.js site/distribution.json"
}
```

- [ ] **Step 4: 로컬 Nebula 생성과 검증**

Nebula commit `7ffc978727b95e03ae9d125688cf5cf132b78419`를 별도 temp 폴더에서 사용한다.

```powershell
$env:ROOT = (Resolve-Path 'pack')
$env:BASE_URL = 'https://morebetter-dev.github.io/NewPlay-launcher/'
node C:\tmp\Nebula\dist\index.js generate distro
npm run pack:prepare
npm run pack:verify
npm test
```

Expected: `site/distribution.json` 생성, 모든 Pages 파일 해시 통과, 셰이더는 Modrinth URL이며 `site/`에 ZIP 없음.

- [ ] **Step 5: 커밋**

```powershell
git add scripts/prepare-pages.js scripts/verify-distribution.js test/prepare-pages.test.js package.json package-lock.json
git commit -m "feat: Pages 배포 트리 생성과 무결성 검증 추가"
```

---

### Task 8: Windows CI와 공식 GitHub Pages 배포

**Files:**

- Modify: `.github/workflows/build.yml`
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Windows build workflow 축소**

`build.yml`은 Windows 하나만 사용한다.

```yaml
name: Windows build
on:
  push:
  pull_request:

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run dist:win
      - uses: actions/upload-artifact@v6
        with:
          name: newplay-launcher-windows-x64
          path: dist/*
```

- [ ] **Step 2: Pages workflow 작성**

`pages.yml`은 default branch push와 수동 실행만 배포한다. Nebula는 별도 checkout으로 pinned commit을 사용한다.

```yaml
name: Deploy modpack to GitHub Pages
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'pack/**'
      - 'scripts/fetch-third-party.ps1'
      - 'scripts/prepare-pages.js'
      - 'scripts/verify-distribution.js'
      - '.github/workflows/pages.yml'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/checkout@v6
        with:
          repository: dscalzi/Nebula
          ref: 7ffc978727b95e03ae9d125688cf5cf132b78419
          path: .nebula
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm ci --prefix .nebula
      - run: npm run build --prefix .nebula
      - shell: pwsh
        run: ./scripts/fetch-third-party.ps1
      - name: Generate distribution
        env:
          ROOT: ${{ github.workspace }}/pack
          BASE_URL: https://morebetter-dev.github.io/NewPlay-launcher/
        run: node .nebula/dist/index.js generate distro
      - run: npm run pack:prepare
      - run: npm run pack:verify
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: site

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: workflow syntax와 로컬 명령 검증**

```powershell
npm test
npm run lint
npm run pack:prepare
npm run pack:verify
```

GitHub 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정한 후 수동 workflow를 1회 실행한다. 다음 URL이 200과 JSON을 반환해야 한다.

```text
https://morebetter-dev.github.io/NewPlay-launcher/distribution.json
```

- [ ] **Step 4: 커밋**

```powershell
git add .github/workflows/build.yml .github/workflows/pages.yml
git commit -m "ci: Windows 빌드와 모드팩 Pages 배포 구성"
```

---

### Task 9: Microsoft Entra Client ID 발급과 Release 차단 검사

**Files:**

- Modify: `app/assets/js/ipcconstants.js`
- Create: `scripts/verify-release-config.js`
- Create: `docs/MicrosoftAuth.ko.md`
- Modify: `README.md`
- Create: `test/release-config.test.js`

- [ ] **Step 1: Entra 애플리케이션 등록**

Microsoft Entra 관리 센터에서 다음 값으로 등록한다.

1. 이름: `뉴플레이 런처`
2. 지원 계정: 모든 조직 디렉터리 + 개인 Microsoft 계정
3. 플랫폼: Mobile and desktop applications
4. Redirect URI: `https://login.microsoftonline.com/common/oauth2/nativeclient`
5. 발급된 **Application (client) ID**를 복사한다.

Client Secret 값은 코드나 대화 로그에 복사하지 않는다. Helios upstream 문서가 요구하는 등록 절차가 현재 포털에서도 필요한지 화면 기준으로 확인하되, 런처에 Secret을 넣지 않는다.

- [ ] **Step 2: 실제 Client ID 반영과 로그인 시도**

`ipcconstants.js`의 upstream ID `1ce6e35a-126f-48fd-97fb-54d143ac6d45`를 방금 발급한 실제 UUID로 교체한다. 그 상태로 `npm start` 후 Microsoft 로그인을 한 번 시도한다. Minecraft API 승인을 신청하기 전 로그인 시도가 필수다.

- [ ] **Step 3: Minecraft API 승인 요청**

`https://aka.ms/mce-reviewappid` 양식에 새 App ID와 Tenant ID, 저장소/제품 정보를 제출한다. 승인 완료 및 반영까지 기다린 뒤 실제 Minecraft 보유 계정 로그인을 다시 검증한다.

- [ ] **Step 4: Release 차단 테스트 작성**

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const { AZURE_CLIENT_ID } = require('../app/assets/js/ipcconstants')

test('release uses the approved NewPlay client id', () => {
    assert.match(AZURE_CLIENT_ID, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    assert.notEqual(AZURE_CLIENT_ID, '1ce6e35a-126f-48fd-97fb-54d143ac6d45')
})
```

`verify-release-config.js`는 위 검사에 더해 Pages distribution URL 200, 제품 version이 prerelease가 아님, repository owner/repo가 `morebetter-dev/NewPlay-launcher`인지 검사한다. `package.json`에 다음을 추가한다.

```json
"verify:release": "node scripts/verify-release-config.js"
```

- [ ] **Step 5: 한국어 운영 문서 작성**

`docs/MicrosoftAuth.ko.md`에 발급/Redirect URI/최초 로그인/승인 양식/24시간 반영 가능성/토큰 비저장 원칙을 기록한다. README에는 다음을 포함한다.

- Windows x64 설치/개발/빌드 명령
- Minecraft 1.21.4, Fabric 0.16.9, Java 21, 4GB 기본 RAM
- Pages 모드팩과 Releases 런처 업데이트의 역할 분리
- `newplay.kr` 자동 접속
- HeliosLauncher MIT 저작권과 원본 링크
- Complementary 공식 프로젝트 credit 및 문제 책임이 뉴플레이 팩 제작자에게 있다는 고지
- 코드 미서명 초기 설치 파일의 SmartScreen 안내

- [ ] **Step 6: 검증과 커밋**

```powershell
npm test
npm run lint
npm run verify:release
git add app/assets/js/ipcconstants.js scripts/verify-release-config.js docs/MicrosoftAuth.ko.md README.md test/release-config.test.js package.json package-lock.json
git commit -m "docs: Microsoft 인증과 배포 전 검사 구성"
```

---

### Task 10: 전체 설치·실행·업데이트 검증

**Files:**

- Modify if needed: `README.md`
- Create: `docs/release-checklist.md`

- [ ] **Step 1: 정적/단위/패키징 검증**

```powershell
npm ci
npm test
npm run lint
npm run pack:prepare
npm run pack:verify
npm run verify:release
npm run dist:win
git diff --check
git status --short
```

Expected: 모든 명령 exit code 0, 의도하지 않은 파일 없음, Windows x64 installer/updater 파일 생성.

- [ ] **Step 2: 깨끗한 Windows 사용자 시나리오**

`docs/release-checklist.md`에 결과를 체크한다.

1. 기존 뉴플레이 데이터가 없는 Windows 계정에 설치.
2. 설치 앱/창/작업 표시 이름이 `뉴플레이 런처`인지 확인.
3. Microsoft 로그인 및 계정 재선택 확인.
4. Java 21이 없는 상태에서 자동 JDK 설치 확인.
5. Minecraft 1.21.4/Fabric 0.16.9/모드 4개/셰이더 다운로드 확인.
6. 첫 실행에서 Complementary가 켜지고, 설정에서 OFF 후 재실행해도 OFF인지 확인.
7. 드롭다운이 잘리지 않고 300px 이후 내부 스크롤인지 확인.
8. 게임이 `newplay.kr`로 자동 접속하는지 확인.
9. 모드 JAR 하나를 손상시켜 해당 파일만 복구되는지 확인.
10. 서버 상태 조회 실패가 게임 실행을 막지 않는지 확인.
11. Pages 연결 실패 시 이전 정상 distribution cache를 쓰는지 확인.

- [ ] **Step 3: updater 검증**

GitHub Release draft에 `dist/`의 NSIS installer, `latest.yml`, updater package를 올린다. 공개 전 파일명/version을 확인한다. 1.0.1 테스트 빌드를 별도 draft로 만들어 1.0.0 설치 상태에서 자동 업데이트 후 기존 게임 데이터/설정이 유지되는지 확인한다.

- [ ] **Step 4: 최종 코드 검토 요청**

`superpowers:requesting-code-review`를 호출해 설계 문서 대비 누락, 보안 토큰 노출, 플랫폼 범위, 배포 URL, 셰이더 설정 보존, 드롭다운 stacking을 검토한다. 발견된 문제를 고친 후 전체 명령을 다시 실행한다.

- [ ] **Step 5: 최종 커밋**

```powershell
git add docs/release-checklist.md README.md
git commit -m "test: 첫 Windows 배포 검증 결과 기록"
```

완료 후 `superpowers:verification-before-completion`으로 실제 출력 증거를 확인하고, `superpowers:finishing-a-development-branch`로 merge/PR/branch 유지 중 사용자 선택을 받는다.
