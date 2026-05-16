package com.assistwalk.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    // Champs ajoutés par la migration V3__enrich_schema.sql
    private String nom;
    private String prenom;
    private String telephone;
    private String adresse;

    @Column(name = "derniere_connexion")
    private LocalDateTime derniereConnexion;

    @OneToOne(mappedBy = "user",
            fetch = FetchType.LAZY,
            optional = true,
            cascade = CascadeType.ALL)
    private Malvoyant malvoyant;
}