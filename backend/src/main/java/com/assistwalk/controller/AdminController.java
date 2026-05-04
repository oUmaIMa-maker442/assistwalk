// src/main/java/com/assistwalk/controller/AdminController.java
package com.assistwalk.controller;

import com.assistwalk.dto.*;
import com.assistwalk.service.AdminAssociationService;
import com.assistwalk.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")   // Protection globale sur tout le contrôleur
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService        adminUserService;
    private final AdminAssociationService adminAssociationService;

    // ── CRUD Utilisateurs ─────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserService.getUserById(id));
    }

    @PostMapping("/users")
    public ResponseEntity<UserDto> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        UserDto created = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(adminUserService.updateUser(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // ── Gestion des associations ──────────────────────────────────

    @GetMapping("/associations")
    public ResponseEntity<List<AssociationDto>> getAllAssociations() {
        return ResponseEntity.ok(
                adminAssociationService.getAllAssociations());
    }

    @PostMapping("/associations")
    public ResponseEntity<AssociationDto> createAssociation(
            @Valid @RequestBody AssociationRequest request) {
        AssociationDto created =
                adminAssociationService.createAssociation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/associations/{id}")
    public ResponseEntity<Void> deleteAssociation(@PathVariable Long id) {
        adminAssociationService.deleteAssociation(id);
        return ResponseEntity.noContent().build();
    }
}