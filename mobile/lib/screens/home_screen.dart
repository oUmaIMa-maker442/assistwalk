import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../services/voice_command_service.dart';
import 'navigation_screen.dart';

class HomeScreen extends StatefulWidget {
  final Function(int) onNavigateTab;

  const HomeScreen({
    super.key,
    required this.onNavigateTab,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    VoiceCommandService.commandNotifier.addListener(_handleVoiceCommands);
  }

  void _handleVoiceCommands() {
    final command = VoiceCommandService.commandNotifier.value;
    if (command == null) return;

    if (command == 'start_navigation') {
      _openNavigation();
    }

    VoiceCommandService.clear();
  }

  void _openNavigation() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const NavigationScreen(),
      ),
    );
  }

  @override
  void dispose() {
    VoiceCommandService.commandNotifier.removeListener(_handleVoiceCommands);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6FAFF),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: Container(
                width: double.infinity,
                color: const Color(0xFFF6FAFF),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                  child: Column(
                    children: [
                      Expanded(
                        child: _featureCard(
                          context,
                          color: AppColors.navigationSoft,
                          icon: Icons.navigation,
                          iconColor: AppColors.primaryLight,
                          title: 'Navigation',
                          subtitle: 'Get audio guidance and navigate safely.',
                          onTap: _openNavigation,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Expanded(
                        child: _featureCard(
                          context,
                          color: AppColors.sosSoft,
                          icon: Icons.sos,
                          iconColor: AppColors.sosRed,
                          title: 'SOS',
                          subtitle: 'Send an emergency alert and get help.',
                          onTap: () {
                            widget.onNavigateTab(2);
                          },
                        ),
                      ),
                      const SizedBox(height: 14),
                      Expanded(
                        child: _featureCard(
                          context,
                          color: AppColors.scannerSoft,
                          icon: Icons.document_scanner_outlined,
                          iconColor: AppColors.scannerGreen,
                          title: 'Scanner',
                          subtitle:
                          'Scan the environment to detect objects and read text.',
                          onTap: () {
                            widget.onNavigateTab(1);
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return ClipPath(
      clipper: _WaveClipper(),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFD9ECFF),
              Color(0xFFEAF4FF),
            ],
          ),
        ),
        child: Column(
          children: [
            const SizedBox(height: 20),
            const Icon(
              Icons.blind,
              size: 48,
              color: AppColors.primary,
            ),
            const SizedBox(height: 8),
            const Text(
              'AssistWalk',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Navigate. Detect. Stay Safe.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textGrey,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Welcome back',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'How can we assist you today?',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textGrey,
              ),
            ),
          ],
        ),
      ),
    );
  }
  static Widget _featureCard(
      BuildContext context, {
        required Color color,
        required IconData icon,
        required Color iconColor,
        required String title,
        required String subtitle,
        required VoidCallback onTap,
      }) {
    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 8,
              offset: Offset(0, 5),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [iconColor.withOpacity(0.75), iconColor],
                ),
              ),
              child: Icon(
                icon,
                color: Colors.white,
                size: 30,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.25,
                      color: AppColors.textGrey,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: AppColors.primary,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}

class _WaveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();

    path.lineTo(0, size.height - 40);

    path.quadraticBezierTo(
      size.width * 0.25,
      size.height,
      size.width * 0.5,
      size.height - 20,
    );

    path.quadraticBezierTo(
      size.width * 0.75,
      size.height - 40,
      size.width,
      size.height - 10,
    );

    path.lineTo(size.width, 0);
    path.close();

    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}