package com.assistwalk.repository;

import com.assistwalk.model.Malvoyant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MalvoyantRepository
        extends JpaRepository<Malvoyant, Long> {
}