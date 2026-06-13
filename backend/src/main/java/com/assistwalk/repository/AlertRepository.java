// src/main/java/com/assistwalk/repository/AlertRepository.java
package com.assistwalk.repository;

import com.assistwalk.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    // Alertes d'un malvoyant par statut
    List<Alert> findByUserIdAndStatus(Long userId, String status);

    // Alertes actives + résolues aujourd'hui pour le dashboard compagnon
    @Query("SELECT a FROM Alert a " +
            "WHERE a.userId IN :malvoyantIds " +
            "AND (a.status = 'ACTIVE' " +
            "     OR (a.status = 'RESOLVED' AND a.resolvedAt >= :todayStart)) " +
            "ORDER BY a.createdAt DESC")
    List<Alert> findActiveAndResolvedTodayByMalvoyantIds(
            @Param("malvoyantIds") List<Long> malvoyantIds,
            @Param("todayStart") java.time.LocalDateTime todayStart);

    // Historique paginable (Phase 5)
    List<Alert> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Historique complet (toutes les alertes, tous statuts) pour les malvoyants d'un accompagnateur
    @Query("SELECT a FROM Alert a " +
            "WHERE a.userId IN :malvoyantIds " +
            "ORDER BY a.createdAt DESC")
    List<Alert> findAllByMalvoyantIds(@Param("malvoyantIds") List<Long> malvoyantIds);
}