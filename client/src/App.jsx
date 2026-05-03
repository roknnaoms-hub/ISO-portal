import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";

// ── API 설정 ──────────────────────────────────────────────────────────────────
const USE_STATIC_DATA =
  import.meta.env.VITE_STATIC_DATA === "true" ||
  (typeof window !== "undefined" &&
    window.location.hostname.endsWith("github.io"));

const api = axios.create({
  baseURL: USE_STATIC_DATA ? "" : (import.meta.env.VITE_API_BASE_URL || "http://localhost:4200"),
});

async function loadStaticData() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/clauses.json`);
  if (!res.ok) throw new Error(`정적 데이터 로드 실패(${res.status})`);
  return res.json();
}

// ── 상수 ─────────────────────────────────────────────────────────────────────
const FRAMEWORKS = ["ISO9001", "ISO14001", "ISO42001", "ISO45001"];

const FRAMEWORK_LABELS = {
  ISO9001: "ISO 9001:2015 품질경영",
  ISO14001: "ISO 14001:2026 환경경영",
  ISO42001: "ISO 42001:2023 AI경영",
  ISO45001: "ISO 45001:2018 안전보건경영",
};

const CONTENT_TABS = [
  { key: "requirement", label: "요구사항 표준" },
  { key: "org", label: "조직담당자 중점사항" },
  { key: "auditor", label: "인증심사원 중점사항" },
  { key: "defect", label: "결함사례" },
];

const KCLI_COVERAGE = [
  { title: "생성형 AI", icon: "AI" },
  { title: "사이버리터러시 교육", icon: "EDU" },
  { title: "사이버보안·개인정보보호", icon: "SEC" },
  { title: "디지털 시민성", icon: "CIV" },
  { title: "AI·디지털 정책", icon: "POL" },
  { title: "연구동향·칼럼·인터뷰", icon: "R&D" },
];

const KCLI_ARTICLES = [
  {
    category: "창간기획",
    title: "AI 시대, 사이버리터러시는 왜 핵심 시민역량인가",
    summary:
      "디지털 전환이 가속화되는 시대, 시민 모두에게 요구되는 사이버리터러시의 의미와 필요성을 조명합니다.",
  },
  {
    category: "교육",
    title: "학교와 공공기관을 위한 AI 리터러시 교육의 방향",
    summary:
      "효과적인 교육 설계와 실천 전략을 통해 조직과 개인의 디지털 역량을 높이는 방법을 제안합니다.",
  },
  {
    category: "사이버안전",
    title: "딥페이크와 피싱 위협에 대응하는 생활 보안수칙",
    summary:
      "일상 속에서 지켜야 할 보안수칙과 최신 위협 사례를 통해 안전한 디지털 생활을 돕습니다.",
  },
];

const KCLI_NAV = ["매체소개", "보도분야", "주요기사", "운영원칙", "제보·문의"];
const KCLI_HERO_IMAGE = `${import.meta.env.BASE_URL}images/kcli-hero-banner.png`;

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function clauseDepth(id) {
  return (id.match(/\./g) || []).length;
}

function buildClauseTree(clauses) {
  // 조항번호 순 정렬
  const sorted = [...clauses].sort((a, b) =>
    a.clause_id.localeCompare(b.clause_id, undefined, { numeric: true })
  );
  return sorted;
}

function highlight(text, keyword) {
  if (!keyword || !text) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i}>{p}</mark>
    ) : (
      p
    )
  );
}

// ── 하위 컴포넌트 ─────────────────────────────────────────────────────────────

function FrameworkSelector({ selected, onChange }) {
  return (
    <nav className="framework-nav" aria-label="표준 선택">
      {FRAMEWORKS.map((fw) => (
        <button
          key={fw}
          className={`fw-btn${selected === fw ? " active" : ""}`}
          onClick={() => onChange(fw)}
        >
          <span className="fw-code">{fw.replace("ISO", "ISO ")}</span>
          <span className="fw-desc">{FRAMEWORK_LABELS[fw]?.split(" ").slice(2).join(" ")}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionModeNav({ mode, onChange }) {
  return (
    <nav className="mode-nav" aria-label="콘텐츠 선택">
      <button
        className={`mode-btn${mode === "iso" ? " active" : ""}`}
        onClick={() => onChange("iso")}
      >
        ISO 포털
      </button>
      <button
        className={`mode-btn${mode === "kcli" ? " active" : ""}`}
        onClick={() => onChange("kcli")}
      >
        KCLI 저널
      </button>
    </nav>
  );
}

function ClauseTree({ clauses, selectedId, onSelect, searchKeyword }) {
  return (
    <ul className="clause-tree" role="tree">
      {clauses.map((c) => {
        const depth = clauseDepth(c.clause_id);
        const isSelected = c.clause_id === selectedId;
        return (
          <li
            key={c.clause_id}
            role="treeitem"
            aria-selected={isSelected}
            className={`clause-item depth-${depth}${isSelected ? " selected" : ""}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => onSelect(c)}
          >
            <span className="clause-id">{c.clause_id}</span>
            <span className="clause-title">
              {highlight(c.clause_title, searchKeyword)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ContentBlock({ clause, activeTab, onTabChange, searchKeyword }) {
  if (!clause) {
    return (
      <div className="content-empty">
        <p>왼쪽 조항 목록에서 항목을 선택하면 상세내용이 표시됩니다.</p>
      </div>
    );
  }

  const contentMap = {
    requirement: clause.iso_requirement_text,
    org: clause.org_focus_points,
    auditor: clause.auditor_focus_points,
    defect: clause.defect_cases,
  };

  const rawText = contentMap[activeTab] || "";
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="content-block">
      <header className="content-header">
        <h2>
          <span className="clause-id-badge">{clause.framework} {clause.clause_id}</span>
          {clause.clause_title}
        </h2>
        <div className="source-meta">
          {clause.source_standard && (
            <span title="표준 출처">📄 {clause.source_standard}</span>
          )}
          {clause.source_guide && (
            <span title="안내서 출처">📚 {clause.source_guide}</span>
          )}
        </div>
      </header>

      <div className="tab-bar" role="tablist">
        {CONTENT_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`tab-btn${activeTab === tab.key ? " active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content" role="tabpanel">
        {lines.length === 0 ? (
          <p className="empty-content">(내용 없음)</p>
        ) : (
          <ul className="content-list">
            {lines.map((line, i) => {
              const clean = line.replace(/^[-•*]\s*/, "");
              return (
                <li key={i}>{highlight(clean, searchKeyword)}</li>
              );
            })}
          </ul>
        )}
      </div>

      {clause.related_clauses && (
        <footer className="related-clauses">
          <strong>연계 조항:</strong> {clause.related_clauses}
        </footer>
      )}
    </div>
  );
}

function SearchBar({ value, onChange, onClear }) {
  return (
    <div className="search-bar">
      <input
        type="search"
        className="search-input"
        placeholder="조항·키워드·내용 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="전체 검색"
      />
      {value && (
        <button className="search-clear" onClick={onClear} aria-label="검색 초기화">
          ✕
        </button>
      )}
    </div>
  );
}

function KcliJournalHome() {
  return (
    <main className="kcli-page">
      <header className="kcli-site-header">
        <div className="kcli-logo">
          <strong>KCLI</strong>
          <span>
            한국사이버리터러시저널
            <small>Korea Cyber Literacy Journal</small>
          </span>
        </div>
        <nav className="kcli-site-nav" aria-label="한국사이버리터러시저널 메뉴">
          {KCLI_NAV.map((item) => (
            <a key={item} href={`#${item.replace(/[·\s]/g, "-")}`}>
              {item}
            </a>
          ))}
        </nav>
        <button className="kcli-search-btn" type="button" aria-label="검색">
          <span />
        </button>
      </header>

      <section
        className="kcli-hero"
        style={{ "--kcli-hero-image": `url("${KCLI_HERO_IMAGE}")` }}
      >
        <div className="kcli-hero-copy">
          <h2>디지털 시대의 시민역량과 사이버안전을 연결하는 전문 저널</h2>
          <p>
            사이버리터러시, 인공지능 리터러시, 디지털 시민역량, 사이버안전 및
            정보윤리에 대한 정확한 정보와 심층 분석을 제공합니다.
          </p>
          <div className="kcli-actions">
            <a className="kcli-primary-link" href="#주요기사">최신 기사 보기</a>
            <a className="kcli-secondary-link" href="#제보-문의">제보·문의</a>
          </div>
        </div>
        <aside className="kcli-mission">
          <h3>창간 목적</h3>
          <ul>
            <li>사이버리터러시 교육 정보 제공</li>
            <li>AI 활용과 윤리 분석</li>
            <li>디지털 시민성·허위정보 대응</li>
            <li>정책·연구동향·전문가 칼럼 확산</li>
          </ul>
        </aside>
      </section>

      <section className="kcli-section kcli-intro" id="매체소개">
        <h3>매체소개</h3>
        <p>
          한국사이버리터러시저널은 사이버리터러시, 인공지능 리터러시, 디지털
          시민성, 사이버안전, 정보윤리 등 디지털 시대의 핵심 이슈를 깊이 있게
          다루는 전문 인터넷 신문입니다. 정확한 정보 제공과 공론의 장을 통해
          안전하고 성숙한 디지털 사회를 만들어갑니다.
        </p>
      </section>

      <section className="kcli-section" id="보도분야">
        <h3>주요 보도분야</h3>
        <div className="kcli-coverage-grid">
          {KCLI_COVERAGE.map((item) => (
            <article className="kcli-coverage-card" key={item.title}>
              <span>{item.icon}</span>
              <strong>{item.title}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="kcli-section" id="주요기사">
        <div className="kcli-section-head">
          <h3>주요기사</h3>
          <a href="#주요기사">더보기</a>
        </div>
        <div className="kcli-article-grid">
          {KCLI_ARTICLES.map((article) => (
            <article className="kcli-article-card" key={article.title}>
              <div className="kcli-article-image" aria-hidden="true" />
              <span>{article.category}</span>
              <h4>{article.title}</h4>
              <p>{article.summary}</p>
              <time>2026.05.03</time>
            </article>
          ))}
        </div>
      </section>

      <section className="kcli-bottom-grid">
        <article className="kcli-panel" id="운영원칙">
          <h3>운영원칙</h3>
          <ul>
            <li>정확하고 공정한 보도를 위해 사실 확인을 최우선으로 합니다.</li>
            <li>광고와 기사는 명확히 구분하여 독자의 판단을 존중합니다.</li>
            <li>오류 보도에 대해서는 정정보도와 반론 보도 요청을 수용합니다.</li>
            <li>독자의 개인정보를 보호하며, 관련 법령을 준수합니다.</li>
            <li>AI 생성 콘텐츠는 책임 있는 이용과 투명한 출처 표기를 원칙으로 합니다.</li>
          </ul>
        </article>
        <article className="kcli-panel" id="제보-문의">
          <h3>제보·문의</h3>
          <dl className="kcli-contact">
            <div>
              <dt>제호</dt>
              <dd>한국사이버리터러시저널</dd>
            </div>
            <div>
              <dt>홈페이지</dt>
              <dd>http://www.kcli.ai.kr</dd>
            </div>
            <div>
              <dt>발행소</dt>
              <dd>서울특별시 금천구 디지털로 178 가산 퍼블릭 A동 1031호</dd>
            </div>
            <div>
              <dt>발행인</dt>
              <dd>오명섭</dd>
            </div>
            <div>
              <dt>편집인</dt>
              <dd>오명섭</dd>
            </div>
            <div>
              <dt>등록정보</dt>
              <dd>등록번호: 등록 후 기재 · 등록일: 등록 후 기재</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}

// ── 메인 앱 ───────────────────────────────────────────────────────────────────
export default function App() {
  const [allClauses, setAllClauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionMode, setSectionMode] = useState("iso");

  const [selectedFramework, setSelectedFramework] = useState(FRAMEWORKS[0]);
  const [selectedClause, setSelectedClause] = useState(null);
  const [activeTab, setActiveTab] = useState("requirement");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 초기 데이터 로드
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let data;
        if (USE_STATIC_DATA) {
          data = await loadStaticData();
        } else {
          const res = await api.get("/api/clauses");
          data = res.data;
        }
        setAllClauses(data.clauses || []);
      } catch (e) {
        setError(`데이터 로드 실패: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 표준 변경 시 첫 조항 선택 초기화
  useEffect(() => {
    setSelectedClause(null);
    setActiveTab("requirement");
  }, [selectedFramework]);

  // 현재 표준 + 검색 필터링된 조항 목록
  const filteredClauses = useMemo(() => {
    let list = allClauses.filter((c) => c.framework === selectedFramework);
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(
        (c) =>
          c.clause_id?.toLowerCase().includes(kw) ||
          c.clause_title?.toLowerCase().includes(kw) ||
          c.iso_requirement_text?.toLowerCase().includes(kw) ||
          c.org_focus_points?.toLowerCase().includes(kw) ||
          c.auditor_focus_points?.toLowerCase().includes(kw) ||
          c.defect_cases?.toLowerCase().includes(kw) ||
          c.keywords?.toLowerCase().includes(kw)
      );
    }
    return buildClauseTree(list);
  }, [allClauses, selectedFramework, searchKeyword]);

  useEffect(() => {
    if (filteredClauses.length === 0) {
      setSelectedClause(null);
      return;
    }

    const currentStillVisible = filteredClauses.some(
      (clause) => clause.clause_id === selectedClause?.clause_id
    );

    if (!currentStillVisible) {
      setSelectedClause(filteredClauses[0]);
      setActiveTab("requirement");
    }
  }, [filteredClauses, selectedClause?.clause_id]);

  const handleClauseSelect = useCallback((clause) => {
    setSelectedClause(clause);
    setActiveTab("requirement");
  }, []);

  const handleFrameworkChange = useCallback((fw) => {
    setSelectedFramework(fw);
    setSearchKeyword("");
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>ISO 포탈 데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── 헤더 ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-icon">🏅</span>
            <div>
              <h1 className="brand-title">ISO 인증 포탈</h1>
              <p className="brand-sub">요구사항 · 중점사항 · 결함사례 · KCLI 저널</p>
            </div>
          </div>
          {sectionMode === "iso" && (
            <SearchBar
              value={searchKeyword}
              onChange={setSearchKeyword}
              onClear={() => setSearchKeyword("")}
            />
          )}
        </div>
        <SectionModeNav mode={sectionMode} onChange={setSectionMode} />
        {sectionMode === "iso" && (
          <FrameworkSelector
            selected={selectedFramework}
            onChange={handleFrameworkChange}
          />
        )}
      </header>

      {sectionMode === "kcli" ? (
        <KcliJournalHome />
      ) : (
        <main className="app-main">
          <aside className="sidebar">
            <div className="sidebar-header">
              <span className="fw-label">{FRAMEWORK_LABELS[selectedFramework]}</span>
              <span className="clause-count">{filteredClauses.length}개 조항</span>
            </div>
            {error && <p className="error-msg">{error}</p>}
            {filteredClauses.length === 0 ? (
              <p className="empty-list">
                {searchKeyword ? "검색 결과 없음" : "조항이 없습니다"}
              </p>
            ) : (
              <ClauseTree
                clauses={filteredClauses}
                selectedId={selectedClause?.clause_id}
                onSelect={handleClauseSelect}
                searchKeyword={searchKeyword}
              />
            )}
          </aside>

          <section className="content-area">
            <ContentBlock
              clause={selectedClause}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              searchKeyword={searchKeyword}
            />
          </section>
        </main>
      )}

      <footer className="app-footer">
        <p>ISO 인증 포탈 · 한국사이버리터러시저널 · 데이터 출처: KS Q ISO 표준 원문 및 인증심사원 안내서</p>
      </footer>
    </div>
  );
}
