import 'package:dio/dio.dart';
import '../core/server_config.dart';

class OcrApiService {
  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ServerConfig.ocrBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 90),
      sendTimeout: const Duration(seconds: 30),
    ),
  );

  Future<Map<String, dynamic>> extractText(String imagePath) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(
        imagePath,
        filename: 'photo.jpg',
      ),
    });

    final response = await _dio.post(
      '/extract',
      data: formData,
    );

    return Map<String, dynamic>.from(response.data);
  }
}