package com.assistwalk.dto;

import lombok.Data;

@Data
public class ChangePasswordRequest {
    private String currentPassword;   // null si premier login (mot de passe temporaire)
    private String newPassword;
    private String confirmPassword;
}