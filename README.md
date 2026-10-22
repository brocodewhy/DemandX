# DemandX — Demand Intelligence Workspace

DemandX has been rebuilt as a multi-page web application. The UI is a React/Vite frontend, the data and forecasting API is FastAPI, and Google Identity Services provides Google sign-in. It is no longer a Streamlit app.

## Pages

- **Overview** — workspace summary, recent forecasts, dataset snapshot, and demand trend.
- **Data workspace** — upload CSV/XLS/XLSX, inspect columns and missing values, clean rows, and download the saved CSV.
- **Demand insights** — actual daily and monthly totals, average demand by weekday, product/category rankings when those columns exist, and daily-demand distribution.
- **Forecast studio** — select a product/category, demand column, date, and model; generate a one-day demand estimate plus the path to that date.
- **Model lab** — evaluate a model on later historical dates held out from training; view MAE, RMSE, R², and actual-vs-predicted values.
- **Forecast history** — view and remove saved forecast records.
- **Profile settings** — open the header avatar to edit a display name and organization, review the verified Google identity, or sign out.
- **Light and dark themes** — use the sun/moon control in the header (or on sign-in) to switch themes. The selected theme is saved in this browser and restored before the app renders; first-time visitors start in dark mode.
- **Motion and accessibility** — a branded, theme-aware startup splash is shown only while session restoration and the API health check are pending; workspace data uses local skeletons, and prediction requests use inline loading feedback. Sign-in, navigation, dashboard cards, charts, uploads, and prediction feedback use restrained Framer Motion transitions. System reduced-motion preferences are respected.

Authenticated workspace pages are available directly at `/overview`, `/data`, `/insights`, `/forecast`, `/daywise`, `/models`, and `/history`; browser Back/Forward follows page changes. When deploying the Vite build to a static host, configure a single-page-app fallback to `index.html` so direct route requests load the React app.

## Requirements

- Python 3.10 or newer
- Node.js 20 or newer
- A Google account and a Google OAuth **Web application** client ID

## 1. Configure Google sign-in

Google sign-in is implemented, but a real OAuth client ID must be created in your own Google Cloud project. Credentials cannot be created automatically by the code.

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or choose a project.
3. Open **APIs & Services → OAuth consent screen** and configure the app details. While the app is in Testing mode, add the Google accounts that should be allowed to sign in as test users.
4. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**.
5. Choose **Web application**.
6. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
7. Create the client and copy the client ID. A redirect URI is not required for this Google Identity Services popup flow.
8. Copy `frontend/.env.example` to `frontend/.env` and set:

   ```env
   VITE_GOOGLE_CLIENT_ID=your-real-client-id.apps.googleusercontent.com
   VITE_API_URL=http://localhost:8000
   ```

9. Copy `backend/.env.example` to `backend/.env` and set the same client ID:

   ```env
   GOOGLE_CLIENT_ID=your-real-client-id.apps.googleusercontent.com
   CORS_ORIGINS=http://localhost:5173
   DEMANDX_STORAGE=./storage
   ```

The frontend ID and backend ID must match. The backend verifies the Google ID token rather than trusting profile information sent by the browser. The verified Google name, email, and profile picture are read from the token; only the application display name and organization can be edited. Those editable fields are saved in `backend/storage/<account-hash>/profile.json`, alongside the account's dataset and forecast files. Never commit real credentials or service-account files into source control.

## 2. Start the backend

From the project root:

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### macOS / Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API health check is at `http://localhost:8000/api/health`; interactive API documentation is at `http://localhost:8000/docs`.

## 3. Start the frontend

Open a second terminal at the project root:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Use **Sign in with Google** to access the workspace.

## How the forecast works

