package com.assistwalk.service;

import com.assistwalk.exception.OcrClientException;
import com.assistwalk.exception.OcrServiceUnavailableException;
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
        if (imageBytes == null || imageBytes.length == 0) {
            log.warn("[OCR] Image vide reçue — retour texte vide");
            return Map.of("text", "", "confidence", 0.0);
        }

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return (filename != null) ? filename : "upload.jpg";
            }
        }).contentType(MediaType.IMAGE_JPEG);

        try {
            Map<String, Object> result = webClientBuilder.build()
                    .post()
                    .uri(ocrServiceUrl + "/extract")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError(),
                            response -> response.bodyToMono(String.class)
                                    .map(body -> new OcrClientException(
                                            "Requête invalide vers le service OCR : " + body)))
                    .onStatus(status -> status.is5xxServerError(),
                            response -> response.bodyToMono(String.class)
                                    .map(body -> new OcrClientException(
                                            "Erreur interne du service OCR : " + body)))
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .doOnError(e -> log.error("[OCR] Appel échoué vers {} : {}", ocrServiceUrl, e.getMessage()))
                    .block();

            log.debug("[OCR] Résultat reçu — confidence={}",
                    result != null ? result.get("confidence") : "null");
            return (result != null) ? result : Map.of("text", "", "confidence", 0.0);

        } catch (OcrClientException e) {
            throw e;
        } catch (Exception e) {
            log.error("[OCR] Service inaccessible : {}", e.getMessage());
            throw new OcrServiceUnavailableException(
                    "Le service OCR est inaccessible : " + e.getMessage(), e);
        }
    }
}