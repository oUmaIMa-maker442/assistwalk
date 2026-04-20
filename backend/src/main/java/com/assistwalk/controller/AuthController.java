package com.assistwalk.controller;

import com.assistwalk.dto.LoginRequest;
import com.assistwalk.dto.LoginResponse;
import com.assistwalk.repository.UserRepository;
import com.assistwalk.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        System.out.println(">>> LOGIN : " + req.getEmail());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            req.getEmail(),
                            req.getPassword()
                    )
            );
            System.out.println(">>> SUCCES");
        } catch (BadCredentialsException e) {
            System.out.println(">>> BAD CREDENTIALS");
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            System.out.println(">>> ERREUR : " + e.getClass().getName());
            System.out.println(">>> MESSAGE : " + e.getMessage());
            return ResponseEntity.status(401).build();
        }

        var user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("Introuvable"));

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return ResponseEntity.ok(new LoginResponse(token, user.getRole(), user.getId()));
    }

}