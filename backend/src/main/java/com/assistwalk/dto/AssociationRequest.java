// src/main/java/com/assistwalk/dto/AssociationRequest.java
package com.assistwalk.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssociationRequest {

    @NotNull(message = "malvoyantId is required")
    private Long malvoyantId;

    @NotNull(message = "accompagnateurId is required")
    private Long accompagnateurId;
}