DemandX removes exact duplicate rows from analysis, coerces invalid/non-numeric demand values out of the analysis, aggregates the selected numeric demand column by day (summing quantities/sales), and optionally filters to one product/category. The cleaning report flags statistical target outliers using an IQR rule but retains them unchanged rather than silently deleting or clipping potentially real demand. The charted history is sorted chronologically and includes calendar days with no records as zero demand. It builds calendar features, previous-day / previous-week / two-week lags, and rolling demand averages. Evaluation uses a chronological rolling one-day holdout and compares the selected model against a previous-week seasonal-naive baseline. Prior observed demand remains available as lag input through the test window, so these scores describe one-day-ahead evaluation and may not represent multi-day recursive forecast accuracy. MAE and RMSE are reported; MAPE is shown only when all holdout actual values are non-zero.

- The selected forecast date must be after the last usable date for that product and within 180 days.
- At least 26 calendar days of history are required to build the lag features and evaluate/fit a forecast; more history is preferable.
- Forecasts are estimates. Promotions, weather, stock-outs, festivals, price changes, and incomplete records can materially affect real demand.
- When there are missing dates inside the observed range, DemandX fills those daily gaps with zero demand. This is appropriate for a complete transaction log but may be misleading if the source data is incomplete. Exact duplicate rows are excluded from analytics and forecasts; the data cleaner also reports and removes them from the saved dataset.
- If the data is transaction-level, choose a numeric quantity/orders field when possible. If each row is one transaction and no numeric demand column exists, aggregate the transactions into daily order counts first; do not treat an arbitrary numeric ID as demand.
- The interface uses English compact number formatting (K/M/B) and a decimal point. Columns explicitly named for order/transaction counts are forecast as whole counts; quantity, weight, revenue, and other generic numeric measures retain decimal estimates as appropriate. Exact un-abbreviated values are retained in detailed records.
- The forecast is a point estimate, not an actual count. Prediction intervals are not calibrated or returned by the current models; uncertainty grows with forecast horizon.

## Data and privacy notes

- Dataset files, editable profile fields, and forecast history are saved under `backend/storage/`, in a folder derived from the verified Google account subject. Each authenticated account sees only its own workspace through the API. The `GET` and `PUT /api/me` profile endpoints require a verified Google bearer token; the browser cannot choose the storage account ID.
- This local profile store is a JSON file and is suitable for a single-instance college-project deployment. Back up `backend/storage/`; for multi-instance or production deployment, move profiles and history to a transactional database.
- This is a local/college-project deployment using file-based storage. For a public production deployment, use managed object storage and a database, enforce HTTPS, configure production origins, set upload and retention policies, and review privacy/security requirements.
- Google sign-in does not mean the app can access the user's Google Drive. Users upload files directly into DemandX.
- No sample data or fabricated performance metrics are bundled as real results.

## Tests

From `backend/` with the dependencies installed, run `python -m unittest discover -s tests -v`. The tests cover daily product aggregation, lag/rolling feature creation, and chronological model evaluation.

## Troubleshooting

- **Google sign-in setup required** — check both `.env` files and restart Vite and FastAPI after changing them.
- **Origin is not allowed** — add the exact frontend origin to Google Cloud's Authorized JavaScript origins and to `CORS_ORIGINS` in `backend/.env`.
- **No forecast generated** — verify date parsing, numeric demand values, product name selection, and the required historical coverage. The API returns a specific validation message when it cannot make a forecast.
- **Port already in use** — choose another port and update `VITE_API_URL` / `CORS_ORIGINS` to match.

## Visual motion upgrade

The frontend includes coordinated light and dark analytics themes, restrained ambient motion, a low-count login particle layer, desktop-only pointer-responsive glow, staggered entrances, page transitions with browser history support, interactive KPI cards, and animated forecast feedback. Motion respects reduced-motion settings; pointer effects and decorative particles are omitted on smaller screens. Theme choice is stored as `demandx_theme` in browser `localStorage` and defaults to dark mode. Number abbreviations use the English convention (for example, `1.2K`, `1.5M`, and `1.2B`); there is no Indian-numbering conversion. Existing `.env` files are local secrets and must not be copied into a distributable archive; configure them from the `.env.example` templates instead.
