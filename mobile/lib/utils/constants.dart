class AppConstants {
  // URL du backend Spring Boot
  static const String baseUrl = 'http://192.168.116.1:8081';
  // Note : 10.0.2.2 = localhost depuis l'émulateur Android
  // Sur appareil physique : mettre l'IP de votre ordinateur
  // ex: 'http://192.168.1.X:8081'

  // Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String sosEndpoint = '/api/v1/alerts/sos';
  static const String ocrEndpoint = '/api/v1/ocr/process';

  // Clés de stockage sécurisé
  static const String tokenKey = 'jwt_token';
  static const String roleKey = 'user_role';
  static const String userIdKey = 'user_id';
}