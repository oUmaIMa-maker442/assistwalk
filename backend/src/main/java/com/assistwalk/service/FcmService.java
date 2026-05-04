// src/main/java/com/assistwalk/service/FcmService.java
package com.assistwalk.service;

import com.assistwalk.model.TokenFcm;
import com.assistwalk.repository.TokenFcmRepository;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class FcmService {

    private final TokenFcmRepository tokenFcmRepository;

    /**
     * Envoie une notification push à tous les appareils enregistrés
     * pour un accompagnateur donné.
     *
     * Ne lève jamais d'exception vers l'appelant : une erreur FCM
     * ne doit pas interrompre le flux SOS principal.
     *
     * @param companionId ID de l'accompagnateur destinataire
     * @param title       Titre de la notification
     * @param body        Corps de la notification
     */
    public void sendPushNotification(Long companionId,
                                     String title,
                                     String body) {
        // Firebase non initialisé (fichier JSON absent) → on skip
        if (FirebaseApp.getApps().isEmpty()) {
            log.warn("[FCM] Firebase non initialisé — " +
                            "notification ignorée pour companion {}",
                    companionId);
            return;
        }

        List<TokenFcm> tokens = tokenFcmRepository
                .findByUserId(companionId);

        if (tokens.isEmpty()) {
            log.debug("[FCM] Aucun token enregistré pour companion {}",
                    companionId);
            return;
        }

        for (TokenFcm tokenFcm : tokens) {
            sendToToken(tokenFcm, title, body, companionId);
        }
    }

    private void sendToToken(TokenFcm tokenFcm,
                             String title,
                             String body,
                             Long companionId) {
        try {
            Message message = Message.builder()
                    .setToken(tokenFcm.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    // Données supplémentaires accessibles dans l'app Flutter
                    .putData("type", "SOS_ALERT")
                    .putData("companionId", companionId.toString())
                    .build();

            String response = FirebaseMessaging
                    .getInstance()
                    .send(message);

            log.info("[FCM] Notification envoyée → companion {} " +
                            "device '{}' | messageId={}",
                    companionId,
                    tokenFcm.getDeviceName(),
                    response);

        } catch (FirebaseMessagingException e) {
            // Token expiré ou invalide → on le supprime proprement
            if (e.getMessagingErrorCode() ==
                    MessagingErrorCode.UNREGISTERED ||
                    e.getMessagingErrorCode() ==
                            MessagingErrorCode.INVALID_ARGUMENT) {

                log.warn("[FCM] Token invalide/expiré pour companion {} " +
                        "— suppression automatique", companionId);
                tokenFcmRepository.deleteByFcmToken(
                        tokenFcm.getFcmToken());
            } else {
                log.error("[FCM] Échec envoi companion {} : {}",
                        companionId, e.getMessage());
            }
        }
    }
}