package com.assistwalk.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SosResponse {
    private Long id;
    private String status;
    private LocalDateTime createdAt;
}