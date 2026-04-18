# ISO 인증 포탈

ISO 9001 / 14001 / 42001 / 45001 표준 조항별 요구사항, 조직담당자 중점사항, 인증심사원 중점사항, 결함사례를 통합 제공하는 웹 포탈입니다.

## 기술 스택

- **Client**: Vite 5 + React 18, port 5173
- **Server**: Express 4, port 4200
- **배포**: GitHub Pages (정적 모드)

---

## 빠른 시작

### 1. 의존성 설치

```bash
cd client && npm install
cd ../server && npm install
```

### 2. 환경변수 설정

```bash
cp client/.env.example client/.env
```

### 3. 데이터 생성

```bash
# .venv 활성화 후 실행
python scripts/parse_clauses.py
```

`client/public/data/clauses.json`과 `server/data/clauses.json`이 생성됩니다.

### 4. 개발 서버 실행

터미널 1 (API 서버):
```bash
cd server && npm run dev
```

터미널 2 (클라이언트):
```bash
cd client && npm run dev
```

브라우저에서 http://localhost:5173 접속

---

## 빌드 & 배포

```bash
cd client && npm run build
```

`client/dist/`에 정적 파일이 생성됩니다.

GitHub Pages는 `main` 브랜치 푸시 시 자동 배포됩니다 (`.github/workflows/deploy-pages.yml`).

---

## 프로젝트 구조

```
ISO-portal/
├── client/               # Vite + React 클라이언트
│   ├── public/data/      # GitHub Pages용 정적 JSON
│   └── src/
│       ├── App.jsx       # 메인 UI
│       ├── main.jsx      # 진입점
│       └── styles.css    # 스타일
├── server/               # Express API 서버
│   ├── data/             # clauses.json (로컬/서버 모드)
│   └── src/
│       ├── index.js      # API 라우터
│       └── db.js         # 데이터 읽기
├── doc/                  # ISO 표준 PDF 및 원본 데이터
├── scripts/
│   └── parse_clauses.py  # MD → JSON 변환 스크립트
└── .github/workflows/    # GitHub Pages 배포
```

---

## 데이터 스키마 (`clauses.json`)

| 필드 | 설명 |
|------|------|
| `framework` | ISO9001 / ISO14001 / ISO42001 / ISO45001 |
| `clause_id` | 조항 번호 (예: 9.1, 9.1.1) |
| `clause_title` | 조항 제목 |
| `iso_requirement_text` | 표준 요구사항 원문 |
| `org_focus_points` | 조직담당자 중점사항 |
| `auditor_focus_points` | 인증심사원 중점사항 |
| `defect_cases` | 결함사례 |
| `source_standard` | 표준 출처 |
| `source_guide` | 안내서 출처 |
