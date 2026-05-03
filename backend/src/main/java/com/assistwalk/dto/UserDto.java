// src/main/java/com/assistwalk/dto/UserDto.java
package com.assistwalk.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDto {
    private Long   id;
    private String email;
    private String role;
    private String nom;
    private String prenom;
    private String telephone;
}