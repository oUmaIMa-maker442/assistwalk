package com.assistwalk.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String  email;
    private String  nom;
    private String  prenom;
    private String  telephone;
    private String  adresse;
    private String  role;
    private String  password;
    private boolean forceReset; // true = générer un mot de passe temporaire
}