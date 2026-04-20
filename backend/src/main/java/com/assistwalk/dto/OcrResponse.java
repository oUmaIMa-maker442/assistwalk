package com.assistwalk.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OcrResponse {
    private Long id;
    private String text;
    private Double confidence;
}