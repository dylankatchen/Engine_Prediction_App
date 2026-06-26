package com.aircraft.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EngineStatusRepository extends JpaRepository<EngineStatus, Integer> {
    List<EngineStatus> findAllByOrderByEngineIdAsc();
}
