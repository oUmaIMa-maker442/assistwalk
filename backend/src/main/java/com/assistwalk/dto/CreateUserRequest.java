// src/main/java/com/assistwalk/dto/CreateUserRequest.java
package com.assistwalk.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateUserRequest {

    @Email(message = "Format email invalide")
    @NotBlank(message = "Email requis")
    private String email;

    @NotBlank(message = "Mot de passe requis")
    private String password;

    @NotBlank(message = "Rôle requis")
    @Pattern(regexp = "VISUAL_IMPAIRED|COMPANION|ADMIN",
            message = "Rôle invalide")
    private String role;

    private String nom;
    private String prenom;
    private String telephone;
}