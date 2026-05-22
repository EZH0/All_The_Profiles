# WoW Addon Profile Vault

GitHub Pages에서 무료로 호스팅하는 월드 오브 워크래프트 애드온 프로파일 공유/백업 사이트 초안입니다.

이 README는 집/다른 환경의 Codex가 현재 대화 맥락 없이도 바로 이어서 작업할 수 있도록 작성되었습니다.

## Repository Split

현재 작업은 세 repository로 분리되어 있습니다.

```text
EZH0/All_The_Profiles
  public
  GitHub Pages 공유 사이트와 공개 데이터만 보관

EZH0/All_The_Profiles_Admin
  private
  로컬에서 여는 관리자 도구

EZH0/Profile_Exporter
  addon
  WoW 인게임 Profile Exporter 애드온
```

이 public repository에는 관리 페이지가 없습니다. GitHub Pages는 `main` 브랜치의 `/docs` 폴더에서 배포해야 합니다.

## 현재 목표

사용자가 사용하는 여러 WoW 애드온의 프로파일 export 문자열을 모아 저장하고 공유합니다.

원하는 최종 사용자 흐름:

1. WoW 안에서 별도 애드온 `VaultExporter`를 실행합니다.
2. `ElvUI`, `Details!`, `DBM`, WoW `편집 모드` 등 사용자가 지정한 애드온의 프로파일 export 문자열을 한 번에 수집합니다.
3. WoW 애드온은 하나의 큰 통합 export 문자열을 생성하고 EditBox에 표시합니다.
4. 사용자가 직접 `Ctrl+C`로 복사합니다.
5. `admin.html`에 붙여넣습니다.
6. admin 사이트가 통합 문자열을 블록 단위로 분리합니다.
7. 각 프로파일을 GitHub 저장소에 개별 파일로 저장합니다.
8. 공유 사이트는 각 항목을 검색/복사/다운로드할 수 있게 보여줍니다.

## 현재 구현된 웹 초안

- `docs/index.html`: GitHub Pages로 공개되는 공유용 페이지입니다.
- 관리용 페이지는 private repository `EZH0/All_The_Profiles_Admin`로 분리했습니다. 이 public repository에는 공개 사이트 파일만 둡니다.
- `docs/data/index.json`: 공개 사이트 정보와 프로파일 목록/메타데이터를 저장합니다.
- `docs/profiles/**/*.txt`: 실제 긴 애드온 프로파일 문자열을 저장합니다.
- `docs/assets/app.js`: 공유 페이지 로직입니다.
- `docs/assets/styles.css`: 공유 페이지 스타일입니다.

현재 검증:

- `assets/app.js` 문법 파싱 OK
- `assets/admin.js` 문법 파싱 OK
- `data/index.json` JSON 파싱 OK

주의:

- 이 세션에서는 내장 브라우저가 `file://`, `localhost`, `127.0.0.1` 접근을 차단해서 실제 렌더링 스크린샷 검증은 못 했습니다.

## GitHub Pages 배포 방향

GitHub Pages는 정적 호스팅입니다. 서버처럼 데이터를 받아 저장할 수 없습니다.

따라서 관리 페이지는 브라우저에서 GitHub API를 직접 호출해 저장소 파일을 커밋하는 방식으로 동작합니다.

권장 저장소:

- 개인 사이트: `github-username.github.io`
- 프로젝트 사이트: 아무 저장소 이름 사용 후 `https://github-username.github.io/repo-name/`

GitHub Pages 설정:

1. GitHub 저장소를 만듭니다.
2. 이 파일들을 저장소 루트에 올립니다.
3. `Settings > Pages`로 이동합니다.
4. `Deploy from a branch`를 선택합니다.
5. 브랜치 `main`, 폴더 `/docs`를 선택합니다.

공개 주소:

```text
https://ezh0.github.io/All_The_Profiles/
```

관리 페이지용 토큰:

- Fine-grained personal access token 권장
- 대상 저장소만 선택
- `Contents: Read and write` 권한 필요
- 토큰은 코드에 저장하지 않고 브라우저 세션에만 둡니다.

## 중요한 설계 변경 필요

