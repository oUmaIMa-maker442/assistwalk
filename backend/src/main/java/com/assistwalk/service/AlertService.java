package com.assistwalk.service;

import com.assistwalk.dto.SosRequest;
import com.assistwalk.dto.SosResponse;
import com.assistwalk.model.Alert;
import com.assistwalk.model.User;
import com.assistwalk.repository.AlertRepository;
import com.assistwalk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;

    public SosResponse createSosAlert(String email, SosRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + email));

        Alert alert = new Alert();
        alert.setUserId(user.getId());
        alert.setLatitude(req.getLatitude());
        alert.setLongitude(req.getLongitude());
        alert.setObstacleType(req.getObstacleType());

        Alert saved = alertRepository.save(alert);
        return new SosResponse(saved.getId(), saved.getStatus(), saved.getCreatedAt());
    }
}