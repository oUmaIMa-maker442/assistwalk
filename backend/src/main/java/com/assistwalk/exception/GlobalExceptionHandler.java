package com.assistwalk.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Service OCR indisponible → 503
    @ExceptionHandler(OcrServiceUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleOcrUnavailable(
            OcrServiceUnavailableException ex) {
        log.error("[API] OCR service unavailable: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(errorBody(503, ex.getMessage()));
    }

    // Erreur métier OCR (image invalide côté FastAPI) → 500
    @ExceptionHandler(OcrClientException.class)
    public ResponseEntity<Map<String, Object>> handleOcrClient(
            OcrClientException ex) {
        log.error("[API] OCR error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorBody(500, "Internal OCR error: " + ex.getMessage()));
    }

    // Fichier trop volumineux → 400
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleFileTooLarge(
            MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorBody(400,
                        "File too large. Maximum size: 10 MB."));
    }

    // Erreurs génériques non gérées → 500
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(
            Exception ex) {
        log.error("[API] Unhandled error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorBody(500, "Internal server error."));
    }

    private Map<String, Object> errorBody(int status, String message) {
        return Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status",    status,
                "message",   message
        );
    }
    // Ajouter dans GlobalExceptionHandler.java

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorBody(404, ex.getMessage()));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(
            SecurityException ex) {
        log.warn("[API] Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorBody(403, ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(
            IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(errorBody(409, ex.getMessage()));
    }
}