package com.assistwalk.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "accompagnateur")
@Data
@NoArgsConstructor
public class Accompagnateur {

    @Id
    private Long id;

    @Column(name = "telephone_professionnel")
    private String telephoneProfessionnel;

    @Column(name = "date_embauche")
    private LocalDate dateEmbauche;

    @Column(name = "annees_experience")
    private Integer anneesExperience;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id")
    private User user;
}
