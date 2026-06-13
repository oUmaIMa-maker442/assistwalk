package com.assistwalk.controller;

import com.assistwalk.dto.ChangePasswordRequest;
import com.assistwalk.dto.UpdateMyProfileRequest;
import com.assistwalk.dto.UserProfileDto;
import com.assistwalk.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;

    // GET /api/v1/users/{id}/profile  (accessible to COMPANION and ADMIN)
    @GetMapping("/{id}/profile")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('ROLE_COMPANION','ROLE_ADMIN')")
    public ResponseEntity<UserProfileDto> getUserProfileById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserProfileById(id));
    }

    // PUT /api/v1/users/me
    @PutMapping("/me")
    public ResponseEntity<UserProfileDto> updateMyProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UpdateMyProfileRequest request) {
        return ResponseEntity.ok(
                userService.updateMyProfile(userDetails.getUsername(), request));
    }

    // GET /api/v1/users/me
    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                userService.getMyProfile(userDetails.getUsername()));
    }

    // PUT /api/v1/users/me/password
    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChangePasswordRequest request) {
        try {
            userService.changePassword(
                    userDetails.getUsername(),
                    request.getCurrentPassword(),
                    request.getNewPassword());
            return ResponseEntity.ok(
                    Map.of("message", "Mot de passe mis à jour avec succès."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // POST /api/v1/users/me/photo
    @PostMapping(value = "/me/photo",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file) {
        try {
            String url = userService.uploadPhoto(
                    userDetails.getUsername(), file);
            return ResponseEntity.ok(Map.of("photoUrl", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Upload error."));
        }
    }

    // DELETE /api/v1/users/me/photo
    @DeleteMapping("/me/photo")
    public ResponseEntity<Void> deletePhoto(
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            userService.deletePhoto(userDetails.getUsername());
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}