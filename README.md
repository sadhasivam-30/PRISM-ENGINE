# PRISM Engine (local build)

```bash
pip install -r requirements.txt
python server/app.py
# open http://localhost:8000
```
Optional: store secrets in a local user-level file such as `%USERPROFILE%\.prism.env` or set `PRISM_ENV_FILE` to your own path. This keeps keys outside the repo while the server reads them securely on startup. Copy `.env.example` to `.env` only if you want a local fallback; never commit real secrets. `OPENAI_API_KEY` enables LLM explanations (server-side only). Without it the built-in offline PRISM AI Guide answers from the verified SARASH numbers. Set `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in your local secret file to enable live job listings and advertised salary signals; these credentials remain server-side. Adzuna searches are cached for 15 minutes by default, while hiring-growth figures continue to use dated public snapshots.

- SARASH runs in pure numpy (weights converted from your `sarash_model.pt`; `convert_model.py` shows how).
- Applicant login = Applicant ID + date of birth + PIN created at the end of the assessment (hashed with scrypt).
- Market data: `data/market_snapshots.json` (dated public snapshots with freshness labels).
