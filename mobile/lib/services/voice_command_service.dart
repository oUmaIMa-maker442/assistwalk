import 'package:flutter/foundation.dart';

class VoiceCommandService {
  static final ValueNotifier<String?> commandNotifier =
  ValueNotifier<String?>(null);

  static void sendCommand(String command) {
    commandNotifier.value = command;
  }

  static void clear() {
    commandNotifier.value = null;
  }
}