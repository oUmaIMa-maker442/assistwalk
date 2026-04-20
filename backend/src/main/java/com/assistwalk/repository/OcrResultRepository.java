package com.assistwalk.repository;

import com.assistwalk.model.OcrResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OcrResultRepository extends JpaRepository<OcrResult, Long> {
    List<OcrResult> findByUserIdOrderByCreatedAtDesc(Long userId);
}