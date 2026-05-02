import '../core/server_config.dart';

class AppConstants {
  // Spring Boot backend
  static String get baseUrl => ServerConfig.springBaseUrl;

  static const String loginEndpoint = '/auth/login';
  static const String sosEndpoint = '/api/v1/alerts/sos';
  static const String ocrEndpoint = '/api/v1/ocr/process';

  static const String tokenKey = 'jwt_token';
  static const String roleKey = 'user_role';
  static const String userIdKey = 'user_id';
}