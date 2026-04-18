import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";

// ── API 설정 ──────────────────────────────────────────────────────────────────
const IS_STATIC =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("github.io");

const api = axios.create({
  baseURL: IS_STATIC ? "" : (import.meta.env.VITE_API_BASE_URL || "http://localhost:4200"),
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

// ── 메인 앱 ───────────────────────────────────────────────────────────────────
export default function App() {
  const [allClauses, setAllClauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        if (IS_STATIC) {
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
              <p className="brand-sub">요구사항 · 중점사항 · 결함사례 통합 가이드</p>
            </div>
          </div>
          <SearchBar
            value={searchKeyword}
            onChange={setSearchKeyword}
            onClear={() => setSearchKeyword("")}
          />
        </div>
        <FrameworkSelector
          selected={selectedFramework}
          onChange={handleFrameworkChange}
        />
      </header>

      {/* ── 메인 레이아웃 ── */}
      <main className="app-main">
        {/* 사이드바: 조항 목록 */}
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

        {/* 콘텐츠 영역 */}
        <section className="content-area">
          <ContentBlock
            clause={selectedClause}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchKeyword={searchKeyword}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>ISO 인증 포탈 · 데이터 출처: KS Q ISO 표준 원문 및 인증심사원 안내서</p>
      </footer>
    </div>
  );
}
