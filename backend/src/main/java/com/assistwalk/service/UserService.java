package com.assistwalk.service;

import com.assistwalk.dto.UserProfileDto;
import com.assistwalk.model.Malvoyant;
import com.assistwalk.model.User;
import com.assistwalk.repository.MalvoyantRepository;
import com.assistwalk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MalvoyantRepository malvoyantRepository;

    public UserProfileDto getMyProfile(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("Utilisateur introuvable"));

        UserProfileDto.UserProfileDtoBuilder builder =
                UserProfileDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .nom(user.getNom())
                        .prenom(user.getPrenom())
                        .telephone(user.getTelephone())
                        .role(user.getRole());

        if ("VISUAL_IMPAIRED".equals(user.getRole())) {

            Malvoyant malvoyant =
                    malvoyantRepository.findById(user.getId()).orElse(null);

            if (malvoyant != null) {
                builder
                        .telephoneUrgence(malvoyant.getTelephoneUrgence())
                        .groupeSanguin(malvoyant.getGroupeSanguin())
                        .niveauDeficience(malvoyant.getNiveauDeficience());
            }
        }

        return builder.build();
    }
}