2026-05-21 기준으로 이 설계 변경은 1차 반영되었습니다. 현재 사이트는 모든 문자열을 `data/profiles.json` 하나에 넣지 않고, 목록과 본문을 분리합니다.

GitHub REST API와 브라우저 UX를 고려하면 다음 구조로 바꾸는 것이 좋습니다.

```text
data/index.json
profiles/elvui/main.txt
profiles/details/dps.txt
profiles/dbm/raid.txt
profiles/editmode/main.txt
```

권장 역할:

- `docs/data/index.json`: 제목, 설명, 태그, 애드온명, 파일 경로, 업데이트 날짜만 저장합니다.
- `docs/profiles/**/*.txt`: 실제 긴 export 문자열을 개별 텍스트 파일로 저장합니다.

이유:

- `index.json`이 작아서 빠르게 로드됩니다.
- 긴 문자열을 한 JSON에 몰아넣지 않습니다.
- 한 프로파일 수정 시 해당 `.txt`만 갱신할 수 있습니다.
- 공유 페이지에서 복사 버튼과 `.txt 다운로드` 버튼을 둘 다 제공하기 쉽습니다.

현재 admin 페이지에서 가능한 작업:

관리 페이지는 이 repository가 아니라 private repository `EZH0/All_The_Profiles_Admin`에 있습니다.

- 개별 프로파일 문자열을 직접 붙여넣고 목록에 반영
- `===== WOW_PROFILE_VAULT BEGIN =====` 형식의 통합 문자열을 붙여넣어 여러 항목으로 분리
- 이미 분리해 둔 `.txt`, `.lua`, `.json` 파일 여러 개를 선택해 목록에 가져오기
- 공유 페이지 구성 수정
  - 패키지 이름
  - 버전 날짜
  - 요약
  - 필수 애드온 목록
  - 적용 순서 문단
  - 다운로드 리소스
- 프로파일 항목별 표시 정보 수정
  - 그룹/섹션
  - 표시 순서
  - 설명
  - 붙여넣기 안내
  - 태그
  - 저장 경로
- GitHub API로 index와 각 TXT 파일 저장

현재 공유 페이지에서 가능한 작업:

- 애드온/이름/태그/파일 경로 검색
- 애드온별 필터
- 프로파일 본문 복사
- 본문 미리보기
- 개별 TXT 다운로드

## 클립보드 관련 결정

Windows 클립보드 기록은 항목당 4MB 제한이 있습니다. 일반 클립보드 자체는 더 큰 텍스트도 처리할 수 있지만 브라우저/앱/메모리 상태에 영향을 받습니다.

따라서 공유 페이지에는 각 항목마다 다음 두 동작을 제공하는 것이 좋습니다.

- `복사`: `navigator.clipboard.writeText()` 사용
- `TXT 다운로드`: 클립보드 실패 또는 초대형 문자열 대비

WoW 애드온 쪽에서도 OS 클립보드에 조용히 자동 복사하는 기능은 기대하지 않습니다. WoW 보안 모델을 고려해 `Export 생성 -> EditBox 전체 선택 -> 사용자가 Ctrl+C` 방식으로 설계합니다.

## 통합 export 포맷 제안

WoW 애드온이 여러 애드온의 프로파일을 하나의 큰 문자열로 묶어 admin 사이트에 붙여넣게 합니다.

제안 포맷:

```text
===== WOW_PROFILE_VAULT BEGIN =====
addon: ElvUI
name: Main UI
format: elvui
version:
source: official-export
===== CONTENT =====
여기에 ElvUI 공식 export 문자열
===== WOW_PROFILE_VAULT END =====

===== WOW_PROFILE_VAULT BEGIN =====
addon: Details!
name: Damage Meter
format: details
version:
source: official-export
===== CONTENT =====
여기에 Details! 공식 export 문자열
===== WOW_PROFILE_VAULT END =====
```

admin 사이트의 다음 작업:

1. `통합 문자열 가져오기` 탭 추가
2. BEGIN/CONTENT/END 블록 파싱
3. `addon`, `name`, `format`, `version`, `source` 메타데이터 추출
4. 본문을 개별 `.txt` 파일로 저장
5. `data/index.json` 업데이트
6. GitHub API로 여러 파일을 순차 커밋하거나, 가능하면 한 커밋으로 묶는 방식 검토

