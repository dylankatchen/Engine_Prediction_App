package com.aircraft.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {
    List<SensorReading> findByProcessedFalseOrderByTimestampAsc();

    List<SensorReading> findByEngineIdOrderByCycleAsc(Integer engineId);
}
