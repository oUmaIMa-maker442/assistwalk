package com.assistwalk.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

public class TestJwtHelper {

    // Doit correspondre exactement à la valeur de jwt.secret dans application.yml
    private static final String SECRET = "dev-secret-insecure-change-in-prod";

    private static final SecretKey KEY = Keys.hmacShaKeyFor(
            SECRET.getBytes(StandardCharsets.UTF_8)
    );

    /**
     * Génère un token JWT valide pour les tests d'intégration.
     * Le token expire dans 24 heures.
     */
    public static String generateToken(String email, String role) {
        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 86_400_000L))
                .signWith(KEY)
                .compact();
    }
}