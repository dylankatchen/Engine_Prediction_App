from kafka import KafkaProducer
import pandas as pd
import json
import time
import os

# Configuration
KAFKA_SERVER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC = 'sensor_readings'
SLEEP_TIME = 0.03

# Load dataset
print("Loading CMAPSS dataset...")
df = pd.read_csv("data/test_FD001.txt", sep=" ", header=None).dropna(axis=1, how='all')

# Column names based on CMAPSS documentation
# 0: Unit ID, 1: Cycle, 2: Setting1, 3: Setting2, 4: Setting3, 5-25: Sensors
df.columns = [i for i in range(df.shape[1])]

# To simulate a FLEET, we sort by Cycle first.
# This way we send Cycle 1 for all engines, then Cycle 2 for all engines, etc.
print("Reorganizing data for fleet simulation...")
df_fleet = df.sort_values(by=[1, 0])

producer = KafkaProducer(
    bootstrap_servers=KAFKA_SERVER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

print(f"Starting fleet simulation (sending to {KAFKA_SERVER})...")
try:
    for _, row in df_fleet.iterrows():
        message = row.to_dict()
        producer.send(TOPIC, message)
        # Convert keys to int for cleaner logs
        engine_id = int(row[0])
        cycle = int(row[1])
        print(f"✈️ Engine #{engine_id} | Cycle {cycle} sent")
        time.sleep(SLEEP_TIME)
except KeyboardInterrupt:
    print("\nSimulation stopped by user.")
finally:
    producer.close()
