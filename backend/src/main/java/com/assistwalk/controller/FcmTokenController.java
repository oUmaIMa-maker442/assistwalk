// src/main/java/com/assistwalk/controller/FcmTokenController.java
package com.assistwalk.controller;

import com.assistwalk.model.TokenFcm;
import com.assistwalk.repository.TokenFcmRepository;
import com.assistwalk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class FcmTokenController {

    private final TokenFcmRepository tokenFcmRepository;
    private final UserRepository     userRepository;

    /**
     * PUT /api/v1/users/fcm-token
     * Enregistre ou met à jour le token FCM de l'utilisateur connecté.
     * Appelé par Flutter au démarrage de l'application.
     */
    @PutMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> registerToken(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {

        String newToken  = body.get("fcmToken");
        String deviceName = body.getOrDefault("deviceName", "unknown");

        if (newToken == null || newToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "fcmToken is required"));
        }

        var user = userRepository
                .findByEmail(userDetails.getUsername())
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        // Upsert : mettre à jour si le token existe déjà,
        // sinon créer une nouvelle entrée
        tokenFcmRepository.findByFcmToken(newToken)
                .ifPresentOrElse(
                        existing -> {
                            existing.setDeviceName(deviceName);
                            tokenFcmRepository.save(existing);
                        },
                        () -> {
                            TokenFcm t = new TokenFcm();
                            t.setUserId(user.getId());
                            t.setFcmToken(newToken);
                            t.setDeviceName(deviceName);
                            tokenFcmRepository.save(t);
                        }
                );

        return ResponseEntity.ok(
                Map.of("message", "FCM token registered"));
    }
}