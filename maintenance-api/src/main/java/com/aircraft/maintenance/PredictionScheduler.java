package com.aircraft.maintenance;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@EnableScheduling
public class PredictionScheduler {

    private final SensorReadingRepository readingRepository;
    private final EngineStatusRepository statusRepository;
    private final RestTemplate restTemplate;

    @Value("${ml-service.url}")
    private String mlServiceUrl;

    public PredictionScheduler(SensorReadingRepository readingRepository,
            EngineStatusRepository statusRepository,
            RestTemplate restTemplate) {
        this.readingRepository = readingRepository;
        this.statusRepository = statusRepository;
        this.restTemplate = restTemplate;
    }

    @Scheduled(fixedRate = 10000) // Every 10 seconds
    public void processNewReadings() {
        System.out.println("Checking for new sensor readings...");
        List<SensorReading> unprocessed = readingRepository.findByProcessedFalseOrderByTimestampAsc();

        if (unprocessed.isEmpty()) {
            return;
        }

        System.out.println("Processing " + unprocessed.size() + " new readings...");

        for (SensorReading reading : unprocessed) {
            try {
                // Call ML service
                Map<String, Object> response = restTemplate.postForObject(mlServiceUrl, reading.getData(), Map.class);

                if (response != null && response.containsKey("prediction")) {
                    List<?> predictions = (List<?>) response.get("prediction");
                    if (!predictions.isEmpty()) {
                        Double rul = ((Number) predictions.get(0)).doubleValue();

                        // Update Engine Status
                        EngineStatus status = statusRepository.findById(reading.getEngineId())
                                .orElse(new EngineStatus());
                        status.setEngineId(reading.getEngineId());
                        status.setLastPredictedRul(rul);
                        status.setLastUpdate(LocalDateTime.now());
                        statusRepository.save(status);

                        reading.setPredictedRul(rul);
                        System.out.println("Updated Engine " + reading.getEngineId() + " with RUL: " + rul);
                    }
                }

                // Mark as processed
                reading.setProcessed(true);
                readingRepository.save(reading);

            } catch (Exception e) {
                System.err.println("Error processing reading " + reading.getId() + ": " + e.getMessage());
            }
        }
    }
}
