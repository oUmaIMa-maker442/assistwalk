package com.assistwalk.repository;

import com.assistwalk.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByUserIdAndStatus(Long userId, String status);
}