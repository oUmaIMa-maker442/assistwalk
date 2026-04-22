import 'package:flutter/material.dart';
import '../widgets/app_gradient_background.dart';
import '../core/app_colors.dart';

class ScannerScreen extends StatefulWidget {
  final VoidCallback onBackToHome;

  const ScannerScreen({
    super.key,
    required this.onBackToHome,
  });

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  String extractedText = 'No text extracted yet.';

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
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    children: [
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _circleButton(
                            Icons.arrow_back_ios_new_rounded,
                            widget.onBackToHome,
                          ),
                          _circleButton(Icons.volume_up_outlined, () {}),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'AssistWalk',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Read. Understand. Assist.',
                        style: TextStyle(
                          fontSize: 15,
                          color: AppColors.textGrey,
                        ),
                      ),
                      const SizedBox(height: 18),

                      Container(
                        width: double.infinity,
                        height: 230,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Stack(
                          children: [
                            _corner(top: 14, left: 14),
                            _corner(top: 14, right: 14),
                            _corner(bottom: 14, left: 14),
                            _corner(bottom: 14, right: 14),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      SizedBox(
                        width: 190,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.camera_alt_outlined, size: 18),
                          label: const Text('Take a Photo'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryLight,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      Row(
                        children: [
                          const Icon(Icons.description_outlined, color: AppColors.primary),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Extracted Text',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.volume_up_outlined),
                          ),
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.copy_outlined),
                          ),
                        ],
                      ),

                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: Text(
                          extractedText,
                          style: const TextStyle(
                            fontSize: 15,
                            color: AppColors.textDark,
                            height: 1.5,
                          ),
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

  Widget _circleButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(26),
          boxShadow: const [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 6,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Icon(icon, color: AppColors.textDark),
      ),
    );
  }

  Widget _corner({
    double? top,
    double? right,
    double? bottom,
    double? left,
  }) {
    return Positioned(
      top: top,
      right: right,
      bottom: bottom,
      left: left,
      child: Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          border: Border(
            top: top != null
                ? const BorderSide(color: AppColors.primaryLight, width: 4)
                : BorderSide.none,
            left: left != null
                ? const BorderSide(color: AppColors.primaryLight, width: 4)
                : BorderSide.none,
            right: right != null
                ? const BorderSide(color: AppColors.primaryLight, width: 4)
                : BorderSide.none,
            bottom: bottom != null
                ? const BorderSide(color: AppColors.primaryLight, width: 4)
                : BorderSide.none,
          ),
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }
}