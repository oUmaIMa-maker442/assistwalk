package com.assistwalk.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AlertNotificationDto {
    private Long          alertId;
    private Long          userId;          // ID du malvoyant
    private Double        latitude;
    private Double        longitude;
    private String        obstacleType;    // dernier obstacle détecté
    private LocalDateTime createdAt;

    // Champ optionnel : affiché dans la popup de la carte Leaflet
    // sans que React ait besoin d'un GET supplémentaire
    private String        status;          // "ACTIVE" au moment de l'envoi
}