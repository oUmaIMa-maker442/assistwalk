import 'dart:io';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../core/server_config.dart';

class NavigationApiService {
  final Dio _dio = Dio();

  final String baseUrl = ServerConfig.flaskBaseUrl;

  Future<String> analyzeImage(File imageFile) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(
        imageFile.path,
        filename: 'frame.jpg',
      ),
    });

    final response = await _dio.post(
      '$baseUrl/navigation/detect',
      data: formData,
    );

    return response.data.toString();
  }

  Future<String> analyzeImageBytes(Uint8List imageBytes) async {
    final formData = FormData.fromMap({
      'image': MultipartFile.fromBytes(
        imageBytes,
        filename: 'frame.jpg',
      ),
    });

    final response = await _dio.post(
      '$baseUrl/navigation/detect',
      data: formData,
    );

    return response.data.toString();
  }
}