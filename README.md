# PRISM Engine

**Live demo:** [Open PRISM-ENGINE](https://prism-engine-isxb.onrender.com)

> ⚠️ **Demo only:** Use fictional information. Do not enter real personal details. Saved demo data may be deleted.

## Run locally

From the project folder, run:

```powershell
pip install -r requirements.txt
python server/app.py
```

Then open [http://localhost:8000](http://localhost:8000).

## Optional integrations and secrets

For local development, you can store secrets in a user-level file such as `%USERPROFILE%\.prism.env`, or set `PRISM_ENV_FILE` to another path. Keep secret files outside the repository and never commit real keys. Copy `.env.example` to `.env` only for local use.

- `OPENAI_API_KEY` enables LLM explanations. Without it, the built-in offline PRISM AI Guide uses the SARASH model outputs.
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` enable live job listings and advertised salary signals.

Adzuna searches are cached for 15 minutes by default. Hiring-growth figures use dated public snapshots.

For the deployed Render service, add any required keys in its **Environment** settings. Render won’t read a secrets file from your computer. See [Render’s environment variable documentation](https://render.com/docs/configure-environment-variables).

## Project notes

- SARASH runs in NumPy using weights converted from `sarash_model.pt`. See `convert_model.py`.
- Applicant login uses an Applicant ID, date of birth, and a PIN created at the end of the assessment. The PIN is hashed with scrypt.
- Market data comes from `data/market_snapshots.json`, which contains dated public snapshots with freshness labels.
