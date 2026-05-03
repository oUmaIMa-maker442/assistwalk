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

    // Toutes les alertes actives d'une liste de malvoyants
    // Utilisé par l'accompagnateur pour voir ses malvoyants associés
    @Query("SELECT a FROM Alert a " +
            "WHERE a.userId IN :malvoyantIds " +
            "AND a.status = 'ACTIVE' " +
            "ORDER BY a.createdAt DESC")
    List<Alert> findActiveByMalvoyantIds(
            @Param("malvoyantIds") List<Long> malvoyantIds);

    // Historique paginable (Phase 5)
    List<Alert> findByUserIdOrderByCreatedAtDesc(Long userId);
}