package com.aircraft.maintenance;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/engines")
@CrossOrigin(origins = "*")
public class EngineController {

    private final EngineStatusRepository statusRepository;
    private final SensorReadingRepository readingRepository;

    public EngineController(EngineStatusRepository statusRepository,
            SensorReadingRepository readingRepository) {
        this.statusRepository = statusRepository;
        this.readingRepository = readingRepository;
    }

    @GetMapping("/status")
    public List<EngineStatus> getAllStatuses() {
        // Return sorted by engine ID for stable frontend selection
        return statusRepository.findAllByOrderByEngineIdAsc();
    }

    @GetMapping("/{engineId}/history")
    public List<SensorReading> getEngineHistory(@PathVariable Integer engineId) {
        // Return sorted by cycle and limit to newest 100
        List<SensorReading> history = readingRepository.findByEngineIdOrderByCycleAsc(engineId);
        if (history.size() > 100) {
            return history.subList(history.size() - 100, history.size());
        }
        return history;
    }
}
