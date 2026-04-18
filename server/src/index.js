import express from "express";
import cors from "cors";
import { readDatabase } from "./db.js";

const app = express();
const PORT = process.env.PORT || 4200;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", at: new Date().toISOString() });
});

// GET /api/frameworks — available framework list
app.get("/api/frameworks", async (_req, res) => {
  const db = await readDatabase();
  const frameworks = [...new Set(db.clauses.map((c) => c.framework))].sort();
  res.json({ frameworks });
});

// GET /api/clauses?framework=ISO45001&clauseId=9.1
app.get("/api/clauses", async (req, res) => {
  const db = await readDatabase();
  let result = db.clauses;

  const { framework, clauseId, keyword, q } = req.query;

  if (framework) {
    result = result.filter((c) => c.framework === framework);
  }

  if (clauseId) {
    result = result.filter((c) => c.clause_id === clauseId);
  }

  const searchTerm = keyword || q;
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    result = result.filter(
      (c) =>
        c.clause_title?.toLowerCase().includes(lower) ||
        c.iso_requirement_text?.toLowerCase().includes(lower) ||
        c.org_focus_points?.toLowerCase().includes(lower) ||
        c.auditor_focus_points?.toLowerCase().includes(lower) ||
        c.defect_cases?.toLowerCase().includes(lower) ||
        c.keywords?.toLowerCase().includes(lower)
    );
  }

  res.json({ total: result.length, clauses: result });
});

// GET /api/clauses/:framework/:clauseId — single clause
app.get("/api/clauses/:framework/:clauseId", async (req, res) => {
  const db = await readDatabase();
  const { framework, clauseId } = req.params;

  const clause = db.clauses.find(
    (c) =>
      c.framework === decodeURIComponent(framework) &&
      c.clause_id === decodeURIComponent(clauseId)
  );

  if (!clause) {
    return res.status(404).json({ error: "Clause not found" });
  }

  res.json(clause);
});

app.listen(PORT, () => {
  console.log(`ISO Portal API running on http://localhost:${PORT}`);
});
