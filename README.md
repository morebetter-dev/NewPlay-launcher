# 뉴플레이 런처

`newplay.kr` 전용 Windows x64 Minecraft 런처다. Microsoft 계정으로 로그인하면 Minecraft 1.21.4, Fabric 0.16.9, 필수 모드와 셰이더를 검사·다운로드하고 서버에 자동 접속한다.

## 설치와 실행

설치 파일은 [GitHub Releases](https://github.com/morebetter-dev/NewPlay-launcher/releases)에서 제공한다. 초기 설치 파일은 코드 서명이 없어 Windows SmartScreen 경고가 표시될 수 있다. 출처가 `morebetter-dev/NewPlay-launcher`인지 확인한 뒤 실행한다.

기본 클라이언트 구성은 다음과 같다.

- Windows x64
- Minecraft 1.21.4
- Fabric Loader 0.16.9
- Java 21 자동 확인 및 설치
- 권장 메모리 4GB
- Fabric API, Iris, Sodium, Key Checker
- Complementary Unbound r5.8.1

## 개발

Node.js 22가 필요하다.

```powershell
npm ci
npm start
```

테스트와 Windows 설치 파일 빌드:

```powershell
npm test
npm run lint
npm run dist:win
```

Microsoft 인증 등록은 [한국어 인증 안내](docs/MicrosoftAuth.ko.md)를 따른다. Client Secret, 액세스 토큰, 갱신 토큰은 저장소나 로그에 넣지 않는다.

## 배포 구조

- GitHub Pages는 `distribution.json`, Fabric 라이브러리와 필수 모드 파일을 제공한다.
- GitHub Releases는 Windows 설치 파일과 자동 업데이트 메타데이터를 제공한다.
- Complementary Unbound ZIP은 저장소나 Pages에 재업로드하지 않고 공식 Modrinth CDN에서 직접 내려받아 크기와 SHA-512를 확인한다.

팩 생성과 검증:

```powershell
powershell.exe -NoProfile -File scripts/fetch-third-party.ps1
# 고정된 dscalzi/Nebula로 pack/distribution.json을 생성한 뒤
npm run pack:prepare
npm run pack:verify
```

## 저작권과 제3자 구성요소

이 프로젝트는 Daniel Scalzi의 [HeliosLauncher](https://github.com/dscalzi/HeliosLauncher)를 기반으로 하며 MIT 라이선스와 원저작자 고지를 유지한다. 자세한 라이선스와 배포 고지는 [LICENSE.txt](LICENSE.txt), [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 참고한다.

[Complementary Unbound](https://modrinth.com/shader/complementary-unbound)는 원 제작자의 공식 프로젝트에서 수정 없이 배포되는 셰이더다. 뉴플레이 팩 구성이나 런처에서 발생한 문제는 셰이더 제작자가 아닌 뉴플레이 팩 제작자에게 문의한다.
