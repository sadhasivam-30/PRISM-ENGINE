"""PRISM Engine local server: stdlib + numpy only.  Run: python server/app.py  ->  http://localhost:8000"""
import json, os, re, sqlite3, secrets, hashlib, hmac, time, datetime as dt, threading, mimetypes
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib import request as ur
from sarash_np import SarashEngine

ROOT = Path(__file__).resolve().parent.parent
for ln in (ROOT / ".env").read_text().splitlines() if (ROOT / ".env").exists() else []:
    if "=" in ln and not ln.lstrip().startswith("#"):
        k, v = ln.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
HTTPS = os.getenv("PRISM_HTTPS", "false") == "true"
DEMO_LLM = os.getenv("PRISM_DEMO_MODE", "false") == "true"
ENG = SarashEngine()
SNAP = json.loads((ROOT / "data" / "market_snapshots.json").read_text())
CONFIG = {"celebration_threshold": 85,
          "bands": [[85, "Excellent Alignment"], [70, "Strong Alignment"], [55, "Moderate Alignment"], [40, "Limited Alignment"], [0, "Low Alignment"]]}
LABEL = {"R": "Realistic", "I": "Investigative", "A": "Artistic", "S": "Social", "E": "Enterprising", "C": "Conventional",
         "analytical": "Logical reasoning", "quantitative": "Mathematics", "creative": "Creative problem solving",
         "communication": "Communication", "spatial": "Spatial thinking"}
PATH = {"AI/ML Engineer": "B.Tech CS/AI -> projects + internships -> ML engineer -> specialise (MLOps/research)",
        "Data Scientist": "B.Tech/B.Sc Stats or CS -> analytics internships -> data analyst -> data scientist",
        "Software Engineer": "B.Tech CS/IT -> internships -> junior developer -> senior/lead",
        "Cybersecurity Analyst": "B.Tech CS/IT -> security certs -> SOC analyst -> security engineer",
        "Cloud/DevOps Engineer": "B.Tech CS/IT -> cloud certification -> DevOps engineer -> platform/SRE",
        "Mechanical Engineer": "B.E. Mechanical -> core internships -> design/production engineer -> specialist",
        "Aeronautical Engineer": "B.E. Aeronautical -> aerospace internships -> design/test engineer -> specialist",
        "Commercial Pilot": "12th PCM -> DGCA medical -> flying school (CPL) -> airline first officer",
        "Defense Entry": "12th -> NDA/CDS entrance -> training academy -> commissioned officer",
        "UX/Product Designer": "B.Des/any degree -> portfolio -> junior designer -> product designer"}
DB = sqlite3.connect(ROOT / "data" / "prism.db", check_same_thread=False); DB.row_factory = sqlite3.Row
DB.execute("CREATE TABLE IF NOT EXISTS applicants(id TEXT PRIMARY KEY, name TEXT, dob_salt TEXT, dob_hash TEXT, pin_salt TEXT, pin_hash TEXT, data TEXT, created TEXT)")
DB.execute("CREATE TABLE IF NOT EXISTS audit(ts TEXT, event TEXT, ref TEXT)"); DB.commit()
LOCK = threading.Lock(); SESS = {}; HITS = {}

def audit(ev, ref=""):
    with LOCK: DB.execute("INSERT INTO audit VALUES(?,?,?)", (dt.datetime.utcnow().isoformat(), ev, ref)); DB.commit()
