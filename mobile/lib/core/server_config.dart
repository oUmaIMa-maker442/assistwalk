class ServerConfig {
  // Hote unique du gateway Nginx (port 80) qui route vers tous les
  // services (Spring Boot, Flask navigation, OCR FastAPI).
  // Dev local : --dart-define=GATEWAY_HOST=192.168.1.50
  // VPS/Cloud : --dart-define=GATEWAY_HOST=api.assistwalk.ma --dart-define=GATEWAY_SCHEME=https
  static const String gatewayHost = String.fromEnvironment(
    'GATEWAY_HOST',
    defaultValue: '100.91.177.99',
  );

  static const String scheme = String.fromEnvironment(
    'GATEWAY_SCHEME',
    defaultValue: 'http',
  );

  static String get _origin => '$scheme://$gatewayHost';

  // Backend Spring Boot : /auth, /api/v1/*, /uploads/*, /ws
  static String get springBaseUrl => _origin;

  // Backend Flask navigation : appelle deja '$flaskBaseUrl/navigation/detect'
  static String get flaskBaseUrl => _origin;

  // OCR FastAPI : appelle '$ocrBaseUrl/extract' -> gateway retire le prefixe /ocr
  static String get ocrBaseUrl => '$_origin/ocr';
}
