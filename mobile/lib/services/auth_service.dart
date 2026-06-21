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
      final role = response['role'];
      final userId = response['userId'];

      if (token != null) {
        await _storage.write(
          key: AppConstants.tokenKey,
          value: token.toString(),
        );

        if (role != null) {
          await _storage.write(
            key: AppConstants.roleKey,
            value: role.toString(),
          );
        }

        if (userId != null) {
          await _storage.write(
            key: AppConstants.userIdKey,
            value: userId.toString(),
          );
        }

        return true;
      }

      return false;
    } catch (e, stackTrace) {
        print('LOGIN ERROR = $e');
        print(stackTrace);
        return false;
      }
  }

  Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenKey);
    await _storage.delete(key: AppConstants.roleKey);
    await _storage.delete(key: AppConstants.userIdKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: AppConstants.tokenKey);
    return token != null && token.isNotEmpty;
  }
}