def kdf(secret, salt): return hashlib.scrypt(secret.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex()
def limited(key, n, win):
    now = time.time(); q = [t for t in HITS.get(key, []) if now - t < win]; q.append(now); HITS[key] = q; return len(q) > n

def market_for(career, loc):
    c = ENG.closest_career(career); d, g, s, r, geo, conf = ENG.market_seed[c]
    sig = {"demand": d, "growth_yoy": g, "salary_index": s, "resilience": r, "geo_demand": geo, "confidence": conf}
    srcs = [{"source": "SARASH market seed", "type": "Prototype baseline", "as_of": "n/a", "note": "Built-in baseline used to seed the model."}]
    gv, cf = [g], [0.45]; today = dt.date.today()
    for key, kind, w in (("naukri", "Observed", .82), ("foundit", "Forecast", .78)):
        blk = SNAP.get(key, {}); sg = blk.get("signals", {}).get(c)
        if not sg: continue
        if "growth_yoy" in sg: gv.append(float(sg["growth_yoy"])); cf.append(w)
        if "qualitative_strength" in sg: sig["demand"] = .8 * sig["demand"] + .2 * 100 * sg["qualitative_strength"]
        age = (today - dt.date.fromisoformat(blk["as_of"])).days
        srcs.append({"source": blk["source_name"], "type": kind, "as_of": blk["as_of"], "note": sg["note"], "url": blk.get("source_url"),
                     "freshness": "Fresh" if age <= 30 else "Aging" if age <= 120 else "Stale", "age_days": age})
    city = SNAP.get("naukri", {}).get("city_signals", {}).get(loc)
    if city: sig["geo_demand"] = max(0, min(100, sig["geo_demand"] + city["overall_growth_yoy"] * .5))
    sig["growth_yoy"] = sum(v * w for v, w in zip(gv, cf)) / sum(cf); sig["confidence"] = min(.98, max(conf, sum(cf) / len(cf)))
    return sig, srcs

def analyse(rec):
    out = []
    for ch in rec["choices"]:
        sig, srcs = market_for(ch["career"], rec["location"])
        p = ENG.predict(rec["student"], rec["parent"], ch, sig); cv = ENG.career_profiles[p["career"]]
        diff = {d: rec["student"][d] / 100 - cv[i] for i, d in enumerate(ENG.dims)}
        p["strengths"] = [LABEL[d] for d in sorted(ENG.dims, key=lambda d: -min(rec["student"][d] / 100, cv[ENG.dims.index(d)]))[:2]]
        p["gaps"] = [LABEL[d] for d, v in sorted(diff.items(), key=lambda x: x[1])[:2] if v < -0.08]
        p["pathway"] = PATH.get(p["career"], ""); p["market_sources"] = srcs; p["market"] = {k: round(v, 1) for k, v in sig.items()}
        out.append(p)
    return sorted(out, key=lambda x: -x["sarash_score"])

def num(v, lo, hi, name):
    try: v = float(v)
    except Exception: raise ValueError(name)
    if not lo <= v <= hi: raise ValueError(name)
    return v
def validate(b):
    name = str(b.get("name", "")).strip()
    if not 1 <= len(name) <= 60 or not re.fullmatch(r"[\w .'-]+", name): raise ValueError("name")
    dob = str(b.get("dob", ""))
    try: dt.datetime.strptime(dob, "%d%m%Y")
    except Exception: raise ValueError("dob")
    pin = str(b.get("pin", ""))
    if not re.fullmatch(r"\d{4,8}", pin): raise ValueError("pin")
    st = {d: num(b["student"][d], 0, 100, d) for d in ENG.dims}
    pa = b["parent"]; par = {"budget_lakh": num(pa["budget_lakh"], 0, 500, "budget")}
    for k in ("loan_willingness", "risk_tolerance", "location_flexibility", "duration_tolerance"): par[k] = num(pa[k], 0, 100, k)
    ch = []
    for i, c in enumerate(b["choices"][:3]):
        if c["career"] not in ENG.career_profiles: raise ValueError("career")
        ch.append({"career": c["career"], "rank": i + 1, "preference": num(c.get("preference", 80), 0, 100, "pref")})
    if len({c["career"] for c in ch}) != 3: raise ValueError("choices")
    loc = str(b.get("location", "Chennai"))[:40]
    if not re.fullmatch(r"[A-Za-z .]+", loc): raise ValueError("location")
    return name, dob, pin, {"student": st, "parent": par, "choices": ch, "location": loc}

SYSTEM = ("You are PRISM AI Guide. Explain only the verified SARASH numbers supplied; never invent or change a score. Use simple language, "
          "distinguish student fit, family feasibility and market data, never say a career is guaranteed or perfect, state data freshness. Direct answer first, then short bullets.")
def ctx_text(res):
    L = [f"Student: {res['name']}, location {res['location']}, parent budget {res['parent']['budget_lakh']} lakh."]
    for p in res["predictions"]:
        L.append(f"{p['career']}: SARASH {p['sarash_score']}, match {p['match_score']}, feasibility {p['parent_feasibility']}, conflict {p['conflict_index']}, market {p['market_score']}, cost ~{p['course_cost_lakh']} lakh. Strengths {p['strengths']}; gaps {p['gaps']}. Sources: " +
                 "; ".join(f"{s['source']} ({s['type']}, {s['as_of']}): {s['note']}" for s in p["market_sources"]))
    return "\n".join(L)

def offline_guide(msg, res):
    m = msg.lower()
    if not res:
        if any(w in m for w in ("sarash", "score", "work", "prism")):
            return "PRISM combines **student fit**, **family feasibility** and **market opportunity**. SARASH (a small neural network) calculates the numbers; I only explain them. Note: the prototype was trained on synthetic labels, so treat results as decision support, not prediction.\n\nComplete the assessment to get personalised answers."
        return "I can explain how PRISM works in general. **Complete your assessment** and I'll explain your own SARASH scores, family feasibility and market signals."
    P = res["predictions"]; top = P[0]; f = lambda p: f"**{p['career']}**: SARASH {p['sarash_score']}/100 (fit {p['match_score']}, family feasibility {p['parent_feasibility']}, market {p['market_score']})"
    named = next((p for p in P if p["career"].lower().split("/")[0].split()[0] in m), None) or top
    src = lambda p: "\n".join(f"- {s['source']} ({s['type']}, as of {s['as_of']}{', ' + s['freshness'] if s.get('freshness') else ''}): {s['note']}" for s in p["market_sources"])
    if any(w in m for w in ("conflict", "budget", "cost", "afford", "loan", "parent")):
        p = named; ratio = p["course_cost_lakh"] / max(res["parent"]["budget_lakh"], .25)
        return (f"For {p['career']} the estimated study cost is about **{p['course_cost_lakh']} lakh** against a family budget of **{res['parent']['budget_lakh']} lakh** (ratio {ratio:.1f}x). "
                f"SARASH gives a Conflict Index of **{p['conflict_index']}/100**, so current family feasibility is **{p['parent_feasibility']}/100**.\n- Loan willingness: {res['parent']['loan_willingness']}/100\n- "
                + ("This looks manageable on current inputs." if p["conflict_index"] < 30 else "Consider scholarships, a lower-cost college or a related alternative.") + "\n- Costs vary by institution.")
    if any(w in m for w in ("market", "job", "salary", "demand", "hiring", "growth")):
        p = named; return f"Current market indicators for **{p['career']}** (Market score {p['market_score']}/100):\n{src(p)}\n\nSnapshots are periodic reports, not real-time data."
    if "compare" in m or " vs " in m: return "Your options side by side:\n" + "\n".join("- " + f(p) for p in P)
    if any(w in m for w in ("improve", "gap", "skill", "strength", "next")):
        p = named; return f"For **{p['career']}**:\n- Strengths: {', '.join(p['strengths'])}\n- Develop next: {', '.join(p['gaps']) or 'no major gaps based on your current assessment'}\n- Pathway: {p['pathway']}"
    if m.startswith("why") or "recommend" in m or "explain" in m:
        p = named; return f"{f(p)}\n\nThis pathway appears compatible with your profile because your strongest matching areas are **{', '.join(p['strengths'])}** (profile similarity {p['cosine_similarity']}%). Based on your current assessment, not a guarantee."
    if any(w in m for w in ("suggest", "major", "best", "top", "career")):
        return f"Based on your current assessment, the strongest overall option is {f(top)}.\n\nRunner-up: {f(P[1])}\n\nThese are recommendations to discuss with your family, not final decisions."
    return "I can explain your top career, your **conflict score**, the **job market**, compare your three options, or suggest what to improve next."

def stream_answer(msg, hist, res):
    txt = None
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if key and not DEMO_LLM and res:
        try:
            body = {"model": os.getenv("OPENAI_MODEL", "gpt-5"), "instructions": SYSTEM, "max_output_tokens": 650,
                    "input": f"VERIFIED CONTEXT\n{ctx_text(res)}\n\nRECENT CHAT\n" + "\n".join(f"{h['role']}: {h['content'][:500]}" for h in hist[-6:]) + f"\n\nUSER\n{msg}"}
            rq = ur.Request("https://api.openai.com/v1/responses", json.dumps(body).encode(), {"Content-Type": "application/json", "Authorization": "Bearer " + key})
            data = json.load(ur.urlopen(rq, timeout=20))
            txt = "".join(c.get("text", "") for o in data.get("output", []) for c in o.get("content", []) if c.get("type") == "output_text")
        except Exception: txt = None
    if not txt: txt = offline_guide(msg, res)
    for w in re.findall(r"\S+\s*", txt): yield w; time.sleep(0.012)

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def hdrs(self):
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        self.send_header("X-Content-Type-Options", "nosniff"); self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)")
        if HTTPS: self.send_header("Strict-Transport-Security", "max-age=31536000")
    def json(self, obj, code=200, cookie=None):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        if cookie: self.send_header("Set-Cookie", cookie)
        self.hdrs(); self.end_headers(); self.wfile.write(b)
    def err(self, code, c, m): self.json({"error": {"code": c, "message": m}}, code)
    def sess(self):
        for part in self.headers.get("Cookie", "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == "prism_sid":
                s = SESS.get(hashlib.sha256(v.encode()).hexdigest())
                if s and s["exp"] > time.time(): return s
        return None
    def start(self, aid):
        tok = secrets.token_urlsafe(32); SESS[hashlib.sha256(tok.encode()).hexdigest()] = {"id": aid, "exp": time.time() + 8 * 3600}
        return f"prism_sid={tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800" + ("; Secure" if HTTPS else "")
    def result(self, aid):
        r = DB.execute("SELECT * FROM applicants WHERE id=?", (aid,)).fetchone()
        if not r: return None
        d = json.loads(r["data"]); return {"id": r["id"], "name": r["name"], "created": r["created"], **d, "predictions": analyse(d), "config": CONFIG,
                                           "calculated_at": dt.datetime.now().isoformat(timespec="seconds")}
    def body(self):
        n = int(self.headers.get("Content-Length", 0))
        if n > 20000: raise ValueError("too large")
        return json.loads(self.rfile.read(n) or b"{}")
    def do_GET(self):
        p = self.path.split("?")[0]
        if p == "/api/health": return self.json({"ok": True, "careers": ENG.supported_careers(), "llm_configured": bool(os.getenv("OPENAI_API_KEY")) and not DEMO_LLM, "config": CONFIG})
        if p == "/api/me":
            s = self.sess()
            return self.json({"result": self.result(s["id"]) if s else None})
        f = ROOT / "web" / ("index.html" if p in ("/", "") else p.lstrip("/"))
        try: f = f.resolve(); f.relative_to(ROOT / "web")
        except Exception: f = ROOT / "web" / "index.html"
        if not f.is_file(): f = ROOT / "web" / "index.html"
        b = f.read_bytes(); self.send_response(200); self.send_header("Content-Type", mimetypes.guess_type(f.name)[0] or "text/html")
        self.send_header("Content-Length", str(len(b))); self.send_header("Cache-Control", "no-cache"); self.hdrs(); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        ip = self.client_address[0]; p = self.path.split("?")[0]
        o = self.headers.get("Origin")
        if self.headers.get("X-PRISM") != "1" or (o and o.split("//")[-1] != self.headers.get("Host")): return self.err(403, "FORBIDDEN", "Request blocked.")
        try: b = self.body()
        except Exception: return self.err(400, "INVALID_INPUT", "Please check your input.")
        try:
            if p == "/api/assess":
                if limited(("a", ip), 20, 3600): return self.err(429, "RATE_LIMIT", "Too many submissions. Please try again later.")
                name, dob, pin, rec = validate(b)
                aid = f"PRISM-{dt.date.today():%y}-" + "".join(secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(6))
                ds, ps = secrets.token_hex(16), secrets.token_hex(16)
                with LOCK: DB.execute("INSERT INTO applicants VALUES(?,?,?,?,?,?,?,?)", (aid, name, ds, kdf(dob, ds), ps, kdf(pin, ps), json.dumps(rec), dt.datetime.now().isoformat(timespec="seconds"))); DB.commit()
                audit("assessment_created", aid); return self.json({"result": self.result(aid)}, cookie=self.start(aid))
            if p == "/api/login":
                aid = str(b.get("id", "")).strip().upper()
                if limited(("l", ip, aid), 5, 600): return self.err(429, "RATE_LIMIT", "Too many attempts. Please wait a few minutes.")
                r = DB.execute("SELECT * FROM applicants WHERE id=?", (aid,)).fetchone()
                ok = r and hmac.compare_digest(kdf(str(b.get("dob", "")), r["dob_salt"]), r["dob_hash"]) and hmac.compare_digest(kdf(str(b.get("pin", "")), r["pin_salt"]), r["pin_hash"])
                audit("login_ok" if ok else "login_failed", aid if ok else "")
                if not ok: return self.err(401, "BAD_LOGIN", "Applicant ID, date of birth or PIN is incorrect.")
                return self.json({"result": self.result(aid)}, cookie=self.start(aid))
            if p == "/api/logout":
                s = self.sess()
                for k in [k for k, v in SESS.items() if v is s]: SESS.pop(k)
                return self.json({"ok": True}, cookie="prism_sid=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict")
            if p == "/api/chat":
                if limited(("c", ip), 40, 600): return self.err(429, "RATE_LIMIT", "You're sending messages quickly. Please wait a moment.")
                msg = str(b.get("message", "")).strip()[:2000]
                if not msg: return self.err(400, "INVALID_INPUT", "Please type a message.")
                hist = [{"role": "user" if h.get("role") == "user" else "assistant", "content": str(h.get("content", ""))[:1000]} for h in b.get("history", [])[-8:]]
                s = self.sess(); res = self.result(s["id"]) if s else None
                self.send_response(200); self.send_header("Content-Type", "text/event-stream"); self.send_header("Cache-Control", "no-store"); self.hdrs(); self.end_headers()
                try:
                    for ch in stream_answer(msg, hist, res): self.wfile.write(b"data: " + json.dumps({"t": ch}).encode() + b"\n\n"); self.wfile.flush()
                    self.wfile.write(b"data: [DONE]\n\n")
                except (BrokenPipeError, ConnectionResetError): pass
                return
        except (KeyError, ValueError, TypeError): return self.err(400, "INVALID_INPUT", "Please check the highlighted fields.")
        except Exception: return self.err(500, "SERVER_ERROR", "Something went wrong. Please try again.")
        self.err(404, "NOT_FOUND", "Not found.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000)); print(f"PRISM running at http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
