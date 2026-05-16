package com.assistwalk.controller;

import com.assistwalk.dto.UserProfileDto;
import com.assistwalk.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();

        return ResponseEntity.ok(
                userService.getMyProfile(email)
        );
    }
}