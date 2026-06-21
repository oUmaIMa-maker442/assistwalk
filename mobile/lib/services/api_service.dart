import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';

class ApiService {
  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
    ));

    // Intercepteur : ajoute automatiquement le token JWT
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: AppConstants.tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  // Login
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post(
      AppConstants.loginEndpoint,
      data: {
        'email': email,
        'password': password,
      },
    );

    print('LOGIN RESPONSE = ${response.data}');
    return Map<String, dynamic>.from(response.data);
  }

  // SOS
  Future<Map<String, dynamic>> sendSos(double lat, double lng, String? obstacleType) async {
    final response = await _dio.post(
      AppConstants.sosEndpoint,
      data: {
        'latitude': lat,
        'longitude': lng,
        'obstacleType': obstacleType,
      },
    );
    return response.data;
  }

  // OCR (sera active quand Dev A finit la Phase 2)
  Future<Map<String, dynamic>> extractText(String imagePath) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(imagePath, filename: 'photo.jpg'),
    });
    final response = await _dio.post(
      AppConstants.ocrEndpoint,
      data: formData,
    );
    return response.data;
  }
}