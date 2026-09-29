# Medical Insurance Cost Estimator

A machine learning project that predicts medical insurance charges from age, sex, BMI, and smoking status, served through a FastAPI backend and a plain HTML/CSS/JS frontend. Gradient boosting captures a key finding — smoking status splits charges into two cost regimes, with a BMI threshold around 30 roughly doubling cost for smokers — cutting prediction error by ~46% versus linear regression.

## Overview

Trained on the public Kaggle [Medical Insurance Cost Dataset](https://www.kaggle.com/datasets/mosapabdelghany/medical-insurance-cost-dataset) (1,338 US records).

## Project structure

```
MedicalInsuranceCostPrediction/
├── model/
│   ├── Medical_Insurance_Cost_prediction.ipynb   # full analysis: EDA, cleaning, modeling
│   ├── insurance_model.pkl                       # trained model
│   └── columns.json                              # expected feature order
├── server/
│   ├── server.py                                 # FastAPI app
│   └── util.py                                    # model loading + prediction logic
├── client/
│   ├── app.html
│   ├── app.css
│   └── app.js                                    # form, live BMI, calls the API
└── requirements.txt
```

## The model

**Data cleaning** (starting from 1,338 rows):
- Dropped `children` and `region`: neither showed a meaningful, consistent effect on charges once checked against sampling noise.
- Filtered `bmi` to 18.5–40 (excludes ~8% of rows, clinically underweight/severely obese). This is a documented tradeoff, not a claim these were data errors — the model is simply untested outside this range.
- Removed 1 exact duplicate row. Final dataset: 1,226 rows.

**Target**: trained on `log(charges)` to address strong right-skew, converted back to dollars with `np.exp()` for reporting.

**Model comparison** (5-fold cross-validation, R² on log scale):

| Model | CV R² |
|---|---|
| Linear regression | 0.704 |
| Lasso | 0.705 |
| Decision tree | 0.760 |
| Random forest | 0.767 |
| **Gradient boosting** | **0.769** |
| SVR | 0.753 |

**Final model**: `GradientBoostingRegressor(learning_rate=0.03, max_depth=3, min_samples_leaf=20, n_estimators=100)`

**Held-out test set performance** (converted back to dollars):

| Model | RMSE | MAE |
|---|---|---|
| Constant baseline | $12,165 | $7,917 |
| Linear regression | $8,220 | $4,175 |
| **Gradient boosting** | **$4,399** | **$2,131** |

R² on the test set: 0.854 (dollars), 0.837 (log scale).

**Where the model struggles**: prediction error concentrates in non-smokers with unusually high charges — cases the model can't anticipate from age, sex, bmi and smoking status alone. Full analysis, including the decision tree visualization that revealed the smoker × bmi interaction, is in the notebook.

## API

Built with FastAPI (`server/server.py`, `server/util.py`). Endpoints:

- `GET /health` — liveness check
- `GET /options` — supported input ranges (age, bmi) and valid values (sex, smoker), so the frontend never hardcodes them
- `POST /predict` — takes `{age, sex, bmi, smoker}`, returns `{estimated_charges}`. Inputs are validated against the training ranges (age 18–64, bmi 18.5–40) before they reach the model.

## Frontend

A single-page form (no framework, no build step) that:
- Computes BMI live from height and weight, with a metric/imperial toggle
- Fetches valid input ranges from `/options` on load
- Sends `POST /predict` and displays the estimate, or a clear error if a value is out of range or the server is unreachable

## Running locally

**1. Set up the environment** (from the project root):

```bash
python -m venv .venv
```

Windows:
```bash
.venv\Scripts\python -m pip install -r requirements.txt
```

macOS/Linux:
```bash
.venv/bin/python -m pip install -r requirements.txt
```

**2. Start the API** (from `server/`):

```bash
cd server
```

Windows:
```bash
..\.venv\Scripts\python -m uvicorn server:app --reload
```

macOS/Linux:
```bash
../.venv/bin/python -m uvicorn server:app --reload
```

Confirm it's running at `http://127.0.0.1:8000/health`.

**3. Serve the frontend** (from `client/`, in a separate terminal):

Windows:
```bash
..\.venv\Scripts\python -m http.server 5500
```

macOS/Linux:
```bash
../.venv/bin/python -m http.server 5500
```

Or use the VS Code "Live Server" extension.

**4. Open the app** at `http://127.0.0.1:5500/app.html`.

> If the frontend is served from a different port, add that origin to `allow_origins` in `server/server.py`, or the API will reject its requests (CORS).

## Limitations

- Trained on 1,226 rows from a single public dataset with no stated time period or currency — estimates are illustrative, not an insurance quote.
- Only 4 features are used (`age`, `sex`, `bmi`, `smoker`); `children` and `region` were tested and dropped for lack of a strong independent effect.
- Predictions outside the training ranges (age 18–64, bmi 18.5–40) are rejected rather than extrapolated.
- Weakest for non-smokers with unusually high charges, which the four features can't explain.

## Tech stack

Python, pandas, numpy, scikit-learn, FastAPI, uvicorn — backend and model.
HTML, CSS, JavaScript (no framework) — frontend.
