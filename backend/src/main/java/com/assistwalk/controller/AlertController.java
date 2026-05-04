package com.assistwalk.controller;

import com.assistwalk.dto.AlertResponse;
import com.assistwalk.dto.SosRequest;
import com.assistwalk.model.Alert;
import com.assistwalk.repository.AlertRepository;
import com.assistwalk.repository.UserRepository;
import com.assistwalk.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.assistwalk.dto.AlertDto;
import org.springframework.security.access.prepost.PreAuthorize;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertRepository  alertRepository;
    private final UserRepository   userRepository;
    private final AlertService     alertService;    // injection via constructeur

    @PostMapping("/sos")
    public ResponseEntity<AlertResponse> createSos(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SosRequest request) {

        var user = userRepository
                .findByEmail(userDetails.getUsername())
                .orElseThrow(() ->
                        new UsernameNotFoundException("Utilisateur introuvable"));

        Alert alert = new Alert();
        alert.setUserId(user.getId());
        alert.setLatitude(request.getLatitude());
        alert.setLongitude(request.getLongitude());
        alert.setObstacleType(request.getObstacleType());
        alert.setStatus("ACTIVE");
        alert.setCreatedAt(LocalDateTime.now());

        Alert saved = alertRepository.save(alert);

        // broadcastSos est maintenant pleinement implémenté :
        // il envoie sur /topic/alerts/{companionId} pour chaque
        // accompagnateur associé au malvoyant
        alertService.broadcastSos(saved);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new AlertResponse(
                        saved.getId(),
                        saved.getStatus(),
                        saved.getCreatedAt()));
    }
    // src/main/java/com/assistwalk/controller/AlertController.java
// Ajouter ces deux endpoints dans le contrôleur existant

    /**
     * GET /api/v1/alerts/active
     * Retourne les alertes actives des malvoyants associés
     * à l'accompagnateur connecté.
     * Accessible aux rôles COMPANION et ADMIN.
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('COMPANION', 'ADMIN')")
    public ResponseEntity<List<AlertDto>> getActiveAlerts(
            @AuthenticationPrincipal UserDetails userDetails) {

        var user = userRepository
                .findByEmail(userDetails.getUsername())
                .orElseThrow(() ->
                        new UsernameNotFoundException("Introuvable"));

        List<AlertDto> alerts =
                alertService.getActiveAlertsForCompanion(user.getId());

        return ResponseEntity.ok(alerts);
    }

    /**
     * PATCH /api/v1/alerts/{id}/resolve
     * Marque une alerte comme résolue.
     */
    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('COMPANION', 'ADMIN')")
    public ResponseEntity<AlertDto> resolveAlert(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        var user = userRepository
                .findByEmail(userDetails.getUsername())
                .orElseThrow(() ->
                        new UsernameNotFoundException("Introuvable"));

        AlertDto resolved = alertService.resolveAlert(id, user.getId());
        return ResponseEntity.ok(resolved);
    }
}