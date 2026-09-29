import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

ARTIFACTS_DIR = Path(__file__).parent.parent / 'model'

# Ranges the model was trained on; predictions outside them are not supported.
AGE_RANGE = (18, 64)
BMI_RANGE = (18.5, 40.0)

SEX_CODES = {'female': 0, 'male': 1}
SMOKER_CODES = {'no': 0, 'yes': 1}

_model = None
_data_columns = None


def load_saved_artifacts():
    global _model, _data_columns
    with open(ARTIFACTS_DIR / 'columns.json') as f:
        _data_columns = json.load(f)['data_columns']
    with open(ARTIFACTS_DIR / 'insurance_model.pkl', 'rb') as f:
        _model = pickle.load(f)


def get_estimated_charges(age, sex, bmi, smoker):
    row = pd.DataFrame([{
        'age': age,
        'sex': SEX_CODES[sex],
        'bmi': bmi,
        'smoker': SMOKER_CODES[smoker],
    }], columns=_data_columns)
    # The model predicts log(charges); convert back to dollars.
    return float(np.exp(_model.predict(row)[0]))