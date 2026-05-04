import 'dart:async';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image/image.dart' as img;
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

import '../main.dart';
import '../widgets/app_gradient_background.dart';
import '../core/app_colors.dart';
import '../services/navigation_api_service.dart';

class NavigationScreen extends StatefulWidget {
  const NavigationScreen({super.key});

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  bool isDetectionOn = true;
  bool isAudioOn = true;

  final NavigationApiService _apiService = NavigationApiService();
  final FlutterTts _flutterTts = FlutterTts();

  bool _isAnalyzing = false;
  bool _isStreaming = false;
  DateTime _lastAnalysisTime = DateTime.now();

  String _navigationMessage = 'Audio Feedback';
  String currentLocation = 'Getting current location...';
  Position? _currentPosition;

  CameraController? _cameraController;
  Future<void>? _initializeControllerFuture;

  @override
  void initState() {
    super.initState();
    _initTts();
    _initCamera();
    _loadCurrentLocation();
  }

  Future<void> _initTts() async {
    await _flutterTts.setLanguage("en-US");
    await _flutterTts.setSpeechRate(0.45);
  }

  Future<void> _loadCurrentLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();

      if (!serviceEnabled) {
        if (!mounted) return;
        setState(() {
          currentLocation = 'Location service disabled';
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (!mounted) return;
        setState(() {
          currentLocation = 'Location permission denied';
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      _currentPosition = position;

      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (!mounted) return;

      if (placemarks.isNotEmpty) {
        final place = placemarks.first;

        final street = place.street ?? '';
        final locality = place.locality ?? '';
        final country = place.country ?? '';

        setState(() {
          currentLocation = '$street, $locality\n$country';
        });
      } else {
        setState(() {
          currentLocation =
          '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
        });
      }
    } catch (e) {
      debugPrint('Location error: $e');

      if (!mounted) return;
      setState(() {
        currentLocation = 'Unable to get location';
      });
    }
  }

  void _initCamera() {
    if (cameras.isEmpty) return;

    _cameraController = CameraController(
      cameras.first,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.yuv420,
    );

    _initializeControllerFuture = _cameraController!.initialize().then((_) async {
      if (!mounted) return;

      await _cameraController!.setFlashMode(FlashMode.off);

      setState(() {});

      _startImageStream();
    }).catchError((error) {
      debugPrint('Camera init error: $error');
    });
  }

  void _startImageStream() {
    if (_cameraController == null) return;
    if (!_cameraController!.value.isInitialized) return;
    if (_isStreaming) return;

    _isStreaming = true;

    _cameraController!.startImageStream((CameraImage cameraImage) async {
      if (!isDetectionOn) return;
      if (_isAnalyzing) return;

      final now = DateTime.now();

      if (now.difference(_lastAnalysisTime).inSeconds < 3) return;

      _lastAnalysisTime = now;
      _isAnalyzing = true;

      if (mounted) {
        setState(() {
          _navigationMessage = 'Analyzing environment...';
        });
      }

      try {
        final Uint8List jpegBytes = _convertYUV420ToJpeg(cameraImage);
        final message = await _apiService.analyzeImageBytes(jpegBytes);

        if (!mounted) return;

        setState(() {
          _navigationMessage = message;
        });

        if (isAudioOn && message.trim().isNotEmpty) {
          await _flutterTts.stop();
          await _flutterTts.speak(message);
        }
      } catch (e) {
        debugPrint('Navigation stream error: $e');

        if (mounted) {
          setState(() {
            _navigationMessage = 'Connection error with navigation server';
          });
        }
      } finally {
        _isAnalyzing = false;
      }
    });
  }

  Uint8List _convertYUV420ToJpeg(CameraImage image) {
    final int width = image.width;
    final int height = image.height;

    final img.Image rgbImage = img.Image(width: width, height: height);

    final Plane yPlane = image.planes[0];
    final Plane uPlane = image.planes[1];
    final Plane vPlane = image.planes[2];

    final int yRowStride = yPlane.bytesPerRow;
    final int uvRowStride = uPlane.bytesPerRow;
    final int uvPixelStride = uPlane.bytesPerPixel ?? 1;

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        final int yIndex = y * yRowStride + x;

        final int uvX = x ~/ 2;
        final int uvY = y ~/ 2;
        final int uvIndex = uvY * uvRowStride + uvX * uvPixelStride;

        final int yp = yPlane.bytes[yIndex];
        final int up = uPlane.bytes[uvIndex];
        final int vp = vPlane.bytes[uvIndex];

        int r = (yp + 1.402 * (vp - 128)).round();
        int g = (yp - 0.344136 * (up - 128) - 0.714136 * (vp - 128)).round();
        int b = (yp + 1.772 * (up - 128)).round();

        r = r.clamp(0, 255);
        g = g.clamp(0, 255);
        b = b.clamp(0, 255);

        rgbImage.setPixelRgb(x, y, r, g, b);
      }
    }

    return Uint8List.fromList(img.encodeJpg(rgbImage, quality: 75));
  }

  @override
  void dispose() {
    _flutterTts.stop();

    if (_cameraController != null &&
        _cameraController!.value.isInitialized &&
        _cameraController!.value.isStreamingImages) {
      _cameraController!.stopImageStream();
    }

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
                            onTap: () => Navigator.pop(context),
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Center(
                              child: Text(
                                'AssistWalk',
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
                      Expanded(child: _cameraArea()),
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
            child: CameraPreview(_cameraController!),
          );
        }

        if (snapshot.hasError) {
          return _cameraUnavailable(message: 'Camera error');
        }

        return const Center(child: CircularProgressIndicator());
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
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _loadCurrentLocation,
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
              style: const TextStyle(fontSize: 11),
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
        children: [
          const Icon(Icons.volume_up),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _navigationMessage,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
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
        child: Icon(icon),
      ),
    );
  }
}