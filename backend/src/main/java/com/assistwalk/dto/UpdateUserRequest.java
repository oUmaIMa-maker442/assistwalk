// src/main/java/com/assistwalk/dto/UpdateUserRequest.java
package com.assistwalk.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String nom;
    private String prenom;
    private String telephone;
    private String adresse;
    // Le mot de passe et le rôle sont modifiables séparément
    // pour éviter les erreurs accidentelles
}