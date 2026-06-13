package com.assistwalk.service;

import com.assistwalk.dto.CreateUserRequest;
import com.assistwalk.dto.UpdateUserRequest;
import com.assistwalk.dto.UserDto;
import com.assistwalk.dto.UserProfileDto;
import com.assistwalk.model.Accompagnateur;
import com.assistwalk.model.Malvoyant;
import com.assistwalk.model.User;
import com.assistwalk.repository.AccompagnateurRepository;
import com.assistwalk.repository.MalvoyantRepository;
import com.assistwalk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.assistwalk.exception.ResourceNotFoundException;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository          userRepository;
    private final PasswordEncoder         passwordEncoder;
    private final EmailService            emailService;
    private final MalvoyantRepository     malvoyantRepository;
    private final AccompagnateurRepository accompagnateurRepository;

    // ── Liste tous les utilisateurs ───────────────────────────
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return toDto(user);
    }

    // ── Créer un utilisateur ──────────────────────────────────
    @Transactional
    public UserDto createUser(CreateUserRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException(
                    "An account already exists with this email.");
        }

        // 1. Générer un mot de passe temporaire sécurisé
        String tempPassword = generateTemporaryPassword();

        // 2. Créer l'utilisateur
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setRole(request.getRole());
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setTelephone(request.getTelephone());
        user.setAdresse(request.getAdresse());
        user.setMustChangePassword(true);   // obligatoire au premier login

        User saved = userRepository.save(user);

        // 2bis. Créer les données spécifiques au rôle
        if ("VISUAL_IMPAIRED".equals(saved.getRole())) {
            Malvoyant m = new Malvoyant();
            m.setUser(saved);
            m.setTelephoneUrgence(request.getTelephoneUrgence());
            m.setGroupeSanguin(request.getGroupeSanguin());
            m.setNiveauDeficience(request.getNiveauDeficience());
            malvoyantRepository.save(m);
        } else if ("COMPANION".equals(saved.getRole())) {
            Accompagnateur a = new Accompagnateur();
            a.setUser(saved);
            a.setTelephoneProfessionnel(request.getTelephoneProfessionnel());
            a.setAnneesExperience(request.getAnneesExperience());
            if (request.getDateEmbauche() != null && !request.getDateEmbauche().isBlank()) {
                try { a.setDateEmbauche(LocalDate.parse(request.getDateEmbauche())); }
                catch (Exception ignored) {}
            }
            accompagnateurRepository.save(a);
        }

        // 3. Envoyer l'email avec les identifiants
        emailService.sendWelcomeEmail(saved, tempPassword);

        log.info("[ADMIN] Compte créé pour {} (rôle: {})",
                saved.getEmail(), saved.getRole());

        return toDto(saved);
    }
    // Dans updateUser()
    @Transactional
    public UserDto updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getNom() != null) user.setNom(request.getNom());
        if (request.getPrenom() != null) user.setPrenom(request.getPrenom());
        if (request.getTelephone() != null) user.setTelephone(request.getTelephone());
        if (request.getAdresse() != null) user.setAdresse(request.getAdresse());
        if (request.getRole() != null) user.setRole(request.getRole());

        // Cas 1 : l'admin fournit un nouveau mot de passe spécifique
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            validatePassword(request.getPassword());   // ex: longueur minimale
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setMustChangePassword(false);  // l'admin définit un mdp final
            emailService.sendPasswordChangedByAdmin(user); // optionnel
        }
        // Cas 2 : l'admin veut forcer une réinitialisation (générer un temporaire)
        else if (request.isForceReset()) {  // à ajouter dans UpdateUserRequest
            String newTemp = generateTemporaryPassword();
            user.setPassword(passwordEncoder.encode(newTemp));
            user.setMustChangePassword(true);
            emailService.sendPasswordResetEmail(user, newTemp);
        }

        return toDto(userRepository.save(user));
    }
    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
    }

    // ── Supprimer ─────────────────────────────────────────────
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(id);
        log.info("[ADMIN] Utilisateur {} supprimé", id);
    }

    // ── Générateur de mot de passe temporaire ─────────────────
    private String generateTemporaryPassword() {
        // Format : Assist@XXXX (4 chiffres aléatoires)
        // Ex: Assist@4829
        SecureRandom random = new SecureRandom();
        int number = 1000 + random.nextInt(9000);  // 1000-9999
        return "Assist@" + number;
    }

    // ── Full profile with role-specific data ──────────────────
    public UserProfileDto getUserProfile(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserProfileDto.UserProfileDtoBuilder builder = UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .telephone(user.getTelephone())
                .adresse(user.getAdresse())
                .role(user.getRole())
                .photoUrl(user.getPhotoUrl())
                .mustChangePassword(user.isMustChangePassword())
                .createdAt(user.getCreatedAt())
                .derniereConnexion(user.getDerniereConnexion());

        if ("VISUAL_IMPAIRED".equals(user.getRole())) {
            Malvoyant m = malvoyantRepository.findById(user.getId()).orElse(null);
            if (m != null) {
                builder.telephoneUrgence(m.getTelephoneUrgence())
                       .groupeSanguin(m.getGroupeSanguin())
                       .niveauDeficience(m.getNiveauDeficience());
            }
        }

        if ("COMPANION".equals(user.getRole())) {
            Accompagnateur a = accompagnateurRepository.findById(user.getId()).orElse(null);
            if (a != null) {
                builder.telephoneProfessionnel(a.getTelephoneProfessionnel())
                       .dateEmbauche(a.getDateEmbauche() != null ? a.getDateEmbauche().toString() : null)
                       .anneesExperience(a.getAnneesExperience());
            }
        }

        return builder.build();
    }

    // ── Mapper ────────────────────────────────────────────────
    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .telephone(user.getTelephone())
                .adresse(user.getAdresse())
                .photoUrl(user.getPhotoUrl())
                .mustChangePassword(user.isMustChangePassword())
                .derniereConnexion(user.getDerniereConnexion())
                .createdAt(user.getCreatedAt())
                .build();
    }
}