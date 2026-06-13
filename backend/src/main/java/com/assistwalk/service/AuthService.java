package com.assistwalk.service;

import com.assistwalk.dto.LoginRequest;
import com.assistwalk.dto.LoginResponse;
import com.assistwalk.model.User;
import com.assistwalk.repository.UserRepository;
import com.assistwalk.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository        userRepository;
    private final JwtUtil               jwtUtil;

    @Value("${jwt.expiration-remember-ms}")
    private long rememberMeExpirationMs;

    /**
     * Authentifie l'utilisateur et retourne un token JWT.
     * Met à jour la dernière connexion.
     * Retourne mustChangePassword pour que le frontend redirige si nécessaire.
     */
    @Transactional
    public LoginResponse login(LoginRequest request) {

        // 1. Authentifier via Spring Security (vérifie email + password BCrypt)
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );

            log.info("[AUTH] Login successful for: {}", request.getEmail());

        } catch (BadCredentialsException e) {
            log.warn("[AUTH] Login failed for: {}", request.getEmail());
            throw new BadCredentialsException("Invalid email or password.");
        }

        // 2. Load user from DB
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found."));

        // 3. Mettre à jour la dernière connexion
        user.setDerniereConnexion(LocalDateTime.now());
        userRepository.save(user);

        // 4. Générer le token JWT (expiry selon rememberMe)
        long expiry = request.isRememberMe() ? rememberMeExpirationMs : 28800000L;
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole(), expiry);

        // 5. Retourner la réponse avec mustChangePassword
        return LoginResponse.builder()
                .token(token)
                .role(user.getRole())
                .userId(user.getId())
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }
}