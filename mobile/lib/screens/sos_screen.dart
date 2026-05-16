import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../widgets/app_gradient_background.dart';
import '../core/app_colors.dart';
import '../services/api_service.dart';
import '../services/voice_command_service.dart';

class SosScreen extends StatefulWidget {
  final VoidCallback onBackToHome;

  const SosScreen({
    super.key,
    required this.onBackToHome,
  });

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final ApiService _apiService = ApiService();
  final FlutterTts _flutterTts = FlutterTts();

  bool _isSending = false;
  bool _isAudioOn = true;

  String _statusMessage =
      'Press the button below to send an emergency alert.';
  String _locationText = 'Getting current location...';

  Position? _currentPosition;

  @override
  void initState() {
    super.initState();
    _initTts();
    _loadCurrentLocation();
    VoiceCommandService.commandNotifier.addListener(_handleVoiceCommands);
  }

  void _handleVoiceCommands() {
    final command = VoiceCommandService.commandNotifier.value;
    if (command == null) return;

    if (command == 'send_sos') {
      _sendSos();
    } else if (command == 'repeat') {
      _speak(_statusMessage);
    }

    VoiceCommandService.clear();
  }

  Future<void> _initTts() async {
    await _flutterTts.setLanguage("en-US");
    await _flutterTts.setSpeechRate(0.45);
    await _flutterTts.setPitch(1.0);
    await _flutterTts.setVolume(1.0);
  }

  Future<void> _speak(String message) async {
    if (!_isAudioOn || message.trim().isEmpty) return;
    await _flutterTts.stop();
    await _flutterTts.speak(message);
  }

  Future<void> _loadCurrentLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();

      if (!serviceEnabled) {
        setState(() {
          _locationText = 'Location service disabled';
        });
        await _speak('Location service disabled');
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() {
          _locationText = 'Location permission denied';
        });
        await _speak('Location permission denied');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      if (!mounted) return;

      setState(() {
        _currentPosition = position;
        _locationText =
        '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _locationText = 'Unable to get location';
      });

      await _speak('Unable to get location');
    }
  }

  Future<void> _sendSos() async {
    if (_isSending) return;

    setState(() {
      _isSending = true;
      _statusMessage = 'Sending SOS alert...';
    });

    await _speak('Sending SOS alert');

    try {
      Position? position = _currentPosition;

      position ??= await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final response = await _apiService.sendSos(
        position.latitude,
        position.longitude,
        'emergency',
      );

      final alertId = response['id'] ?? '-';
      final successMessage = 'SOS sent successfully. Alert ID: $alertId';

      if (!mounted) return;

      setState(() {
        _currentPosition = position;
        _locationText =
        '${position!.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
        _statusMessage = successMessage;
      });

      await _speak('SOS sent successfully');

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('SOS sent successfully'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      const errorMessage = 'Failed to send SOS alert. Please try again.';

      if (!mounted) return;

      setState(() {
        _statusMessage = errorMessage;
      });

      await _speak('SOS failed. Please try again');

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('SOS failed. Check login, GPS, or backend.'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  @override
  void dispose() {
    VoiceCommandService.commandNotifier.removeListener(_handleVoiceCommands);
    _flutterTts.stop();
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
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
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
                            _circleButton(
                              _isAudioOn
                                  ? Icons.volume_up_outlined
                                  : Icons.volume_off_outlined,
                                  () {
                                setState(() {
                                  _isAudioOn = !_isAudioOn;
                                });
                              },
                            ),
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
                          'Emergency Alert',
                          style: TextStyle(
                            fontSize: 15,
                            color: AppColors.textGrey,
                          ),
                        ),
                        const SizedBox(height: 18),
                        _locationCard(),
                        const SizedBox(height: 28),
                        const Text(
                          'SOS',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          _statusMessage,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            color: AppColors.textGrey,
                          ),
                        ),
                        const SizedBox(height: 24),
                        GestureDetector(
                          onTap: _isSending ? null : _sendSos,
                          child: AnimatedOpacity(
                            opacity: _isSending ? 0.65 : 1,
                            duration: const Duration(milliseconds: 200),
                            child: Container(
                              width: 220,
                              height: 220,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.sosRed,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 6,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.sosRed.withOpacity(0.25),
                                    blurRadius: 28,
                                    spreadRadius: 14,
                                  ),
                                ],
                              ),
                              child: Center(
                                child: _isSending
                                    ? const CircularProgressIndicator(
                                  color: Colors.white,
                                )
                                    : const Text(
                                  'SOS',
                                  style: TextStyle(
                                    fontSize: 58,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 30),
                      ],
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

  Widget _locationCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.location_on,
            color: AppColors.sosRed,
            size: 34,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Current Location',
                  style: TextStyle(
                    color: AppColors.sosRed,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _locationText,
                  style: const TextStyle(
                    color: AppColors.textGrey,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: _loadCurrentLocation,
            icon: const Icon(Icons.my_location),
            color: AppColors.sosRed,
          ),
        ],
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
}