package com.assistwalk.controller;

import com.assistwalk.dto.SosRequest;
import com.assistwalk.dto.SosResponse;
import com.assistwalk.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @PostMapping("/sos")
    @PreAuthorize("hasRole('VISUAL_IMPAIRED')")
    public ResponseEntity<SosResponse> sendSos(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SosRequest req) {

        SosResponse response = alertService.createSosAlert(userDetails.getUsername(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}