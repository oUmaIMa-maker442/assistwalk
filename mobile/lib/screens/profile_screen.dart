import 'package:flutter/material.dart';
import '../widgets/app_gradient_background.dart';
import '../core/app_colors.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: AppGradientBackground(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    children: [
                      const SizedBox(height: 18),
                      const Text(
                        'My Profile',
                        style: TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textDark,
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
                      CircleAvatar(
                        radius: 68,
                        backgroundColor: AppColors.navigationSoft,
                        child: const Icon(Icons.person, size: 78, color: AppColors.primaryLight),
                      ),
                      const SizedBox(height: 18),
                      const Text(
                        'Yassine El Amrani',
                        style: TextStyle(
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
                        child: const Column(
                          children: [
                            _ProfileItem(
                              icon: Icons.person_outline,
                              label: 'Full Name',
                              value: 'Yassine El Amrani',
                            ),
                            Divider(height: 1),
                            _ProfileItem(
                              icon: Icons.phone_in_talk_outlined,
                              label: 'Emergency Phone',
                              value: '+212 6 12 34 56 78',
                            ),
                            Divider(height: 1),
                            _ProfileItem(
                              icon: Icons.bloodtype_outlined,
                              label: 'Blood Type',
                              value: 'O+',
                            ),
                            Divider(height: 1),
                            _ProfileItem(
                              icon: Icons.remove_red_eye_outlined,
                              label: 'Visual Impairment Level',
                              value: 'Severe Impairment',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            );
          },
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
    return Padding(
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
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.textDark,
              ),
            ),
          ),
        ],
      ),
    );
  }
}