package com.assistwalk.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role;

    private String nom;
    private String prenom;
    private String telephone;
    private String adresse;

    @Column(name = "derniere_connexion")
    private LocalDateTime derniereConnexion;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = true;
    // ─────────────────────────────────────────────────────────

    @OneToOne(mappedBy = "user",
            fetch = FetchType.LAZY,
            optional = true,
            cascade = CascadeType.ALL)
    private Malvoyant malvoyant;
}