## WoW 애드온 작업 방향

최종적으로 별도 WoW 애드온 `VaultExporter`를 만듭니다.

핵심 원칙:

- 사용자가 지원할 애드온을 직접 선택해서 하나씩 추가합니다.
- 내부 구현은 애드온별 어댑터 방식으로 만듭니다.
- 사용자에게는 버튼 하나로 보이지만 내부에서는 애드온별 export 함수를 순차 호출합니다.
- 공식 export 문자열을 얻을 수 있는 애드온은 공식 export 로직/API를 우선 사용합니다.
- 공식 export가 어렵거나 없는 애드온은 별도 `backup` 모드로 SavedVariables 기반 백업을 고려합니다.

예상 구조:

```text
VaultExporter/
  VaultExporter.toc
  Core.lua
  UI.lua
  Serializer.lua
  Adapters/
    ElvUI.lua
    Details.lua
    DBM.lua
    EditMode.lua
```

어댑터 인터페이스 예시:

```lua
VaultExporter.Adapters.elvui = {
  id = "elvui",
  label = "ElvUI",
  isAvailable = function()
    return _G.ElvUI ~= nil or _G.ElvUI_EltreumUI ~= nil
  end,
  getProfileName = function()
    -- ElvUI 현재 프로파일 이름 반환
  end,
  export = function()
    -- ElvUI 공식 export 문자열 반환
  end,
}
```

전체 export 흐름 예시:

```lua
local results = {}
for _, adapter in pairs(VaultExporter.Adapters) do
  if adapter.isAvailable() then
    local ok, result = pcall(adapter.export)
    if ok and result then
      table.insert(results, result)
    else
      table.insert(results, {
        addon = adapter.label,
        status = "error",
        message = "export failed"
      })
    end
  end
end
```

애드온별 조사 필요:

- ElvUI: 현재 프로파일명과 공식 export 함수/API 위치 확인
- Details!: 프로파일 export API 또는 내부 serialize 함수 확인
- DBM: 프로파일 export 기능 존재 여부 확인, 없으면 SavedVariables 백업 모드 검토
- EditMode: WoW 기본 편집 모드 API 또는 SavedVariables 구조 확인

필요한 자료:

- `World of Warcraft/_retail_/Interface/AddOns/` 중 지원할 애드온 폴더
- `World of Warcraft/_retail_/WTF/Account/.../SavedVariables/` 중 관련 `.lua` 파일

주의:

- `WTF` 폴더에는 캐릭터명, 서버명, 길드명, 메모 등 개인 정보가 섞일 수 있습니다.
- 공개 저장소에 그대로 올리지 말고 필요한 파일만 로컬 분석용으로 사용합니다.

## 다음 Codex에게 권장 작업 순서

1. 공유 페이지 UX 점검
   - `/docs` 배포 상태 확인
   - README가 아니라 `docs/index.html`이 뜨는지 확인
   - `TXT` 다운로드 버튼은 제거되어 있고 `복사`/`미리보기`만 남아야 함
2. 실제 프로필 문자열 채우기
   - `docs/profiles/**/*.txt`의 placeholder를 실제 문자열로 교체
   - private admin 도구를 쓰는 것이 권장됨
3. import 정책 개선 검토
   - 같은 `id`가 들어올 때 현재는 기존 항목을 덮어씀
   - 추천 정책: 같은 `id`면 body만 갱신하고 group/name/tags/order/instructions는 기존 관리값 유지
4. Profile Exporter 애드온과 연동
   - `EZH0/Profile_Exporter`에서 생성한 `WOW_PROFILE_VAULT` bundle을 private admin 도구에 붙여넣기
5. 애드온별 자동 export 어댑터 추가
   - ElvUI
   - WindTools
   - DBM
   - Plater
   - Cell
   - EditMode

## 현재 남은 질문

- GitHub 저장소 이름을 무엇으로 할지 정해야 합니다.
- 개인 사이트(`username.github.io`)인지 프로젝트 사이트인지 정해야 합니다.
- 관리 페이지를 공개 URL에 둘지, 별도 숨긴 경로로 둘지 정해야 합니다.
- admin 사이트에서 여러 파일을 한 커밋으로 저장할지, 파일별 커밋을 허용할지 결정해야 합니다.
