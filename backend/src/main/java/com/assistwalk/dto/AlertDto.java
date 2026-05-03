// src/main/java/com/assistwalk/dto/AlertDto.java
package com.assistwalk.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AlertDto {
    private Long          id;
    private Long          userId;       // ID du malvoyant
    private Double        latitude;
    private Double        longitude;
    private String        obstacleType;
    private String        status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;  // null si encore active
}