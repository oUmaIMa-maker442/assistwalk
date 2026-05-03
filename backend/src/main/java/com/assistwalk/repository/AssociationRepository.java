package com.assistwalk.repository;

import com.assistwalk.model.Association;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AssociationRepository
        extends JpaRepository<Association, Long> {

    /**
     * Retourne les IDs de tous les accompagnateurs associés
     * au malvoyant donné.
     * Utilisé par AlertService pour cibler les destinataires WebSocket.
     */
    @Query("SELECT a.accompagnateurId FROM Association a " +
            "WHERE a.malvoyantId = :malvoyantId")
    List<Long> findCompanionIdsByMalvoyantId(
            @Param("malvoyantId") Long malvoyantId);

    /**
     * Vérifie si une association existe déjà entre deux utilisateurs.
     * Utile pour la Phase 4 (endpoint admin) pour éviter les doublons.
     */
    boolean existsByMalvoyantIdAndAccompagnateurId(
            Long malvoyantId, Long accompagnateurId);

    /**
     * Liste toutes les associations d'un accompagnateur.
     * Utilisé par l'interface web admin.
     */
    List<Association> findByAccompagnateurId(Long accompagnateurId);
    @Query("SELECT a.malvoyantId FROM Association a " +
            "WHERE a.accompagnateurId = :companionId")
    List<Long> findMalvoyantIdsByCompanionId(
            @Param("companionId") Long companionId);
}