import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def train_model():
    # Load dataset
    # Columns: unit number, time (cycles), setting 1, setting 2, setting 3, sensor 1, sensor 2, ...
    train_path = "data/train_FD001.txt"
    if not os.path.exists(train_path):
        print(f"File not found: {train_path}")
        return

    print("Loading training data...")
    # The dataset uses space as a separator and has no header
    df = pd.read_csv(train_path, sep=" ", header=None).dropna(axis=1, how='all')
    
    # Define columns
    # 0: id, 1: cycle, 2: setting1, 3: setting2, 4: setting3, 5-25: sensors
    columns = [0, 1, 2, 3, 4] + list(range(5, 26))
    df.columns = columns

    print("Calculating RUL...")
    # Calculate Remaining Useful Life (RUL)
    # RUL = (Max Cycle for engine) - (Current Cycle)
    max_cycles = df.groupby(0)[1].max().reset_index()
    max_cycles.columns = [0, 'max_cycle']
    df = df.merge(max_cycles, on=0)
    df['RUL'] = df['max_cycle'] - df[1]
    df.drop('max_cycle', axis=1, inplace=True)

    # Prepare features and target
    # We use all available columns as features (except RUL)
    # Note: In a production setting, you'd filter out sensors with constant values
    X = df.drop('RUL', axis=1)
    y = df['RUL']

    # Convert column names to strings to ensure compatibility with JSON-derived dicts in the API
    X.columns = [str(col) for col in X.columns]

    print(f"Training RandomForestRegressor on {len(df)} samples...")
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X, y)

    # Save the model
    model_dir = "model"
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
    
    model_file = os.path.join(model_dir, "rul_model.pkl")
    joblib.dump(model, model_file)
    print(f"Model saved to {model_file}")

if __name__ == "__main__":
    train_model()
