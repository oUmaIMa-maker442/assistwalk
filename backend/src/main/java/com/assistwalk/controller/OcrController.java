package com.assistwalk.controller;

import com.assistwalk.dto.OcrResponse;
import com.assistwalk.model.OcrResult;
import com.assistwalk.repository.OcrResultRepository;
import com.assistwalk.repository.UserRepository;
import com.assistwalk.service.OcrClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrClient ocrClient;
    private final OcrResultRepository ocrResultRepository;
    private final UserRepository userRepository;

    @PostMapping(value = "/process", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OcrResponse> process(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("image") MultipartFile image) throws Exception {

        // Récupérer l'utilisateur connecté
        var user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Appeler le micro-service OCR
        Map<String, Object> result = ocrClient.extractText(
                image.getBytes(),
                image.getOriginalFilename() != null ? image.getOriginalFilename() : "upload.jpg"
        );

        String texte = (String) result.get("text");
        Double confidence = ((Number) result.get("confidence")).doubleValue();

        // Persister le résultat en base
        OcrResult ocrResult = new OcrResult();
        ocrResult.setUserId(user.getId());
        ocrResult.setTexte(texte);
        ocrResult.setConfidence(confidence);
        OcrResult saved = ocrResultRepository.save(ocrResult);

        return ResponseEntity.ok(new OcrResponse(saved.getId(), texte, confidence));
    }
}