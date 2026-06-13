// src/main/java/com/assistwalk/dto/CreateUserRequest.java
package com.assistwalk.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateUserRequest {

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "VISUAL_IMPAIRED|COMPANION|ADMIN",
            message = "Invalid role")
    private String role;

    private String nom;
    private String prenom;
    private String telephone;
    private String adresse;

    // Visually impaired specific
    private String telephoneUrgence;
    private String groupeSanguin;
    private String niveauDeficience;

    // Companion specific
    private String  telephoneProfessionnel;
    private String  dateEmbauche;        // ISO string yyyy-MM-dd
    private Integer anneesExperience;
}