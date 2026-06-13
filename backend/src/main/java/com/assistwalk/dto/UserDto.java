package com.assistwalk.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class UserDto {
    private Long          id;
    private String        email;
    private String        role;
    private String        nom;
    private String        prenom;
    private String        telephone;
    private String        adresse;
    private String        photoUrl;
    private boolean       mustChangePassword;
    private LocalDateTime derniereConnexion;
    private LocalDateTime createdAt;
}