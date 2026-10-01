# 내 집의 기준

너나위의 2026년 9월 30일 내 집 마련 무료 강의를 바탕으로 만든 읽기·정리 가이드입니다. 예산, 집 선택 기준, 후보 비교, 계약과 입주를 10개 장으로 정리하고 현금흐름 계산기와 준비 노트를 제공합니다.

**[가이드 열기 →](https://soluna-angelito.github.io/seoul-home-guide/)**

아이폰 Safari와 PC 브라우저에서 로그인 없이 열 수 있습니다.

## 기능

- 아이폰·안드로이드·태블릿·PC 화면에 맞는 반응형 구성
- 모바일 목차와 글자 크기 100·115·130·150% 조절
- 좁은 화면의 비교표를 항목별 세로 카드로 표시
- 월 원리금·지출·잔액을 계산하는 현금흐름 계산기
- 오디오 기준 시각과 짧은 녹취 근거를 보여주는 출처 창
- 준비 노트 TXT 및 빈 후보 비교표 CSV 내려받기

HTML, CSS, JavaScript와 사진·글꼴로 이루어진 정적 사이트입니다. 서버, 데이터베이스, 별도 빌드나 API 키가 필요하지 않습니다. 계산기 입력과 노트는 서버로 보내거나 자동 저장하지 않습니다. 글자 크기 설정만 해당 브라우저에 저장합니다.

## 실행

`dist/index.html`을 브라우저에서 열거나, 이 저장소의 폴더에서 다음 명령을 실행합니다.

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

그다음 `http://127.0.0.1:4173/`을 엽니다.

## GitHub Pages 배포

`.github/workflows/pages.yml`이 `dist` 폴더를 배포합니다. Pages의 게시 소스는 **GitHub Actions**입니다.

1. `dist` 안의 HTML·CSS·JavaScript 또는 자산을 수정합니다.
2. `main` 브랜치에 커밋하고 푸시합니다.
3. 저장소의 **Actions → Deploy to GitHub Pages**에서 완료 여부를 확인합니다.

**Run workflow**를 눌러 수동 배포할 수도 있습니다. 문서만 수정한 커밋은 자동 배포를 시작하지 않습니다.

## 검증

WebKit 엔진에서 아이폰 크기 320·375·390·430px, 가로 844×390px, 태블릿 768px을 확인했습니다. Chromium에서는 안드로이드 크기 360·412px과 PC 1024·1440px을 확인했습니다. 150% 읽기 설정, 200% 글자 확대, 메뉴, 펼친 표와 FAQ, 계산기 입력 검증, 출처 창, 노트와 CSV 내려받기를 점검했습니다. 실물 아이폰 검증은 하지 않았습니다.

## 자료와 자산

사용자가 제공한 강의 녹취와 구성 계획을 바탕으로 편집했습니다. 시세·금리·시장 전망과 유료 과정 안내는 강의 당시의 설명입니다. 불명확한 고유명사·면적·가격은 확인 대상으로 남겼습니다. 계산기는 원리금균등상환을 가정하며 세금·거래비용·수리비와 실제 대출 승인 조건은 포함하지 않습니다.

- 사진: SpaceshipMe, 서울 잠원동과 한강, 2023-12-12. [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Seocho-gu_Skyline_from_Han_River_%E2%80%94_Dec_2023.jpg), CC0 1.0.
- 글꼴: [Pretendard 1.3.9](https://github.com/orioncactus/pretendard). 라이선스는 `dist/assets/Pretendard-LICENSE.txt`에 포함되어 있습니다.
