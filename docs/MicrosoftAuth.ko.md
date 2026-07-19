# 뉴플레이 런처 Microsoft 인증 등록

뉴플레이 런처는 Microsoft Entra에 등록한 데스크톱 공개 클라이언트의 Application (client) ID를 사용한다. Client ID는 공개 식별자이므로 저장소에 넣을 수 있지만, Client Secret과 액세스·갱신 토큰은 만들거나 저장소 및 로그에 기록하지 않는다.

## 1. 애플리케이션 등록

1. [Microsoft Entra 관리 센터](https://entra.microsoft.com)에 로그인한다.
2. **Entra ID → App registrations → New registration**을 연다.
3. 이름을 `뉴플레이 런처`로 입력한다.
4. 지원 계정 유형은 **모든 조직 디렉터리의 계정 및 개인 Microsoft 계정**을 선택한다.
5. Redirect URI는 비워 둔 채 등록한다.
6. 등록된 앱의 **Authentication → Add a platform → Mobile and desktop applications**를 연다.
7. `https://login.microsoftonline.com/common/oauth2/nativeclient`를 선택하고 저장한다.
8. Overview에서 **Application (client) ID**와 **Directory (tenant) ID**를 기록한다.

공개 데스크톱 클라이언트이므로 Client Secret은 필요하지 않으며 런처에도 넣지 않는다. 현재 포털 절차는 [Microsoft의 앱 등록 문서](https://learn.microsoft.com/en-us/graph/auth-register-app-v2)와 [Redirect URI 문서](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri)를 기준으로 한다.

## 2. 런처에 Client ID 적용

`app/assets/js/ipcconstants.js`의 `AZURE_CLIENT_ID`를 발급된 Application (client) ID로 교체한다. UUID 이외의 값이나 Client Secret을 붙여 넣지 않는다.

```powershell
npm start
```

런처에서 Microsoft 로그인을 한 번 시도한다. Minecraft API 승인을 받기 전에는 인증 마지막 단계에서 거절될 수 있으며, 승인 요청 전에 새 App ID로 로그인 시도를 남겨야 한다.

## 3. Minecraft API 승인 요청

1. [Minecraft 애플리케이션 검토 양식](https://aka.ms/mce-reviewappid)을 연다.
2. 새 Application (client) ID와 Directory (tenant) ID, `뉴플레이 런처`, 저장소 주소를 입력한다.
3. 승인을 기다린다.
4. 승인 통보 후 반영에 최대 24시간이 걸릴 수 있으므로, 이후 Minecraft 보유 계정으로 다시 로그인한다.

## 4. 출시 전 확인

```powershell
npm run verify:release
```

이 명령은 Helios 원본 Client ID가 남아 있지 않은지, 버전과 저장소가 올바른지, 공개된 Pages 배포 JSON이 응답하는지 검사한다. 사용자 토큰은 Git, 빌드 로그, Release 자산에 포함하지 않는다.
