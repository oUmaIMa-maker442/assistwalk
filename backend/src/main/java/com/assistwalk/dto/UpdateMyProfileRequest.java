package com.assistwalk.dto;

import lombok.Data;

@Data
public class UpdateMyProfileRequest {
    // Personal
    private String prenom;
    private String nom;
    private String telephone;
    private String adresse;

    // Companion-specific
    private String  telephoneProfessionnel;
    private String  dateEmbauche;        // ISO string yyyy-MM-dd from frontend
    private Integer anneesExperience;
}
