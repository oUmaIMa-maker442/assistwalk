class ServerConfig {
  // IP du PC où Spring Boot et Flask sont lancés
  static const String pcIp = '192.168.1.6';

  // Backend Spring Boot
  static const String springPort = '8081';

  // Backend Flask navigation
  static const String flaskPort = '5001';

  static String get springBaseUrl => 'http://$pcIp:$springPort';

  static String get flaskBaseUrl => 'http://$pcIp:$flaskPort';
}