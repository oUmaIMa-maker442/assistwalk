import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'home_screen.dart';
import 'scanner_screen.dart';
import 'sos_screen.dart';
import 'profile_screen.dart';
import '../services/voice_command_service.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final stt.SpeechToText _speech = stt.SpeechToText();

  bool _speechReady = false;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    _speechReady = await _speech.initialize(
      onStatus: (status) {
        debugPrint('Speech status: $status');

        if (status == 'done' || status == 'notListening') {
          if (mounted) {
            setState(() => _isListening = false);
          }
        }
      },
      onError: (error) {
        debugPrint('Speech error: $error');

        if (mounted) {
          setState(() => _isListening = false);
        }
      },
    );
  }

  void _goToTab(int index) {
    setState(() => _currentIndex = index);
  }

  Future<void> _listenCommand() async {
    if (!_speechReady) {
      await _initSpeech();
    }

    if (!_speechReady) {
      _showMessage('Voice recognition unavailable');
      return;
    }

    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
      return;
    }

    await _speech.stop();

    setState(() => _isListening = true);

    _showMessage('Listening...');

    await _speech.listen(
      localeId: 'en_US',
      listenFor: const Duration(seconds: 7),
      pauseFor: const Duration(seconds: 2),
      partialResults: true,
      cancelOnError: false,
      listenMode: stt.ListenMode.confirmation,
      onResult: (result) {
        final words = result.recognizedWords.toLowerCase().trim();

        if (words.isEmpty) return;

        debugPrint('VOICE WORDS: $words');

        if (result.finalResult) {
          final command = _normalizeCommand(words);

          if (command == null) {
            _showMessage('Command not recognized');
          } else {
            _handleVoiceCommand(command);
          }

          if (mounted) {
            setState(() => _isListening = false);
          }
        }
      },
    );
  }

  String? _normalizeCommand(String text) {
    if (text.contains('home') || text.contains('accueil')) {
      return 'home';
    }

    if (text.contains('navigation') ||
        text.contains('navigate') ||
        text.contains('guide') ||
        text.contains('guide me') ||
        text.contains('camera') ||
        text.contains('open navigation')) {
      return 'navigation';
    }

    if (text.contains('scanner') ||
        text.contains('scan') ||
        text.contains('ocr')) {
      return 'scanner';
    }

    if (text.contains('sos') ||
        text.contains('help') ||
        text.contains('emergency') ||
        text.contains('urgence')) {
      return 'sos';
    }

    if (text.contains('profile') ||
        text.contains('profil') ||
        text.contains('account') ||
        text.contains('compte')) {
      return 'profile';
    }

    if (text.contains('take photo') ||
        text.contains('take a photo') ||
        text.contains('capture') ||
        text.contains('photo') ||
        text.contains('read text') ||
        text.contains('read the text')) {
      return 'take_photo';
    }

    if (text.contains('repeat') ||
        text.contains('read again') ||
        text.contains('say again') ||
        text.contains('repete') ||
        text.contains('répète')) {
      return 'repeat';
    }

    if (text.contains('send sos') ||
        text.contains('send emergency') ||
        text.contains('send alert') ||
        text.contains('send help') ||
        text.contains('alerte')) {
      return 'send_sos';
    }

    if (text.contains('logout') ||
        text.contains('log out') ||
        text.contains('sign out') ||
        text.contains('deconnexion') ||
        text.contains('déconnexion')) {
      return 'logout';
    }

    return null;
  }

  void _handleVoiceCommand(String command) {
    if (command == 'home') {
      _goToTab(0);
      _showMessage('Opening Home');
    } else if (command == 'navigation') {
      _goToTab(0);
      _showMessage('Opening Navigation');

      Future.delayed(const Duration(milliseconds: 600), () {
        VoiceCommandService.sendCommand('start_navigation');
      });
    } else if (command == 'scanner') {
      _goToTab(1);
      _showMessage('Opening Scanner');
    } else if (command == 'sos') {
      _goToTab(2);
      _showMessage('Opening SOS');
    } else if (command == 'profile') {
      _goToTab(3);
      _showMessage('Opening Profile');
    } else if (command == 'take_photo') {
      _goToTab(1);

      Future.delayed(const Duration(milliseconds: 600), () {
        VoiceCommandService.sendCommand('take_photo');
      });
    } else if (command == 'repeat') {
      VoiceCommandService.sendCommand('repeat');
    } else if (command == 'send_sos') {
      _goToTab(2);

      Future.delayed(const Duration(milliseconds: 600), () {
        VoiceCommandService.sendCommand('send_sos');
      });
    } else if (command == 'logout') {
      _goToTab(3);

      Future.delayed(const Duration(milliseconds: 600), () {
        VoiceCommandService.sendCommand('logout');
      });
    } else {
      _showMessage('Command not recognized');
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).clearSnackBars();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  void dispose() {
  _speech.stop();
  super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(onNavigateTab: _goToTab),
      ScannerScreen(onBackToHome: () => _goToTab(0)),
      SosScreen(onBackToHome: () => _goToTab(0)),
      ProfileScreen(
        onLogout: () => Navigator.of(context)
            .pushNamedAndRemoveUntil('/', (route) => false),
      ),
    ];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: screens[_currentIndex],
      floatingActionButton: FloatingActionButton(
        onPressed: _listenCommand,
        backgroundColor:
        _isListening ? Colors.red : const Color(0xFF1565C0),
        child: Icon(
          _isListening ? Icons.mic : Icons.mic_none,
          color: Colors.white,
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 10,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: NavigationBar(
          backgroundColor: Colors.white,
          indicatorColor: const Color(0xFFE3F2FD),
          selectedIndex: _currentIndex,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          onDestinationSelected: (i) => setState(() => _currentIndex = i),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home, color: Color(0xFF1565C0)),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.document_scanner_outlined),
              selectedIcon:
              Icon(Icons.document_scanner, color: Color(0xFF1565C0)),
              label: 'Scanner',
            ),
            NavigationDestination(
              icon: Icon(Icons.sos_outlined),
              selectedIcon: Icon(Icons.sos, color: Color(0xFF1565C0)),
              label: 'SOS',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person, color: Color(0xFF1565C0)),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}