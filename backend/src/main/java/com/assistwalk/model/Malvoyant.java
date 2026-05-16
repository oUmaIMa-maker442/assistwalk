package com.assistwalk.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "malvoyant")
@Data
@NoArgsConstructor
public class Malvoyant {

    @Id
    private Long id;

    private String telephoneUrgence;

    private String groupeSanguin;

    private String niveauDeficience;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id")
    private User user;
}
