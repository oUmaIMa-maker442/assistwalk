package com.assistwalk.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class OcrClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${ocr.service.url:http://localhost:8000}")
    private String ocrServiceUrl;

    public Map<String, Object> extractText(byte[] imageBytes, String filename) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() { return filename; }
        }).contentType(MediaType.IMAGE_JPEG);

        return webClientBuilder.build()
                .post()
                .uri(ocrServiceUrl + "/extract")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(30))
                .doOnError(e -> log.error("Erreur appel service OCR : {}", e.getMessage()))
                .block();
    }
}