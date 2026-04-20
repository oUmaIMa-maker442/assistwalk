package com.assistwalk.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SosRequest {
    @NotNull
    private Double latitude;

    @NotNull
    private Double longitude;

    private String obstacleType;   // ex: "stairs", peut être null
}