class AppConstants {
  //real phone
  static const String baseUrl = 'http://10.1.154.145:8081';
  //test emulateur
  //static const String baseUrl = 'http://10.0.2.2:8081';
  static const String loginEndpoint = '/auth/login';
  static const String sosEndpoint   = '/api/v1/alerts/sos';
  static const String ocrEndpoint   = '/api/v1/ocr/process';

  static const String tokenKey  = 'jwt_token';
  static const String roleKey   = 'user_role';
  static const String userIdKey = 'user_id';
}