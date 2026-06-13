package com.assistwalk.service;

import com.assistwalk.dto.AlertDto;
import com.assistwalk.dto.AlertNotificationDto;
import com.assistwalk.exception.ResourceNotFoundException;
import com.assistwalk.model.Alert;
import com.assistwalk.model.User;
import com.assistwalk.repository.AlertRepository;
import com.assistwalk.repository.AssociationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AlertService {

    private final SimpMessagingTemplate                    messagingTemplate;
    private final AssociationRepository                    associationRepository;
    private final AlertRepository                          alertRepository;
    private final FcmService                               fcmService;
    private final EmailService                             emailService;
    private final com.assistwalk.repository.UserRepository userRepository;

    // ── Diffusion SOS ─────────────────────────────────────────────

    public void broadcastSos(Alert savedAlert) {

        List<Long> companionIds = associationRepository
                .findCompanionIdsByMalvoyantId(savedAlert.getUserId());

        if (companionIds.isEmpty()) {
            log.warn("[WS] Aucun accompagnateur associé au malvoyant {}",
                    savedAlert.getUserId());
            return;
        }

        AlertNotificationDto notification = AlertNotificationDto.builder()
                .alertId(savedAlert.getId())
                .userId(savedAlert.getUserId())
                .latitude(savedAlert.getLatitude())
                .longitude(savedAlert.getLongitude())
                .obstacleType(savedAlert.getObstacleType())
                .createdAt(savedAlert.getCreatedAt())
                .status("ACTIVE")
                .build();

        for (Long companionId : companionIds) {

            // 1. WebSocket STOMP
            String destination = "/topic/alerts/" + companionId;
            messagingTemplate.convertAndSend(destination, notification);
            log.info("[WS] Alerte {} → companion {} sur {}",
                    savedAlert.getId(), companionId, destination);

            // 2. Push FCM — ne propage jamais d'exception
            fcmService.sendPushNotification(
                    companionId,
                    "🚨 Alerte SOS",
                    "Un malvoyant que vous accompagnez a déclenché " +
                            "une alerte. Consultez la carte.");

            // 3. Email SOS — fallback offline, ne propage jamais d'exception
            Optional<User> companionOpt = userRepository.findById(companionId);
            if (companionOpt.isEmpty()) {
                log.warn("[EMAIL] Companion {} introuvable — email SOS non envoyé", companionId);
                continue;
            }
            try {
                emailService.sendSosAlertEmail(companionOpt.get(), savedAlert);
                log.info("[EMAIL] SOS email envoyé → companion {}", companionId);
            } catch (Exception ex) {
                log.error("[EMAIL] Échec envoi SOS email → companion {} : {}",
                        companionId, ex.getMessage());
            }
        }
    }

    // ── Admin : toutes les alertes ────────────────────────────────

    public List<AlertDto> getAllAlerts() {
        return alertRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    // ── Endpoints accompagnateur ──────────────────────────────────

    /**
     * Retourne toutes les alertes actives des malvoyants associés
     * à l'accompagnateur donné.
     */
    public List<AlertDto> getActiveAlertsForCompanion(Long companionId) {

        List<Long> malvoyantIds = associationRepository
                .findMalvoyantIdsByCompanionId(companionId);

        if (malvoyantIds.isEmpty()) {
            log.debug("[ALERT] Aucun malvoyant associé à companion {}", companionId);
            return List.of();
        }

        java.time.LocalDateTime todayStart = java.time.LocalDate.now().atStartOfDay();

        return alertRepository
                .findActiveAndResolvedTodayByMalvoyantIds(malvoyantIds, todayStart)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Marque une alerte comme résolue.
     * Vérifie que l'accompagnateur est bien associé au malvoyant
     * concerné par l'alerte.
     */
    @Transactional
    public AlertDto resolveAlert(Long alertId, Long companionId) {

        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Alerte introuvable : " + alertId));

        // Vérification d'accès
        List<Long> malvoyantIds = associationRepository
                .findMalvoyantIdsByCompanionId(companionId);

        if (!malvoyantIds.contains(alert.getUserId())) {
            throw new SecurityException(
                    "Accès refusé : cette alerte ne concerne pas " +
                            "un de vos malvoyants");
        }

        if ("RESOLVED".equals(alert.getStatus())) {
            throw new IllegalStateException(
                    "Cette alerte est déjà résolue");
        }

        alert.setStatus("RESOLVED");
        alert.setResolvedAt(LocalDateTime.now());
        Alert saved = alertRepository.save(alert);

        log.info("[ALERT] Alerte {} résolue par companion {}",
                alertId, companionId);

        return toDto(saved);
    }

    // ── Mapper interne ────────────────────────────────────────────

    private AlertDto toDto(Alert alert) {
        com.assistwalk.model.User user = userRepository.findById(alert.getUserId()).orElse(null);
        return AlertDto.builder()
                .id(alert.getId())
                .userId(alert.getUserId())
                .userPrenom(user != null ? user.getPrenom() : null)
                .userNom(user != null ? user.getNom() : null)
                .userPhotoUrl(user != null ? user.getPhotoUrl() : null)
                .latitude(alert.getLatitude())
                .longitude(alert.getLongitude())
                .obstacleType(alert.getObstacleType())
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .resolvedAt(alert.getResolvedAt())
                .build();
    }
}