import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../core/server_config.dart';
import '../models/user_model.dart';
import '../utils/constants.dart';

class ProfileService {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ProfileService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ServerConfig.springBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 20),
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: AppConstants.tokenKey);

          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          handler.next(options);
        },
      ),
    );
  }

  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get('/api/v1/users/me');
    return UserModel.fromJson(response.data);
  }

  Future<String> uploadPhoto(File imageFile) async {
    final fileName = imageFile.path.split('/').last;

    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        imageFile.path,
        filename: fileName,
      ),
    });

    final response = await _dio.post('/api/v1/users/me/photo', data: formData);

    return response.data['photoUrl'] as String;
  }

  Future<void> deletePhoto() async {
    await _dio.delete('/api/v1/users/me/photo');
  }
}