package com.assistwalk.config;

import com.assistwalk.model.*;
import com.assistwalk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Seeds the database with realistic AssistWalk data on first launch.
 * Skipped if VI users already exist.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final UserRepository            userRepo;
    private final MalvoyantRepository       malvoyantRepo;
    private final AccompagnateurRepository  accompRepo;
    private final AssociationRepository     assocRepo;
    private final AlertRepository           alertRepo;
    private final PasswordEncoder           encoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        boolean alreadySeeded = userRepo.findByEmail("rajaa.bensalah@assistwalk.ma").isPresent();
        if (alreadySeeded) {
            log.info("[SEED] Demo data already present — skipping seed.");
            return;
        }
        log.info("[SEED] Seeding demo data…");
        seed();
        log.info("[SEED] Done — password for all demo accounts: Assist@2024");
    }

    private void seed() {

        String pwd = encoder.encode("Assist@2024");
        LocalDateTime now = LocalDateTime.now();

        // ── COMPANIONS ────────────────────────────────────────────────

        User rajaa = user("rajaa.bensalah@assistwalk.ma", pwd, "COMPANION",
                "Bensalah", "Rajaa", "+212661112233", "Rabat, Maroc",
                now.minusDays(60), now.minusHours(2));
        User karim = user("karim.idrissi@assistwalk.ma", pwd, "COMPANION",
                "Idrissi", "Karim", "+212662223344", "Casablanca, Maroc",
                now.minusDays(45), now.minusHours(5));
        User sara = user("sara.elmansouri@assistwalk.ma", pwd, "COMPANION",
                "El Mansouri", "Sara", "+212663334455", "Marrakech, Maroc",
                now.minusDays(30), now.minusDays(1));

        rajaa = userRepo.save(rajaa);
        karim = userRepo.save(karim);
        sara  = userRepo.save(sara);

        // Accompagnateur profiles
        accomp(rajaa, "+212661119900", "2021-03-15", 4);
        accomp(karim, "+212662229911", "2020-09-01", 6);
        accomp(sara,  "+212663339922", "2022-06-01", 2);

        // ── VISUALLY IMPAIRED USERS ───────────────────────────────────

        User fatima  = user("fatima.chraibi@assistwalk.ma", pwd, "VISUAL_IMPAIRED",
                "Chraibi", "Fatima Zahra", "+212664445566", "Rabat, Agdal",
                now.minusDays(55), now.minusMinutes(40));
        User ahmed   = user("ahmed.benali@assistwalk.ma", pwd, "VISUAL_IMPAIRED",
                "Benali", "Ahmed", "+212665556677", "Casablanca, Maarif",
                now.minusDays(40), now.minusHours(3));
        User nadia   = user("nadia.skalli@assistwalk.ma", pwd, "VISUAL_IMPAIRED",
                "Skalli", "Nadia", "+212666667788", "Rabat, Hassan",
                now.minusDays(38), now.minusHours(1));
        User youssef = user("youssef.elalaoui@assistwalk.ma", pwd, "VISUAL_IMPAIRED",
                "El Alaoui", "Youssef", "+212667778899", "Casablanca, Ain Diab",
                now.minusDays(25), now.minusHours(8));
        User imane   = user("imane.berrada@assistwalk.ma", pwd, "VISUAL_IMPAIRED",
                "Berrada", "Imane", "+212668889900", "Marrakech, Gueliz",
                now.minusDays(20), now.minusDays(2));
        User omar    = user("omar.fassi@assistwalk.ma", pwd, "VISUAL_IMPAIRED",
                "Fassi", "Omar", "+212669990011", "Fès, Médina",
                now.minusDays(15), now.minusHours(6));

        fatima  = userRepo.save(fatima);
        ahmed   = userRepo.save(ahmed);
        nadia   = userRepo.save(nadia);
        youssef = userRepo.save(youssef);
        imane   = userRepo.save(imane);
        omar    = userRepo.save(omar);

        // Malvoyant profiles
        malvoyant(fatima,  "+212664440001", "A+",  "severe");
        malvoyant(ahmed,   "+212665550002", "B+",  "partial");
        malvoyant(nadia,   "+212666660003", "O+",  "total");
        malvoyant(youssef, "+212667770004", "AB+", "severe");
        malvoyant(imane,   "+212668880005", "A-",  "partial");
        malvoyant(omar,    "+212669990006", "O-",  "total");

        // ── ASSOCIATIONS ──────────────────────────────────────────────

        assoc(fatima,  rajaa, now.minusDays(54));
        assoc(nadia,   rajaa, now.minusDays(37));
        assoc(nadia,   karim, now.minusDays(30)); // nadia has 2 companions
        assoc(ahmed,   karim, now.minusDays(39));
        assoc(youssef, karim, now.minusDays(24));
        assoc(imane,   sara,  now.minusDays(19));
        assoc(omar,    sara,  now.minusDays(14));

        // ── ALERTS — Fatima (Rabat) ───────────────────────────────────

        alert(fatima.getId(), "stairs",           34.0128, -6.8326, "RESOLVED",
              now.minusDays(50).withHour(9).withMinute(14),
              now.minusDays(50).withHour(9).withMinute(28));

        alert(fatima.getId(), "door",             34.0237, -6.8225, "RESOLVED",
              now.minusDays(42).withHour(14).withMinute(5),
              now.minusDays(42).withHour(14).withMinute(19));

        alert(fatima.getId(), "metallic_barrier", 33.9778, -6.8594, "RESOLVED",
              now.minusDays(35).withHour(10).withMinute(33),
              now.minusDays(35).withHour(10).withMinute(52));

        alert(fatima.getId(), "tree",             34.0090, -6.8400, "RESOLVED",
              now.minusDays(28).withHour(8).withMinute(47),
              now.minusDays(28).withHour(8).withMinute(59));

        alert(fatima.getId(), "stairs",           34.0128, -6.8330, "RESOLVED",
              now.minusDays(14).withHour(17).withMinute(20),
              now.minusDays(14).withHour(17).withMinute(35));

        alert(fatima.getId(), "pothole",          34.0145, -6.8310, "RESOLVED",
              now.minusDays(7).withHour(11).withMinute(0),
              now.minusDays(7).withHour(11).withMinute(12));

        alert(fatima.getId(), "car",              34.0100, -6.8350, "ACTIVE",
              now.minusMinutes(38), null);

        // ── ALERTS — Ahmed (Casablanca) ───────────────────────────────

        alert(ahmed.getId(), "stairs",           33.5929, -7.6197, "RESOLVED",
              now.minusDays(38).withHour(8).withMinute(30),
              now.minusDays(38).withHour(8).withMinute(48));

        alert(ahmed.getId(), "barrier",          33.5913, -7.6392, "RESOLVED",
              now.minusDays(32).withHour(12).withMinute(15),
              now.minusDays(32).withHour(12).withMinute(31));

        alert(ahmed.getId(), "door",             33.5877, -7.6269, "RESOLVED",
              now.minusDays(25).withHour(19).withMinute(40),
              now.minusDays(25).withHour(19).withMinute(55));

        alert(ahmed.getId(), "tree",             33.5889, -7.6669, "RESOLVED",
              now.minusDays(18).withHour(7).withMinute(55),
              now.minusDays(18).withHour(8).withMinute(10));

        alert(ahmed.getId(), "metallic_barrier", 33.5815, -7.6783, "RESOLVED",
              now.minusDays(10).withHour(15).withMinute(22),
              now.minusDays(10).withHour(15).withMinute(44));

        alert(ahmed.getId(), "pothole",          33.5900, -7.6200, "ACTIVE",
              now.minusHours(3), null);

        // ── ALERTS — Nadia (Rabat) ────────────────────────────────────

        alert(nadia.getId(), "stairs",           34.0200, -6.8400, "RESOLVED",
              now.minusDays(36).withHour(6).withMinute(50),
              now.minusDays(36).withHour(7).withMinute(4));

        alert(nadia.getId(), "car",              34.0050, -6.8500, "RESOLVED",
              now.minusDays(29).withHour(20).withMinute(10),
              now.minusDays(29).withHour(20).withMinute(22));

        alert(nadia.getId(), "door",             34.0150, -6.8450, "RESOLVED",
              now.minusDays(22).withHour(13).withMinute(30),
              now.minusDays(22).withHour(13).withMinute(41));

        alert(nadia.getId(), "barrier",          34.0070, -6.8380, "RESOLVED",
              now.minusDays(12).withHour(9).withMinute(18),
              now.minusDays(12).withHour(9).withMinute(33));

        alert(nadia.getId(), "stairs",           34.0180, -6.8290, "ACTIVE",
              now.minusHours(1), null);

        // ── ALERTS — Youssef (Casablanca) ─────────────────────────────

        alert(youssef.getId(), "stairs",           33.5815, -7.6783, "RESOLVED",
              now.minusDays(23).withHour(8).withMinute(5),
              now.minusDays(23).withHour(8).withMinute(21));

        alert(youssef.getId(), "metallic_barrier", 33.5860, -7.6600, "RESOLVED",
              now.minusDays(17).withHour(18).withMinute(45),
              now.minusDays(17).withHour(19).withMinute(3));

        alert(youssef.getId(), "tree",             33.5920, -7.6100, "RESOLVED",
              now.minusDays(9).withHour(10).withMinute(50),
              now.minusDays(9).withHour(11).withMinute(8));

        alert(youssef.getId(), "pothole",          33.5870, -7.6350, "RESOLVED",
              now.minusDays(4).withHour(16).withMinute(30),
              now.minusDays(4).withHour(16).withMinute(48));

        alert(youssef.getId(), "car",              33.5840, -7.6480, "ACTIVE",
              now.minusMinutes(20), null);

        // ── ALERTS — Imane (Marrakech) ────────────────────────────────

        alert(imane.getId(), "stairs",   31.6258, -7.9892, "RESOLVED",
              now.minusDays(19).withHour(9).withMinute(0),
              now.minusDays(19).withHour(9).withMinute(17));

        alert(imane.getId(), "barrier",  31.6417, -8.0030, "RESOLVED",
              now.minusDays(13).withHour(14).withMinute(22),
              now.minusDays(13).withHour(14).withMinute(38));

        alert(imane.getId(), "door",     31.6355, -8.0145, "RESOLVED",
              now.minusDays(8).withHour(11).withMinute(10),
              now.minusDays(8).withHour(11).withMinute(24));

        alert(imane.getId(), "tree",     31.6290, -7.9950, "RESOLVED",
              now.minusDays(3).withHour(7).withMinute(40),
              now.minusDays(3).withHour(7).withMinute(53));

        // ── ALERTS — Omar (Fès) ───────────────────────────────────────

        alert(omar.getId(), "stairs",           34.0638, -4.9727, "RESOLVED",
              now.minusDays(14).withHour(8).withMinute(25),
              now.minusDays(14).withHour(8).withMinute(44));

        alert(omar.getId(), "metallic_barrier", 34.0618, -4.9716, "RESOLVED",
              now.minusDays(10).withHour(18).withMinute(5),
              now.minusDays(10).withHour(18).withMinute(23));

        alert(omar.getId(), "door",             34.0650, -4.9740, "RESOLVED",
              now.minusDays(6).withHour(10).withMinute(30),
              now.minusDays(6).withHour(10).withMinute(48));

        alert(omar.getId(), "pothole",          34.0600, -4.9700, "RESOLVED",
              now.minusDays(2).withHour(15).withMinute(15),
              now.minusDays(2).withHour(15).withMinute(32));

        alert(omar.getId(), "barrier",          34.0625, -4.9730, "ACTIVE",
              now.minusHours(6), null);
    }

    // ── Builder helpers ───────────────────────────────────────────────

    private User user(String email, String pwd, String role,
                      String nom, String prenom, String tel, String adresse,
                      LocalDateTime ignoredCreatedAt, LocalDateTime lastLogin) {
        // Note: createdAt is managed by @CreationTimestamp — set to NOW() by Hibernate
        User u = new User();
        u.setEmail(email);
        u.setPassword(pwd);
        u.setRole(role);
        u.setNom(nom);
        u.setPrenom(prenom);
        u.setTelephone(tel);
        u.setAdresse(adresse);
        u.setMustChangePassword(false);
        u.setDerniereConnexion(lastLogin);
        return u;
    }

    private void malvoyant(User u, String urgence, String blood, String level) {
        Malvoyant m = new Malvoyant();
        m.setUser(u);   // @MapsId derives the PK from the User automatically
        m.setTelephoneUrgence(urgence);
        m.setGroupeSanguin(blood);
        m.setNiveauDeficience(level);
        malvoyantRepo.save(m);
    }

    private void accomp(User u, String proPhone, String hireDate, int years) {
        Accompagnateur a = new Accompagnateur();
        a.setUser(u);   // @MapsId derives the PK from the User automatically
        a.setTelephoneProfessionnel(proPhone);
        a.setAnneesExperience(years);
        try { a.setDateEmbauche(LocalDate.parse(hireDate)); } catch (Exception ignored) {}
        accompRepo.save(a);
    }

    private void assoc(User vi, User comp, LocalDateTime createdAt) {
        if (assocRepo.existsByMalvoyantIdAndAccompagnateurId(vi.getId(), comp.getId())) return;
        Association a = new Association();
        a.setMalvoyantId(vi.getId());
        a.setAccompagnateurId(comp.getId());
        a.setCreatedAt(createdAt);
        assocRepo.save(a);
    }

    private void alert(Long userId, String obstacleType,
                       double lat, double lon,
                       String status, LocalDateTime createdAt, LocalDateTime resolvedAt) {
        Alert a = new Alert();
        a.setUserId(userId);
        a.setObstacleType(obstacleType);
        a.setLatitude(lat);
        a.setLongitude(lon);
        a.setStatus(status);
        a.setCreatedAt(createdAt);
        a.setResolvedAt(resolvedAt);
        alertRepo.save(a);
    }
}
