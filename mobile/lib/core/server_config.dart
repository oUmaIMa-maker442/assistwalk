class ServerConfig {
  // IP du PC Spring Boot
  static const String pcIp = '100.91.177.99';
  // Flask
  static const String pcIpf = '100.91.177.163';

  // Backend Spring Boot
  static const String springPort = '8081';

  // Backend Flask navigation
  static const String flaskPort = '5001';

  static String get springBaseUrl => 'http://$pcIp:$springPort';

  static String get flaskBaseUrl => 'http://$pcIpf:$flaskPort';

  // 🔥 OCR
  static String get ocrBaseUrl => "http://$pcIpf:8000";
}