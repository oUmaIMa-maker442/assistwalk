# ─── Build stage ──────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
RUN ./mvnw -B -q -DskipTests package

# ─── Runtime stage ────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/uploads/profiles && chown -R app:app /app

USER app
EXPOSE 8081

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8081/actuator/health | grep -q UP || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
