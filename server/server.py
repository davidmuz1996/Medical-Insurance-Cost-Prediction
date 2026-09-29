from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import util


@asynccontextmanager
async def lifespan(app: FastAPI):
    util.load_saved_artifacts()
    yield


app = FastAPI(title='Medical Insurance Cost API', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ],
    allow_methods=['GET', 'POST'],
    allow_headers=['Content-Type'],
)


class PredictionRequest(BaseModel):
    age: int = Field(ge=util.AGE_RANGE[0], le=util.AGE_RANGE[1])
    sex: Literal['female', 'male']
    bmi: float = Field(ge=util.BMI_RANGE[0], le=util.BMI_RANGE[1])
    smoker: Literal['no', 'yes']


class PredictionResponse(BaseModel):
    estimated_charges: float


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/options')
def options():
    return {
        'age': {'min': util.AGE_RANGE[0], 'max': util.AGE_RANGE[1]},
        'bmi': {'min': util.BMI_RANGE[0], 'max': util.BMI_RANGE[1]},
        'sex': list(util.SEX_CODES),
        'smoker': list(util.SMOKER_CODES),
    }


@app.post('/predict', response_model=PredictionResponse)
def predict(request: PredictionRequest):
    charges = util.get_estimated_charges(request.age, request.sex, request.bmi, request.smoker)
    return PredictionResponse(estimated_charges=round(charges, 2))