// src/main/java/com/assistwalk/repository/TokenFcmRepository.java
package com.assistwalk.repository;

import com.assistwalk.model.TokenFcm;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TokenFcmRepository
        extends JpaRepository<TokenFcm, Long> {

    // Tous les tokens d'un utilisateur (peut avoir plusieurs appareils)
    List<TokenFcm> findByUserId(Long userId);

    // Utile pour éviter les doublons lors de l'enregistrement
    Optional<TokenFcm> findByFcmToken(String fcmToken);
    @Transactional
    // Suppression propre quand un token expire
    void deleteByFcmToken(String fcmToken);
}