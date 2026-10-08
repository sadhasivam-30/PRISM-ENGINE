# PRISM Engine (local build)

```bash
pip install -r requirements.txt
python server/app.py
# open http://localhost:8000
```
Optional: copy `.env.example` to `.env` and set `OPENAI_API_KEY` for LLM explanations (server-side only). Without it the built-in offline PRISM AI Guide answers from the verified SARASH numbers. Set `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in `.env` to enable live job listings and advertised salary signals; these credentials remain server-side. Adzuna searches are cached for 15 minutes by default, while hiring-growth figures continue to use dated public snapshots.

- SARASH runs in pure numpy (weights converted from your `sarash_model.pt`; `convert_model.py` shows how).
- Applicant login = Applicant ID + date of birth + PIN created at the end of the assessment (hashed with scrypt).
- Market data: `data/market_snapshots.json` (dated public snapshots with freshness labels).
