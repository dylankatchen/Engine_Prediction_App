package com.aircraft.maintenance;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class SensorConsumer {

    private final SensorReadingRepository repository;

    public SensorConsumer(SensorReadingRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(topics = "${kafka.topic.sensor_readings}", groupId = "maintenance-group")
    public void listen(Map<String, Object> sensorData) {
        System.out.println("Received Sensor Data: " + sensorData);

        try {
            SensorReading reading = new SensorReading();
            // Data format from producer: { "0": engineId, "1": cycle, ... }
            if (sensorData.containsKey("0")) {
                reading.setEngineId(((Number) sensorData.get("0")).intValue());
            }
            if (sensorData.containsKey("1")) {
                reading.setCycle(((Number) sensorData.get("1")).intValue());
            }

            reading.setData(sensorData);
            reading.setTimestamp(LocalDateTime.now());
            reading.setProcessed(false);

            repository.save(reading);
        } catch (Exception e) {
            System.err.println("Failed to save sensor data: " + e.getMessage());
        }
    }
}
