// src/main/java/com/assistwalk/service/AdminAssociationService.java
package com.assistwalk.service;

import com.assistwalk.dto.AssociationDto;
import com.assistwalk.dto.AssociationRequest;
import com.assistwalk.exception.ResourceNotFoundException;
import com.assistwalk.model.Association;
import com.assistwalk.repository.AssociationRepository;
import com.assistwalk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminAssociationService {

    private final AssociationRepository associationRepository;
    private final UserRepository        userRepository;

    public List<AssociationDto> getAllAssociations() {
        return associationRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public AssociationDto createAssociation(AssociationRequest request) {

        // Vérifier que les deux utilisateurs existent
        if (!userRepository.existsById(request.getMalvoyantId())) {
            throw new ResourceNotFoundException(
                    "Malvoyant introuvable : "
                            + request.getMalvoyantId());
        }
        if (!userRepository.existsById(request.getAccompagnateurId())) {
            throw new ResourceNotFoundException(
                    "Accompagnateur introuvable : "
                            + request.getAccompagnateurId());
        }

        // Vérifier qu'une association identique n'existe pas déjà
        if (associationRepository.existsByMalvoyantIdAndAccompagnateurId(
                request.getMalvoyantId(),
                request.getAccompagnateurId())) {
            throw new IllegalStateException(
                    "Cette association existe déjà");
        }

        Association assoc = new Association();
        assoc.setMalvoyantId(request.getMalvoyantId());
        assoc.setAccompagnateurId(request.getAccompagnateurId());
        Association saved = associationRepository.save(assoc);

        log.info("[ADMIN] Association créée : malvoyant={} companion={}",
                request.getMalvoyantId(), request.getAccompagnateurId());

        return toDto(saved);
    }

    @Transactional
    public void deleteAssociation(Long id) {
        if (!associationRepository.existsById(id)) {
            throw new ResourceNotFoundException(
                    "Association introuvable : " + id);
        }
        associationRepository.deleteById(id);
        log.info("[ADMIN] Association supprimée : id={}", id);
    }

    private AssociationDto toDto(Association a) {
        // Récupérer les emails pour l'affichage côté React
        String malvoyantEmail = userRepository.findById(a.getMalvoyantId())
                .map(u -> u.getEmail()).orElse("inconnu");
        String companionEmail = userRepository
                .findById(a.getAccompagnateurId())
                .map(u -> u.getEmail()).orElse("inconnu");

        return AssociationDto.builder()
                .id(a.getId())
                .malvoyantId(a.getMalvoyantId())
                .malvoyantEmail(malvoyantEmail)
                .accompagnateurId(a.getAccompagnateurId())
                .accompagnateurEmail(companionEmail)
                .createdAt(a.getCreatedAt())
                .build();
    }
}