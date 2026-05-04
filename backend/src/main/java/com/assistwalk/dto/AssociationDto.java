// src/main/java/com/assistwalk/dto/AssociationDto.java
package com.assistwalk.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AssociationDto {
    private Long          id;
    private Long          malvoyantId;
    private String        malvoyantEmail;
    private Long          accompagnateurId;
    private String        accompagnateurEmail;
    private LocalDateTime createdAt;
}