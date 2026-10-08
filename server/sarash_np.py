"""SARASH inference in pure numpy (no torch needed). Weights converted from sarash_model.pt."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

BASE = Path(__file__).resolve().parent.parent / "model"

ALIASES = {
    "ai engineer": "AI/ML Engineer", "machine learning engineer": "AI/ML Engineer", "ml engineer": "AI/ML Engineer",
    "data science": "Data Scientist", "software developer": "Software Engineer", "developer": "Software Engineer",
    "cyber security": "Cybersecurity Analyst", "cybersecurity": "Cybersecurity Analyst",
    "devops": "Cloud/DevOps Engineer", "cloud engineer": "Cloud/DevOps Engineer",
    "mechanical": "Mechanical Engineer", "aeronautical": "Aeronautical Engineer", "pilot": "Commercial Pilot",
    "defence": "Defense Entry", "defense": "Defense Entry", "ux": "UX/Product Designer",
    "ui ux": "UX/Product Designer", "product designer": "UX/Product Designer",
}

def _sigmoid(x): return 1.0 / (1.0 + np.exp(-x))

class SarashEngine:
    def __init__(self):
        meta = json.loads((BASE / "sarash_meta.json").read_text())
        w = np.load(BASE / "sarash_weights.npz")
        self.w = {k: w[k] for k in w.files}
        self.feature_cols = meta["feature_cols"]; self.dims = meta["dims"]
        self.career_profiles = meta["career_profiles"]; self.career_cost_lakh = meta["career_cost_lakh"]
        self.market_seed = meta["market_seed"]

    def supported_careers(self): return list(self.career_profiles)

    def closest_career(self, requested: str) -> str:
        r = requested.strip().lower()
        if r in ALIASES: return ALIASES[r]
        for c in self.career_profiles:
            if r == c.lower() or r in c.lower(): return c
        return "Software Engineer"

    def _forward(self, x):
        w = self.w
        h = np.maximum(x @ w["shared.0.weight"].T + w["shared.0.bias"], 0)
        h = (h - w["shared.2.running_mean"]) / np.sqrt(w["shared.2.running_var"] + 1e-5) * w["shared.2.weight"] + w["shared.2.bias"]
        h = np.maximum(h @ w["shared.4.weight"].T + w["shared.4.bias"], 0)
        z = np.maximum(h @ w["shared.6.weight"].T + w["shared.6.bias"], 0)
        head = lambda n: z @ w[n + ".weight"].T + w[n + ".bias"]
        return (_sigmoid(head("match_head.0")), _sigmoid(head("conflict_head")),
                _sigmoid(head("market_head.0")), _sigmoid(head("final_head.0")))

    def predict(self, student: dict, parent: dict, choice: dict, market: dict) -> dict:
        career = self.closest_career(choice["career"])
        cv = np.array(self.career_profiles[career], float)
        sv = np.array([float(student.get(d, 50)) / 100 for d in self.dims])
        den = np.linalg.norm(sv) * np.linalg.norm(cv)
        cos = float(sv @ cv / den) if den else 0.0
        budget = max(float(parent.get("budget_lakh", 10)), 0.25)
        cost = float(self.career_cost_lakh[career])
        f = {"choice_rank": int(choice.get("rank", 1)), "preference": float(choice.get("preference", 80)) / 100,
             **{f"student_{d}": sv[i] for i, d in enumerate(self.dims)},
             **{f"career_{d}": cv[i] for i, d in enumerate(self.dims)},
             "parent_budget_lakh": budget,
             "loan_willingness": float(parent.get("loan_willingness", 50)) / 100,
             "risk_tolerance": float(parent.get("risk_tolerance", 50)) / 100,
             "location_flexibility": float(parent.get("location_flexibility", 50)) / 100,
             "duration_tolerance": float(parent.get("duration_tolerance", 50)) / 100,
             "course_cost_lakh": cost, "market_demand": float(market["demand"]),
             "market_growth_yoy": float(market["growth_yoy"]), "salary_index": float(market["salary_index"]),
             "market_resilience": float(market["resilience"]), "geo_demand": float(market["geo_demand"]),
             "source_confidence": float(market["confidence"]), "cosine_feature": cos, "cost_budget_ratio": cost / budget}
        row = np.array([[f[c] for c in self.feature_cols]], float)
        x = (row - self.w["scaler_mean"]) / self.w["scaler_scale"]
        m, _, mk, fin = [float(v.item()) for v in self._forward(x)]
        cost_ratio = cost / budget
        no_pressure_ratio, full_pressure_ratio, max_loan_relief = 0.5, 2.0, 0.25
        cost_pressure = float(np.clip((cost_ratio - no_pressure_ratio) / (full_pressure_ratio - no_pressure_ratio), 0.0, 1.0))
        loan_relief = max_loan_relief * float(np.clip(parent.get("loan_willingness", 50), 0, 100)) / 100
        c = cost_pressure * (1 - loan_relief)
        return {"career": career, "rank": int(choice.get("rank", 1)),
                "match_score": round(m * 100, 1), "conflict_index": round(c * 100, 1),
                "parent_feasibility": round((1 - c) * 100, 1), "market_score": round(mk * 100, 1),
                "sarash_score": round(fin * 100, 1), "cosine_similarity": round(cos * 100, 1),
                "course_cost_lakh": cost}
