from fastapi import FastAPI
import uvicorn
import joblib
import pandas as pd
import os

app = FastAPI()

import traceback

# Load the model
model_path = os.getenv("MODEL_PATH", "model/rul_model.pkl")
try:
    model = joblib.load(model_path)
    print(f"Model loaded from {model_path}")
except Exception as e:
    print(f"Error loading model: {e}")
    traceback.print_exc()
    model = None

@app.get("/")
def read_root():
    return {"status": "ML Service is running"}

@app.post("/predict")
def predict(data: dict):
    if model is None:
        return {"error": "Model not loaded xd"}
    
    # Convert incoming dict to DataFrame for prediction
    df = pd.DataFrame([data])
    
    # Simple prediction (adjust based on your model's expected input)
    # The CMAPSS dataset usually needs specific column ordering/scaling
    try:
        prediction = model.predict(df)
        return {"prediction": prediction.tolist()}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)