import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../widgets/app_gradient_background.dart';
import '../core/app_colors.dart';
import '../models/user_model.dart';
import '../services/profile_service.dart';
import '../utils/constants.dart';

class ProfileScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const ProfileScreen({
    super.key,
    required this.onLogout,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ProfileService _profileService = ProfileService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  late Future<UserModel> _userFuture;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    _userFuture = _profileService.getCurrentUser();
  }

  Future<void> _refreshProfile() async {
    setState(() {
      _userFuture = _profileService.getCurrentUser();
    });
  }

  Future<void> _confirmLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Logout'),
          content: const Text('Are you sure you want to logout?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.sosRed,
                foregroundColor: Colors.white,
              ),
              child: const Text('Logout'),
            ),
          ],
        );
      },
    );

    if (shouldLogout == true) {
      await _logout();
    }
  }

  Future<void> _logout() async {
    setState(() {
      _isLoggingOut = true;
    });

    await _storage.delete(key: AppConstants.tokenKey);
    await _storage.delete(key: AppConstants.roleKey);
    await _storage.delete(key: AppConstants.userIdKey);

    if (!mounted) return;

    widget.onLogout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: AppGradientBackground(
        child: SafeArea(
          child: FutureBuilder<UserModel>(
            future: _userFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return const Center(
                  child: Text(
                    'Unable to load profile',
                    style: TextStyle(
                      color: AppColors.textDark,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                );
              }

              final user = snapshot.data ?? UserModel.mock();

              return RefreshIndicator(
                onRefresh: _refreshProfile,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: MediaQuery.of(context).size.height,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 16,
                      ),
                      child: Column(
                        children: [
                          const SizedBox(height: 18),

                          Semantics(
                            header: true,
                            child: Text(
                              'My Profile',
                              style: TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                          ),

                          const SizedBox(height: 8),

                          const Text(
                            'Your personal information',
                            style: TextStyle(
                              fontSize: 16,
                              color: AppColors.textGrey,
                            ),
                          ),

                          const SizedBox(height: 24),

                          Semantics(
                            label: 'User profile picture',
                            child: CircleAvatar(
                              radius: 68,
                              backgroundColor: AppColors.navigationSoft,
                              child: const Icon(
                                Icons.person,
                                size: 78,
                                color: AppColors.primaryLight,
                              ),
                            ),
                          ),

                          const SizedBox(height: 18),

                          Text(
                            user.fullName.isEmpty ? 'User' : user.fullName,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textDark,
                            ),
                          ),

                          const SizedBox(height: 22),

                          Container(
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 10,
                                  offset: Offset(0, 5),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                _ProfileItem(
                                  icon: Icons.person_outline,
                                  label: 'Full Name',
                                  value: user.fullName,
                                ),
                                const Divider(height: 1),
                                _ProfileItem(
                                  icon: Icons.email_outlined,
                                  label: 'Email',
                                  value: user.email,
                                ),
                                const Divider(height: 1),
                                _ProfileItem(
                                  icon: Icons.phone_in_talk_outlined,
                                  label: 'Emergency Phone',
                                  value: user.telephone,
                                ),
                                const Divider(height: 1),
                                _ProfileItem(
                                  icon: Icons.bloodtype_outlined,
                                  label: 'Blood Type',
                                  value: user.bloodType,
                                ),
                                const Divider(height: 1),
                                _ProfileItem(
                                  icon: Icons.remove_red_eye_outlined,
                                  label: 'Visual Impairment Level',
                                  value: user.visualImpairmentLevel,
                                ),
                                const Divider(height: 1),
                                _ProfileItem(
                                  icon: Icons.verified_user_outlined,
                                  label: 'Role',
                                  value: user.role,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),

                          Semantics(
                            button: true,
                            label: 'Logout from AssistWalk',
                            child: SizedBox(
                              width: double.infinity,
                              height: 56,
                              child: ElevatedButton.icon(
                                onPressed:
                                _isLoggingOut ? null : _confirmLogout,
                                icon: _isLoggingOut
                                    ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                                    : const Icon(Icons.logout),
                                label: Text(
                                  _isLoggingOut ? 'Logging out...' : 'Logout',
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.sosRed,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(28),
                                  ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ProfileItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: ${value.isEmpty ? '-' : value}',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: AppColors.navigationSoft,
              child: Icon(icon, color: AppColors.primaryLight),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
              ),
            ),
            Flexible(
              child: Text(
                value.isEmpty ? '-' : value,
                textAlign: TextAlign.right,
                style: const TextStyle(
                  fontSize: 15,
                  color: AppColors.textDark,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}