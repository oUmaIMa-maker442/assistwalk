import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../main.dart';
import '../widgets/app_gradient_background.dart';
import '../core/app_colors.dart';
import 'sos_screen.dart';
import '../services/detector_service.dart';

class NavigationScreen extends StatefulWidget {
  const NavigationScreen({super.key});

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  bool isDetectionOn = true;
  bool isAudioOn = true;
  bool isAutoMode = false;
  final DetectorService _detectorService = DetectorService();

  String currentLocation = '123 Main Street, City Center,\nCasablanca, Morocco';

  CameraController? _cameraController;
  Future<void>? _initializeControllerFuture;

  @override
  void initState() {
    super.initState();
    _initCamera();
    _loadDetector();
  }

  Future<void> _loadDetector() async {
    await _detectorService.loadModel();
  }

  void _initCamera() {
    if (cameras.isEmpty) return;

    _cameraController = CameraController(
      cameras.first,
      ResolutionPreset.medium,
      enableAudio: false,
    );

    _initializeControllerFuture = _cameraController!.initialize().then((_) {
      if (mounted) {
        setState(() {});
      }
    }).catchError((error) {
      debugPrint('Camera init error: $error');
    });
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: AppGradientBackground(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                child: SizedBox(
                  height: constraints.maxHeight,
                  child: Column(
                    children: [
                      const SizedBox(height: 2),

                      Row(
                        children: [
                          _circleButton(
                            icon: Icons.arrow_back_ios_new_rounded,
                            onTap: () {
                              Navigator.pop(context);
                            },
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Center(
                              child: Text(
                                'AssistWalk',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          _circleButton(
                            icon: isAudioOn
                                ? Icons.volume_up_outlined
                                : Icons.volume_off_outlined,
                            onTap: () {
                              setState(() {
                                isAudioOn = !isAudioOn;
                              });
                            },
                          ),
                        ],
                      ),

                      const SizedBox(height: 8),

                      _locationCard(),

                      const SizedBox(height: 6),

                      Row(
                        children: [
                          Expanded(
                            child: _statusChip(
                              color: Colors.green,
                              label: 'Live Camera',
                              icon: Icons.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _statusChip(
                              color: isDetectionOn ? Colors.green : Colors.red,
                              label: isDetectionOn
                                  ? 'Object Detection: ON'
                                  : 'Object Detection: OFF',
                              icon: Icons.wb_sunny_outlined,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 8),

                      Expanded(
                        child: Stack(
                          children: [
                            Positioned.fill(
                              child: _cameraArea(),
                            ),

                            Positioned(
                              top: 12,
                              left: 12,
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    isAutoMode = !isAutoMode;
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.black87,
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.wb_sunny_outlined,
                                        color: Colors.white,
                                        size: 14,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        isAutoMode ? 'Auto' : 'Manual',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),

                            Positioned(
                              right: 12,
                              bottom: 20,
                              child: GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => SosScreen(
                                        onBackToHome: () {
                                          Navigator.pop(context);
                                        },
                                      ),
                                    ),
                                  );
                                },
                                child: Container(
                                  width: 82,
                                  height: 82,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.sosRed,
                                    border: Border.all(color: Colors.white, width: 4),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.sosRed.withOpacity(0.22),
                                        blurRadius: 12,
                                        spreadRadius: 2,
                                      ),
                                    ],
                                  ),
                                  child: const Center(
                                    child: Text(
                                      'SOS',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 10),

                      _audioFeedbackCard(),

                      const SizedBox(height: 4),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _cameraArea() {
    if (_cameraController == null || _initializeControllerFuture == null) {
      return _cameraUnavailable();
    }

    return FutureBuilder<void>(
      future: _initializeControllerFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done &&
            _cameraController!.value.isInitialized) {
          return ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Stack(
              fit: StackFit.expand,
              children: [
                FittedBox(
                  fit: BoxFit.cover,
                  child: SizedBox(
                    width: _cameraController!.value.previewSize!.height,
                    height: _cameraController!.value.previewSize!.width,
                    child: CameraPreview(_cameraController!),
                  ),
                ),
                Positioned.fill(
                  child: Container(
                    color: Colors.black.withOpacity(0.04),
                  ),
                ),
              ],
            ),
          );
        }

        if (snapshot.hasError) {
          return _cameraUnavailable(message: 'Camera error');
        }

        return ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Container(
            color: Colors.black12,
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          ),
        );
      },
    );
  }

  Widget _cameraUnavailable({String message = 'Camera unavailable'}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black12,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(
            color: AppColors.textDark,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _locationCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.88),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on, color: AppColors.primaryLight),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              currentLocation,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textDark,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip({
    required Color color,
    required String label,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.82),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textDark,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _audioFeedbackCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.82),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: const [
          Icon(Icons.volume_up, color: AppColors.textDark),
          SizedBox(width: 8),
          Text(
            'Audio Feedback',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.textDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.92),
          borderRadius: BorderRadius.circular(21),
        ),
        child: Icon(
          icon,
          size: 18,
          color: AppColors.textDark,
        ),
      ),
    );
  }
}