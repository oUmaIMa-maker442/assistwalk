import '../models/user_model.dart';

class ProfileService {
  Future<UserModel> getCurrentUser() async {
    await Future.delayed(const Duration(milliseconds: 500));

    // Temporaire jusqu'à ce que Dev B ajoute GET /api/v1/users/me
    return UserModel.mock();
  }
}