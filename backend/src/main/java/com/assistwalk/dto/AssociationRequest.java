// src/main/java/com/assistwalk/dto/AssociationRequest.java
package com.assistwalk.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssociationRequest {

    @NotNull(message = "malvoyantId requis")
    private Long malvoyantId;

    @NotNull(message = "accompagnateurId requis")
    private Long accompagnateurId;
}