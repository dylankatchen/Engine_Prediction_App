# ✈️ EngineGuard AI: Predictive Maintenance System

A full-stack real-time predictive maintenance platform. It ingests aircraft sensor data via **Kafka**, stores it in **PostgreSQL**, and uses a **Scikit-Learn** model to predict the Remaining Useful Life (RUL) of engines.

---

## 🚀 1st Time Setup

If this is your first time running the project, follow these steps to prepare the environment and train the initial AI model.

### 1. Train the ML Model
Before starting the services, you must train the model using the provided CMAPSS dataset.
```bash
cd ml-service
# (Ensure your venv is active)
python train.py
cd ..
```

### 2. Build the Java API
Build the JAR file for the maintenance API.
```bash
cd maintenance-api
mvn clean package -DskipTests
cd ..
```

### 3. Launch Services
Start the entire infrastructure (Kafka, Postgres, ML Service, Java API, and Dashboard).
```bash
docker-compose up --build -d
```

### 4. Setup Python Producer
Prepare the script that will "fly" the engines by feeding data into Kafka.
```bash
cd kafka-producer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 🔁 Recurring Setup (Normal Run)

If you have already built the project and just want to run it again:

1.  **Start Services**:
    ```bash
    docker-compose up -d
    ```
2.  **Start Data Flow**:
    ```bash
    cd kafka-producer
    source venv/bin/activate
    python producer.py
    ```
3.  **View Dashboard**:
    Open [http://localhost:5173](http://localhost:5173)

---

## 🧹 How to Start Freshly

If you want to clear all history, reset engine cycles, and wipe the database for a clean demo:

Kill the process: kill 9371

1.  **Stop and Wipe Volumes**:
    ```bash
    docker-compose down -v
    ```
2.  **Restart**:
    ```bash
    docker-compose up --build -d
    ```
3.  **Run Producer**:
    ```bash
    cd kafka-producer && python producer.py
    ```

---

## 🛠 System Architecture

-   **Kafka Producer**: Simulates real-time sensor streams from the NASA CMAPSS dataset.
-   **Kafka (9092)**: Acts as the high-throughput message bus.
-   **Maintenance API (8080)**: Consumes sensor data, saves it to Postgres, and runs a scheduler every 10 seconds to batch-predict RUL.
-   **ML Service (5005)**: A FastAPI wrapper around a RandomForest model that returns RUL predictions.
-   **Frontend Dash (5173)**: A React/Vite dashboard with health charts and historical trend tracking.

---

## 📊 Thresholds
-   🔴 **Critical**: < 50 Cycles remaining
-   🟠 **Warning**: < 100 Cycles remaining
-   🟢 **Healthy**: > 100 Cycles remaining
