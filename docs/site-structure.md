# Site Structure From Source Document

Source document reviewed: Google Docs profile plan shared by the user.

## Document Shape

The document is closer to an installable WoW UI package than a plain list of profile strings.

Top-level sections found:

- Title/date: `애드온 세팅`, `26.04.22`
- Required addons:
  - Elv
  - Elv Windtools
  - DBM
  - Plater
  - Sensei Resource Bar
  - Cooldown Manager Centered
  - SharedMedia
- Profile sections:
  - Elv UI
  - Windtools 프로필
  - 재사용대기자 / 센세이바 편집모드 프로필
  - DBM
  - XIV
  - Sensei
  - Plater
  - Cell
- Immediate paste/resources:
  - 애드온폴더
  - 폰트

## Recommended Site Model

The public page should present this as a guided setup flow:

1. Required addon checklist
2. Profile application order
3. Profile cards grouped by addon/category
4. Copy/TXT download/preview actions per profile
5. Backup/resource download buttons

## Recommended Data Model

`data/index.json` should keep metadata and ordering only. Long strings stay in `profiles/**/*.txt`.

```json
{
  "site": {},
  "package": {
    "name": "애드온 세팅",
    "versionDate": "2026-04-22",
    "requiredAddons": [],
    "applyOrder": [],
    "resources": []
  },
  "profiles": []
}
```

Profile records should include:

- `id`: stable slug
- `addon`: display addon name
- `name`: card title
- `group`: grouping section from the document
- `description`: short usage note
- `instructions`: where/how to paste in-game
- `order`: setup order
- `tags`: filter tags
- `format`: import format identifier
- `source`: manual, bundle, file-import, official-export
- `path`: actual txt body path

## Implementation Direction

The current site should be adjusted so the first screen answers:

- what this package is
- what must be installed first
- in what order the profiles should be applied
- where each string goes

Admin can stay form-based for now, but it must preserve unknown package metadata when saving.
