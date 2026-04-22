import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';
import '../utils/constants.dart';

class AuthService {
  final ApiService _api = ApiService();
  final _storage = const FlutterSecureStorage();

  Future<bool> login(String email, String password) async {
    try {
      final response = await _api.login(email, password);

      final token = response['token'];

      if (token != null) {
        await _storage.write(key: AppConstants.tokenKey, value: token);
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: AppConstants.tokenKey);
    return token != null;
  }
}