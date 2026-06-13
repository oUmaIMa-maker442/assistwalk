package com.assistwalk.service;

import com.assistwalk.dto.UpdateMyProfileRequest;
import com.assistwalk.dto.UserProfileDto;
import com.assistwalk.model.Accompagnateur;
import com.assistwalk.model.Malvoyant;
import com.assistwalk.model.User;
import com.assistwalk.repository.AccompagnateurRepository;
import com.assistwalk.repository.MalvoyantRepository;
import com.assistwalk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository          userRepository;
    private final MalvoyantRepository     malvoyantRepository;
    private final AccompagnateurRepository accompagnateurRepository;
    private final PasswordEncoder         passwordEncoder;

    @Value("${app.upload.dir:uploads/profiles}")
    private String uploadDir;

    // ── GET PROFILE BY ID (companion view) ────────────────────
    public UserProfileDto getUserProfileById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return getMyProfile(user.getEmail());
    }

    // ── GET PROFILE ────────────────────────────────────────────
    public UserProfileDto getMyProfile(String email) {
        User user = findByEmail(email);

        UserProfileDto.UserProfileDtoBuilder builder = UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .telephone(user.getTelephone())
                .role(user.getRole())
                .photoUrl(user.getPhotoUrl())
                .mustChangePassword(user.isMustChangePassword());

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

    // ── UPDATE MY PROFILE ──────────────────────────────────────
    @Transactional
    public UserProfileDto updateMyProfile(String email, UpdateMyProfileRequest request) {
        User user = findByEmail(email);

        if (request.getPrenom()    != null) user.setPrenom(request.getPrenom());
        if (request.getNom()       != null) user.setNom(request.getNom());
        if (request.getTelephone() != null) user.setTelephone(request.getTelephone());
        if (request.getAdresse()   != null) user.setAdresse(request.getAdresse());

        userRepository.save(user);

        if ("COMPANION".equals(user.getRole())) {
            Accompagnateur acc = accompagnateurRepository.findById(user.getId())
                    .orElseGet(() -> {
                        Accompagnateur a = new Accompagnateur();
                        a.setUser(user);
                        a.setId(user.getId());
                        return a;
                    });

            if (request.getTelephoneProfessionnel() != null)
                acc.setTelephoneProfessionnel(request.getTelephoneProfessionnel());

            if (request.getDateEmbauche() != null && !request.getDateEmbauche().isBlank()) {
                try { acc.setDateEmbauche(LocalDate.parse(request.getDateEmbauche())); }
                catch (Exception ignored) {}
            }

            if (request.getAnneesExperience() != null)
                acc.setAnneesExperience(request.getAnneesExperience());

            accompagnateurRepository.save(acc);
        }

        return getMyProfile(email);
    }
    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = findByEmail(email);

        if (!user.isMustChangePassword()) {
            if (currentPassword == null || currentPassword.isBlank() ||
                    !passwordEncoder.matches(currentPassword, user.getPassword())) {
                throw new IllegalArgumentException("Current password is incorrect.");
            }
        }

        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password is required.");
        }
        if (newPassword.length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    // ── UPLOAD PHOTO ───────────────────────────────────────────
    public String uploadPhoto(String email, MultipartFile file) throws IOException {
        if (file.getSize() > 2L * 1024 * 1024)
            throw new IllegalArgumentException("File too large. Maximum 2 MB.");
        String mime = file.getContentType();
        if (mime == null || !mime.startsWith("image/"))
            throw new IllegalArgumentException("Only image files are allowed.");

        User user = findByEmail(email);
        Path dir = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(dir);
        deleteOldPhoto(user);

        String ext = getExtension(file.getOriginalFilename());
        String filename = "profile_" + user.getId() + "_"
                + System.currentTimeMillis() + ext;
        file.transferTo(dir.resolve(filename).toFile());

        String photoUrl = "/uploads/profiles/" + filename;
        user.setPhotoUrl(photoUrl);
        userRepository.save(user);
        return photoUrl;
    }

    // ── DELETE PHOTO ───────────────────────────────────────────
    public void deletePhoto(String email) {
        User user = findByEmail(email);
        deleteOldPhoto(user);
        user.setPhotoUrl(null);
        userRepository.save(user);
    }

    // ── PRIVATE ────────────────────────────────────────────────
    private User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));
    }
    private void deleteOldPhoto(User user) {
        if (user.getPhotoUrl() == null) return;
        String filename = Paths.get(user.getPhotoUrl()).getFileName().toString();
        Path filePath = Paths.get(uploadDir).toAbsolutePath().resolve(filename);
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) { }
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot).toLowerCase() : ".jpg";
    }
}