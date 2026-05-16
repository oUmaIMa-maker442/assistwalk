import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../services/ocr_api_service.dart';
import '../services/voice_command_service.dart';
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
  final ImagePicker _picker = ImagePicker();
  final OcrApiService _ocrService = OcrApiService();
  final FlutterTts _tts = FlutterTts();

  File? _image;
  String _text = "No text extracted yet";
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initTts();
    VoiceCommandService.commandNotifier.addListener(_handleVoiceCommands);
  }

  void _handleVoiceCommands() {
    final command = VoiceCommandService.commandNotifier.value;
    if (command == null) return;

    if (command == 'take_photo') {
      _takePhoto();
    } else if (command == 'repeat') {
      _speak(_text);
    }

    VoiceCommandService.clear();
  }

  Future<void> _initTts() async {
    await _tts.setLanguage("en-US");
    await _tts.setSpeechRate(0.5);
    await _tts.setPitch(1.0);
    await _tts.setVolume(1.0);
  }

  Future<void> _speak(String text) async {
    if (text.trim().isEmpty) return;

    await _tts.stop();

    if (RegExp(r'[ء-ي]').hasMatch(text)) {
      await _tts.setLanguage("ar-SA");
    } else if (_isFrenchText(text)) {
      await _tts.setLanguage("fr-FR");
    } else {
      await _tts.setLanguage("en-US");
    }

    await _tts.setSpeechRate(0.48);
    await _tts.setPitch(1.0);
    await _tts.setVolume(1.0);

    final cleanText = text
        .replaceAll('\n', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    await _tts.speak(cleanText);
  }

  bool _isFrenchText(String text) {
    final lower = text.toLowerCase();

    return RegExp(r'[éèêëàâîïôùûç]').hasMatch(lower) ||
        lower.contains(' le ') ||
        lower.contains(' la ') ||
        lower.contains(' les ') ||
        lower.contains(' un ') ||
        lower.contains(' une ') ||
        lower.contains(' des ') ||
        lower.contains(' du ') ||
        lower.contains(' de ') ||
        lower.contains(' et ') ||
        lower.contains(' jour ') ||
        lower.contains(' condamné');
  }

  Future<void> _takePhoto() async {
    if (_isLoading) return;

    await _tts.stop();

    final picked = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 65,
      maxWidth: 900,
    );

    if (picked == null) return;

    setState(() {
      _image = File(picked.path);
      _isLoading = true;
      _text = "Processing...";
    });

    try {
      final result = await _ocrService.extractText(picked.path);
      final text = (result['text'] ?? "No text found").toString();

      setState(() {
        _text = text.trim().isEmpty ? "No text found" : text;
      });

      await _speak(_text);
    } catch (e) {
      debugPrint("OCR Flutter error: $e");

      setState(() {
        _text = "OCR Error: $e";
      });

      await _speak("OCR error. Please try again.");
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    VoiceCommandService.commandNotifier.removeListener(_handleVoiceCommands);
    _tts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6FAFF),
      appBar: AppBar(
        title: const Text("OCR Scanner"),
        backgroundColor: AppColors.primaryLight,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: widget.onBackToHome,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.volume_up_outlined),
            onPressed: () => _speak(_text),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Semantics(
              label: 'Captured image preview',
              child: Container(
                height: 250,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(20),
                ),
                child: _image == null
                    ? const Center(child: Text("No image"))
                    : ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.file(
                    _image!,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    _text,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppColors.textDark,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isLoading ? null : _takePhoto,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryLight,
                padding: const EdgeInsets.symmetric(
                  horizontal: 30,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text(
                "Take a Photo",
                style: TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}