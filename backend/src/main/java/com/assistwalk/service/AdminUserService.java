// src/main/java/com/assistwalk/service/AdminUserService.java
package com.assistwalk.service;

import com.assistwalk.dto.*;
import com.assistwalk.exception.ResourceNotFoundException;
import com.assistwalk.model.User;
import com.assistwalk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public UserDto getUserById(Long id) {
        return userRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur introuvable : " + id));
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalStateException(
                    "Un compte existe déjà avec cet email : "
                            + request.getEmail());
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setTelephone(request.getTelephone());

        User saved = userRepository.save(user);
        log.info("[ADMIN] Utilisateur créé : id={} email={} role={}",
                saved.getId(), saved.getEmail(), saved.getRole());
        return toDto(saved);
    }

    @Transactional
    public UserDto updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur introuvable : " + id));

        if (request.getNom()       != null) user.setNom(request.getNom());
        if (request.getPrenom()    != null) user.setPrenom(request.getPrenom());
        if (request.getTelephone() != null) user.setTelephone(request.getTelephone());
        if (request.getAdresse()   != null) user.setAdresse(request.getAdresse());

        return toDto(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException(
                    "Utilisateur introuvable : " + id);
        }
        userRepository.deleteById(id);
        log.info("[ADMIN] Utilisateur supprimé : id={}", id);
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .telephone(user.getTelephone())
                .build();
    }
}