#!/usr/bin/env python3
"""
doc/최종_text_추출_통합.md를 파싱하여 clauses.json 생성

출력:
  - client/public/data/clauses.json  (GitHub Pages 정적 모드)
  - server/data/clauses.json         (Express API 모드)

블록 형식:
  ### [ISO45001] [9.1] [제목]
  #### 요구사항 표준
  #### 조직담당자 중점사항
  #### 인증심사원 중점사항
  #### 결함사례
  #### 출처
"""

import re
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC  = ROOT / "doc" / "최종_text_추출_통합.md"
DEST_CLIENT = ROOT / "client" / "public" / "data" / "clauses.json"
DEST_SERVER = ROOT / "server" / "data" / "clauses.json"

# 헤더 패턴: ### [ISO45001] [9.1] [제목]
RE_BLOCK = re.compile(
    r"^###\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]",
    re.MULTILINE,
)
RE_SECTION = re.compile(r"^####\s+(.+)", re.MULTILINE)

SECTION_MAP = {
    "요구사항 표준":        "iso_requirement_text",
    "조직담당자 중점사항":   "org_focus_points",
    "인증심사원 중점사항":   "auditor_focus_points",
    "결함사례":             "defect_cases",
    "출처":                "_source_raw",
}

def parse_source(raw: str) -> tuple[str, str]:
    """출처 섹션에서 표준/안내서 페이지 정보 추출."""
    std = guide = ""
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        # 예: "- 표준: KS Q ISO 45001:2018, p.19" / "- 안내서: ISO 45001 안내서, p.53"
        m = re.match(r"[-•*]?\s*표준\s*[:：]\s*(.+)", line)
        if m:
            std = m.group(1).strip()
            continue
        m = re.match(r"[-•*]?\s*안내서\s*[:：]\s*(.+)", line)
        if m:
            guide = m.group(1).strip()
    return std, guide

def parse_md(text: str) -> list[dict]:
    clauses = []
    # 블록 헤더 위치를 모두 찾기
    matches = list(RE_BLOCK.finditer(text))
    for i, m in enumerate(matches):
        framework   = m.group(1).strip()
        clause_id   = m.group(2).strip()
        clause_title= m.group(3).strip()

        # 블록 본문: 이 헤더 끝 ~ 다음 헤더 시작
        block_start = m.end()
        block_end   = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block_body  = text[block_start:block_end]

        # 섹션 분리
        sections: dict[str, str] = {}
        sec_matches = list(RE_SECTION.finditer(block_body))
        for j, sm in enumerate(sec_matches):
            sec_name = sm.group(1).strip()
            sec_start = sm.end()
            sec_end   = sec_matches[j + 1].start() if j + 1 < len(sec_matches) else len(block_body)
            sections[sec_name] = block_body[sec_start:sec_end].strip()

        # 출처 파싱
        source_raw = sections.pop("_source_raw", sections.pop("출처", ""))
        std_src, guide_src = parse_source(source_raw)

        clause: dict = {
            "framework":            framework,
            "clause_id":            clause_id,
            "clause_title":         clause_title,
            "iso_requirement_text": sections.get("요구사항 표준", ""),
            "org_focus_points":     sections.get("조직담당자 중점사항", ""),
            "auditor_focus_points": sections.get("인증심사원 중점사항", ""),
            "defect_cases":         sections.get("결함사례", ""),
            "source_standard":      std_src,
            "source_guide":         guide_src,
        }
        clauses.append(clause)

    return clauses

def main():
    if not SRC.exists():
        print(f"[오류] 원본 파일 없음: {SRC}", file=sys.stderr)
        sys.exit(1)

    print(f"파싱 중: {SRC}")
    text = SRC.read_text(encoding="utf-8")
    clauses = parse_md(text)
    print(f"  조항 {len(clauses)}개 파싱 완료")

    payload = {"clauses": clauses}
    out_json = json.dumps(payload, ensure_ascii=False, indent=2)

    for dest in [DEST_CLIENT, DEST_SERVER]:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out_json, encoding="utf-8")
        print(f"  저장: {dest}")

    print("완료.")

if __name__ == "__main__":
    main()
