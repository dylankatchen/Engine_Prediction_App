package com.aircraft.maintenance;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.LocalDateTime;

@Entity
public class EngineStatus {
    @Id
    private Integer engineId;

    private Double lastPredictedRul;
    private LocalDateTime lastUpdate;

    // Getters and Setters
    public Integer getEngineId() {
        return engineId;
    }

    public void setEngineId(Integer engineId) {
        this.engineId = engineId;
    }

    public Double getLastPredictedRul() {
        return lastPredictedRul;
    }

    public void setLastPredictedRul(Double lastPredictedRul) {
        this.lastPredictedRul = lastPredictedRul;
    }

    public LocalDateTime getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(LocalDateTime lastUpdate) {
        this.lastUpdate = lastUpdate;
    }
}
