// src/main/java/com/assistwalk/config/FcmConfig.java
package com.assistwalk.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;

@Configuration
@Slf4j
public class FcmConfig {

    @PostConstruct
    public void initFirebase() {
        try {
            // Charger le fichier de compte de service depuis le classpath
            InputStream serviceAccount = getClass()
                    .getResourceAsStream(
                            "/firebase-service-account.json");

            if (serviceAccount == null) {
                log.warn("[FCM] Fichier firebase-service-account.json " +
                        "introuvable — notifications push désactivées");
                return;
            }

            // Éviter la double initialisation si Spring recharge le contexte
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials
                                .fromStream(serviceAccount))
                        .build();
                FirebaseApp.initializeApp(options);
                log.info("[FCM] Firebase initialisé avec succès");
            }

        } catch (Exception e) {
            // On logue mais on ne fait pas planter le démarrage :
            // FCM est une fonctionnalité secondaire
            log.error("[FCM] Échec initialisation Firebase : {}",
                    e.getMessage());
        }
    }
}