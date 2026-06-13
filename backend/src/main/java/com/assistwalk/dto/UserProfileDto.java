package com.assistwalk.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserProfileDto {
    private Long    id;
    private String  email;
    private String  nom;
    private String  prenom;
    private String  telephone;
    private String  adresse;
    private String  role;
    private String  photoUrl;
    private boolean mustChangePassword; // ← manquait
    private LocalDateTime createdAt;
    private LocalDateTime derniereConnexion;
    // Malvoyant spécifique
    private String  telephoneUrgence;
    private String  groupeSanguin;
    private String  niveauDeficience;
    // Accompagnateur spécifique
    private String  telephoneProfessionnel;
    private String  dateEmbauche;
    private Integer anneesExperience;
}