# 뉴플레이 런처 설계

- 작성일: 2026-07-19
- 대상 저장소: `morebetter-dev/NewPlay-launcher`
- 기반 프로젝트: [dscalzi/HeliosLauncher](https://github.com/dscalzi/HeliosLauncher)
- 대상 운영체제: Windows x64

## 1. 목표

사용자가 Windows 설치 파일을 설치하고 Microsoft 계정으로 로그인한 뒤, 별도 Java·Fabric·모드·셰이더 설정 없이 `newplay.kr` 서버에 접속할 수 있는 Minecraft 커스텀 런처를 만든다.

첫 공개 버전의 완료 조건은 다음과 같다.

1. `뉴플레이 런처` 이름으로 설치·실행된다.
2. Microsoft 계정 인증이 동작한다.
3. Minecraft 1.21.4, Java 21, Fabric과 지정된 클라이언트 파일을 자동 설치한다.
4. 파일 손상을 검출하고 필요한 파일만 다시 내려받는다.
5. Minecraft 실행 후 `newplay.kr`에 자동 접속한다.
6. GitHub Releases로 런처를, GitHub Pages로 모드팩을 갱신할 수 있다.

## 2. 범위

### 포함

- HeliosLauncher 기반 Windows x64 런처
- 뉴플레이 디자인 시스템과 NP 로고 적용
- Microsoft 계정 인증
- 단일 서버 `newplay.kr`
- Java 21 자동 검색·설치
- Minecraft 1.21.4와 Fabric Loader 설치
- 필수 모드와 셰이더팩 자동 설치·검증
- 셰이더 기본 활성화와 사용자 비활성화 설정
- GitHub Releases 기반 런처 업데이트와 GitHub Pages 기반 모드팩 배포
- 한국어 사용자 오류 메시지

### 제외

- macOS 및 Linux 빌드
- 다중 서버 선택
- Mojang 구형 로그인
- 뉴스 피드
- Discord Rich Presence
- 자체 회원가입이나 별도 계정 서버
- HeliosLauncher 핵심 다운로드·실행 엔진 재작성

## 3. 기반과 저장소 구조

HeliosLauncher의 기존 계정 관리, Java 관리, 파일 복구, Minecraft 실행, Electron 자동 업데이트 기능을 재사용한다. 원본 프로젝트의 저자 표기와 저장소 링크를 애플리케이션 또는 저장소 문서에 유지한다.

최상위 저장소는 다음 역할만 가진다.

```text
NewPlay-launcher/
├─ app/                         # HeliosLauncher 애플리케이션
├─ build/                       # Windows 아이콘 등 빌드 자산
├─ pack/                        # Nebula 입력 데이터
│  ├─ meta/
│  └─ servers/NewPlay-1.21.4/
│     ├─ fabricmods/required/
│     ├─ files/shaderpacks/
│     └─ servermeta.json
├─ docs/superpowers/specs/      # 승인된 설계
├─ newplay-main-logo.png        # 제공된 NP 원본 로고
├─ electron-builder.yml
└─ package.json
```

Nebula는 `pack/`을 입력으로 사용해 `distribution.json`을 생성한다. Nebula 자체 소스는 저장소에 복제하거나 서브모듈로 넣지 않고, 배포 생성 시 별도 도구로 실행한다.

## 4. 클라이언트 구성

| 구성 | 버전 | 설치 정책 |
|---|---:|---|
| Minecraft | 1.21.4 | 필수 |
| Java | 21 | 권장 메이저 21, 자동 설치 |
| Fabric Loader | 0.16.9 | 고정 |
| Fabric API | 0.119.4+1.21.4 | 필수 |
| Iris | 1.8.8+mc1.21.4 | 필수 |
| Sodium | 0.6.9+mc1.21.4 | 필수 |
| Key Checker Mod | 1.21.4 | 필수 |
| Complementary Unbound | r5.8.1 | 기본 셰이더팩 |

모든 모드는 사용자가 끌 수 없는 필수 모듈로 선언한다. 런처는 인스턴스의 `optionsshaders.txt`가 없을 때만 Complementary Unbound 선택과 활성화 기본값을 기록한다. 이 파일은 배포 해시 검증 대상에 넣지 않아 사용자가 셰이더를 끈 뒤 설정이 자동 복구로 되돌아가지 않게 한다. GPU 호환성이나 성능 문제가 있을 때는 런처 설정에서 셰이더를 끌 수 있게 한다.

기본 메모리는 4GB, 최소 선택값은 2GB로 한다. 사용자는 기존 Helios 설정 화면에서 메모리를 조정할 수 있다.

## 5. 사용자 화면

제품 표시 이름은 모든 위치에서 `뉴플레이 런처`로 통일한다.

- Windows 설치 파일과 설치된 앱 목록
- 시작 메뉴와 작업 표시줄
- 런처 창 및 Microsoft 로그인 창
- 자동 업데이트 알림

메인 화면은 단일 서버에 맞춰 다음 정보만 표시한다.

- Microsoft 계정 상태
- `newplay.kr` 서버 상태
- Minecraft 및 모드팩 버전
- 게임 시작 버튼
- 설정 진입점

서버 선택 UI는 제거한다. 설정에는 계정 관리, 메모리, 해상도, 게임 데이터 폴더, 셰이더 활성화만 유지한다.

### 디자인 규칙

사용자가 제공한 뉴플레이 Design System v4.0과 `newplay-main-logo.png`를 기준으로 한다.

- 페이지 배경: `#0f0f0f`
- 최하단 배경: `#0a0a0a`
- 카드: `#1a1a1a`, 보더 `#252525`, `rounded-md`
- 카드 내부 블록: `#252525`, 보더 `#333333`
- Primary: `oklch(0.63 0.1510 9.0)`
- 버튼 hover: 배경색 변경이 아니라 15% inset shadow
- 본문 글꼴: Pretendard와 시스템 sans-serif fallback
- 포커스 가능한 요소: 보이는 2px brand 색상 ring
- 텍스트 대비: WCAG AA 4.5:1 이상
- 드롭다운 상위 컨테이너: `overflow: visible`
- 드롭다운 패널: `z-index: 9999`, 최대 높이 300px 이후 내부 세로 스크롤

초기 시안은 방향을 정의하는 기준이며, 이후 CSS와 이미지 변경으로 디자인을 계속 다듬을 수 있다.

## 6. 실행 데이터 흐름

1. 런처 시작 시 GitHub Pages의 최신 `distribution.json`을 HTTPS로 요청한다.
2. 요청 성공 시 로컬 캐시를 갱신하고, 실패 시 마지막 정상 배포 정보를 사용한다.
3. 사용자가 게임 시작을 누르면 Java 21 설치 상태를 확인한다.
4. Mojang·Fabric·Modrinth 공식 배포 파일과 GitHub Pages의 뉴플레이 파일을 검사한다.
5. 크기와 해시가 맞지 않는 파일만 다운로드한다.
6. Microsoft 인증 토큰으로 Minecraft를 실행한다.
7. 자동 접속 인수로 `newplay.kr`에 연결한다.

최초 실행에서 원격 배포 정보를 한 번도 받은 적이 없으면 게임을 실행하지 않고 재시도 안내를 표시한다. 서버 상태 확인 실패는 게임 실행을 막지 않는다.

## 7. GitHub Pages 및 Releases 배포

런처가 읽는 배포 인덱스 주소는 다음으로 고정한다.

```text
https://morebetter-dev.github.io/NewPlay-launcher/distribution.json
```

Nebula가 만든 폴더 구조에서 라이선스상 외부 배포가 필요한 파일만 분리한 뒤, 나머지를 공식 GitHub Pages Actions 배포 아티팩트로 게시한다. 이 구조에는 다음 파일이 포함된다.

- `distribution.json`
- Fabric 버전 메타데이터와 라이브러리
- 버전이 고정된 모드 JAR 4개

Complementary Unbound ZIP은 라이선스가 직접 재업로드를 금지하므로 GitHub Pages에 올리지 않는다. `distribution.json`의 셰이더 모듈 URL만 다음 Modrinth 공식 파일로 바꾸고, 크기와 SHA-512가 제공된 원본 ZIP과 일치하는지 배포 전에 확인한다.

```text
https://cdn.modrinth.com/data/R6NEzAwj/versions/VMHXIk50/ComplementaryUnbound_r5.8.1.zip
```

뉴플레이 런처와 README에는 Complementary Development의 저작물임을 보이게 표시하고 공식 프로젝트 링크를 제공한다. 셰이더 ZIP 내용은 수정하지 않는다.

각 GitHub Release에는 런처 업데이트에 필요한 다음 파일만 올린다.

- Windows x64 NSIS 설치 파일
- Electron updater 메타데이터와 패키지

`distribution.json` 내부 뉴플레이 파일 URL은 GitHub Pages의 동일 폴더 구조를, Complementary Unbound는 위 Modrinth URL을 가리킨다. 새 팩은 게시용 출력 전체를 검증한 뒤 하나의 GitHub Pages 아티팩트로 배포해 인덱스와 파일 버전이 섞이지 않게 한다.

런처 Release는 초안으로 만든 뒤 설치 파일과 updater 메타데이터를 검증하고 마지막에 공개한다. 모드팩만 변경한 경우에는 새 런처 Release 없이 `distribution.json`의 서버 팩 버전을 올리고 GitHub Pages만 갱신한다.

## 8. Microsoft 인증 전제 조건

저장소 소유자는 Microsoft Entra에서 데스크톱 애플리케이션을 등록하고 Application Client ID를 발급받는다. Minecraft API 사용 승인을 요청하기 전에 해당 ID로 로그인 시도를 한 번 수행한다.

Client ID는 비밀값이 아니므로 발급 후 소스에 저장할 수 있다. 실제 Release 빌드는 발급된 Client ID가 적용되고 Microsoft 승인이 완료된 뒤 배포한다. 액세스 토큰과 갱신 토큰은 로그, Git 저장소, Release 자산에 기록하지 않는다.

## 9. 오류 처리

| 상황 | 동작 |
|---|---|
| 최신 배포 인덱스 요청 실패 | 마지막 정상 캐시 사용 |
| 최초 실행이며 배포 캐시 없음 | 한국어 오류와 재시도 표시 |
| 파일 크기·해시 불일치 | 해당 파일만 다시 다운로드 |
| 같은 파일 다운로드 반복 실패 | 파일명과 재시도 동작 표시 |
| Microsoft 인증 취소·실패 | 토큰을 노출하지 않고 재로그인 제공 |
| Java 21 없음 | 호환 JDK 자동 설치 |
| 서버 상태 조회 실패 | 오프라인 표시, 게임 시작은 허용 |
| 셰이더 성능·호환성 문제 | 설정에서 셰이더 비활성화 허용 |
| 업데이트 실패 | 기존 설치를 보존하고 다음 실행에 재시도 |

설정이나 기존 설치를 파괴하는 자동 복구는 하지 않는다. 다운로드한 파일을 교체하기 전 검증하고, 실패 시 마지막 정상 파일을 유지한다.

## 10. 검증

### 자동 검증

- `npm run lint`
- Nebula 배포 JSON 스키마 검증
- 모든 GitHub Pages 및 Modrinth 배포 자산 URL의 HTTPS 응답 확인
- 배포 JSON의 파일 크기·해시와 실제 자산 비교
- Electron Windows x64 패키징 성공 확인

### 수동 검증

1. 기존 데이터가 없는 Windows 사용자 계정에서 설치한다.
2. Windows 설치·제거 목록과 창에 `뉴플레이 런처`가 표시되는지 확인한다.
3. Microsoft 로그인과 계정 재선택을 확인한다.
4. Java 21이 없는 환경에서 자동 설치를 확인한다.
5. Minecraft, Fabric, 필수 모드, 셰이더팩 다운로드를 확인한다.
6. 셰이더 기본 활성화와 설정의 비활성화를 확인한다.
7. 게임 실행 후 `newplay.kr` 자동 접속을 확인한다.
8. 모드 파일 하나를 손상시킨 뒤 자동 복구를 확인한다.
9. 네트워크를 끊고 마지막 정상 배포 정보로 동작하는지 확인한다.
10. 이전 버전 설치 상태에서 GitHub Release 자동 업데이트를 확인한다.

## 11. 배포 제약

- 코드 서명 인증서가 없는 초기 빌드는 Windows SmartScreen 경고가 표시될 수 있다.
- Entra Client ID 발급과 Minecraft API 승인은 저장소 외부에서 완료해야 한다.
- GitHub Release 게시 권한과 Actions의 `pages: write`, `id-token: write` 권한이 필요하다.
- HeliosLauncher의 `LICENSE.txt`에 따른 MIT 저작권·허가 고지를 배포물과 저장소에 유지하고, README에 요청된 저자 표기와 원본 링크도 함께 제공한다.
- 모드와 셰이더팩은 각 프로젝트의 재배포 조건을 Release 전에 확인한다.
- Complementary Unbound는 GitHub Pages나 Release에 재업로드하지 않고 Modrinth 공식 파일만 사용한다.

## 12. 의도적인 단순화

- 단일 서버 전용이므로 서버 선택과 다중 배포 구성을 만들지 않는다.
- Windows x64 외 플랫폼 빌드와 테스트를 만들지 않는다.
- 별도 패치 서버를 운영하지 않고 GitHub Pages와 GitHub Releases를 사용한다.
- 자동화된 Release 파이프라인은 첫 수동 Release가 검증된 뒤 반복 작업이 실제 부담이 될 때 추가한다.
