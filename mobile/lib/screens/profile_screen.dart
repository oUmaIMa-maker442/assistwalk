import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image_picker/image_picker.dart';

import '../widgets/app_gradient_background.dart';
import '../core/app_colors.dart';
import '../core/server_config.dart';
import '../models/user_model.dart';
import '../services/profile_service.dart';
import '../services/voice_command_service.dart';
import '../utils/constants.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
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
  final FlutterTts _tts = FlutterTts();


  final ImagePicker _imagePicker = ImagePicker();

  late Future<UserModel> _userFuture;

  bool _isLoggingOut = false;
  bool _isUploadingPhoto = false;

  UserModel? _currentUser;

  @override
  void initState() {
    super.initState();

    _initTts();

    _userFuture = _profileService.getCurrentUser();

    VoiceCommandService.commandNotifier
        .addListener(_handleVoiceCommands);
  }

  Future<void> _initTts() async {
    await _tts.setLanguage("en-US");
    await _tts.setSpeechRate(0.48);
    await _tts.setPitch(1.0);
    await _tts.setVolume(1.0);
  }

  Future<void> _speak(String text) async {
    if (text.trim().isEmpty) return;

    await _tts.stop();

    await _tts.speak(
      text.replaceAll('\n', ' '),
    );
  }

  void _handleVoiceCommands() {
    final command = VoiceCommandService.commandNotifier.value;

    if (command == null) return;

    if (command == 'logout') {
      _confirmLogout();
    }

    else if (command == 'repeat') {
      _speakProfile();
    }

    VoiceCommandService.clear();
  }

  Future<void> _speakProfile() async {
    final user = _currentUser;

    if (user == null) {
      await _speak("Profile not loaded yet");
      return;
    }

    final message = '''
Name ${user.fullName}.
Email ${user.email}.
Phone ${user.telephone}.
Emergency phone ${user.telephoneUrgence}.
Blood type ${user.groupeSanguin}.
Visual impairment level ${user.niveauDeficience}.
''';

    await _speak(message);
  }

  Future<void> _refreshProfile() async {
    setState(() {
      _userFuture = _profileService.getCurrentUser();
    });
  }

  Future<void> _showPhotoOptions() async {
    await _speak("Choose how to update your profile photo");

    if (!mounted) return;

    final hasPhoto = _currentUser?.photoUrl != null &&
        _currentUser!.photoUrl!.isNotEmpty;

    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () {
                Navigator.pop(context);
                _pickAndUploadPhoto(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickAndUploadPhoto(ImageSource.gallery);
              },
            ),
            if (hasPhoto)
              ListTile(
                leading: const Icon(
                  Icons.delete_outline,
                  color: AppColors.sosRed,
                ),
                title: const Text(
                  'Remove photo',
                  style: TextStyle(color: AppColors.sosRed),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _removePhoto();
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndUploadPhoto(ImageSource source) async {
    final pickedFile = await _imagePicker.pickImage(
      source: source,
      maxWidth: 1024,
      imageQuality: 85,
    );

    if (pickedFile == null) return;

    setState(() => _isUploadingPhoto = true);

    try {
      await _profileService.uploadPhoto(File(pickedFile.path));

      await _refreshProfile();
      await _speak("Profile photo updated");
    } catch (e) {
      await _speak("Failed to update profile photo");

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update profile photo'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
      }
    }
  }

  Future<void> _removePhoto() async {
    setState(() => _isUploadingPhoto = true);

    try {
      await _profileService.deletePhoto();

      await _refreshProfile();
      await _speak("Profile photo removed");
    } catch (e) {
      await _speak("Failed to remove profile photo");

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to remove profile photo'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
      }
    }
  }

  Future<void> _confirmLogout() async {
    await _speak("Do you want to logout?");

    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text(
          'Are you sure you want to logout?',
        ),
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
      ),
    );

    if (shouldLogout == true) {
      await _logout();
    }
  }

  Future<void> _logout() async {
    setState(() => _isLoggingOut = true);

    await _speak("Logging out");

    await _storage.delete(
      key: AppConstants.tokenKey,
    );

    await _storage.delete(
      key: AppConstants.roleKey,
    );

    await _storage.delete(
      key: AppConstants.userIdKey,
    );

    if (!mounted) return;

    widget.onLogout();
  }

  @override
  void dispose() {
    VoiceCommandService.commandNotifier
        .removeListener(_handleVoiceCommands);

    _tts.stop();

    super.dispose();
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

              if (snapshot.connectionState ==
                  ConnectionState.waiting) {

                return const Center(
                  child: CircularProgressIndicator(),
                );
              }

              if (snapshot.hasError) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment:
                      MainAxisAlignment.center,
                      children: [

                        const Icon(
                          Icons.error_outline,
                          size: 48,
                          color: AppColors.sosRed,
                        ),

                        const SizedBox(height: 12),

                        const Text(
                          'Unable to load profile',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.textDark,
                            fontWeight:
                            FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),

                        const SizedBox(height: 12),

                        ElevatedButton.icon(
                          onPressed: _refreshProfile,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                );
              }

              final user =
                  snapshot.data ?? UserModel.mock();

              _currentUser = user;

              return RefreshIndicator(
                onRefresh: _refreshProfile,

                child: SingleChildScrollView(
                  physics:
                  const AlwaysScrollableScrollPhysics(),

                  child: Padding(
                    padding:
                    const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 16,
                    ),

                    child: Column(
                      children: [

                        const SizedBox(height: 18),

                        const Text(
                          'My Profile',
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight:
                            FontWeight.bold,
                            color:
                            AppColors.textDark,
                          ),
                        ),

                        const SizedBox(height: 8),

                        const Text(
                          'Your personal information',
                          style: TextStyle(
                            fontSize: 16,
                            color:
                            AppColors.textGrey,
                          ),
                        ),

                        const SizedBox(height: 24),

                        Stack(
                          clipBehavior: Clip.none,
                          children: [

                            CircleAvatar(
                              radius: 68,
                              backgroundColor:
                              AppColors.navigationSoft,

                              backgroundImage: (user.photoUrl != null &&
                                  user.photoUrl!.isNotEmpty)
                                  ? NetworkImage(
                                '${ServerConfig.springBaseUrl}${user.photoUrl}',
                              )
                                  : null,

                              child: (user.photoUrl == null ||
                                  user.photoUrl!.isEmpty)
                                  ? const Icon(
                                Icons.person,
                                size: 78,
                                color:
                                AppColors.primaryLight,
                              )
                                  : null,
                            ),

                            if (_isUploadingPhoto)
                              const Positioned.fill(
                                child: CircleAvatar(
                                  radius: 68,
                                  backgroundColor:
                                  Colors.black38,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                  ),
                                ),
                              ),

                            Positioned(
                              bottom: 0,
                              right: 0,

                              child: GestureDetector(
                                onTap: _isUploadingPhoto
                                    ? null
                                    : _showPhotoOptions,

                                child: const CircleAvatar(
                                  radius: 20,
                                  backgroundColor:
                                  AppColors.primaryLight,

                                  child: Icon(
                                    Icons.camera_alt,
                                    size: 20,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 18),

                        Text(
                          user.fullName.isEmpty
                              ? 'User'
                              : user.fullName,

                          textAlign: TextAlign.center,

                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight:
                            FontWeight.bold,
                            color:
                            AppColors.textDark,
                          ),
                        ),

                        const SizedBox(height: 22),

                        Container(
                          width: double.infinity,

                          decoration: BoxDecoration(
                            color: Colors.white,

                            borderRadius:
                            BorderRadius.circular(
                              24,
                            ),

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
                                icon:
                                Icons.person_outline,
                                label: 'Full Name',
                                value:
                                user.fullName,
                              ),

                              const Divider(height: 1),

                              _ProfileItem(
                                icon:
                                Icons.email_outlined,
                                label: 'Email',
                                value: user.email,
                              ),

                              const Divider(height: 1),

                              _ProfileItem(
                                icon:
                                Icons.phone_outlined,
                                label: 'Phone',
                                value:
                                user.telephone,
                              ),

                              const Divider(height: 1),

                              _ProfileItem(
                                icon: Icons
                                    .phone_in_talk_outlined,
                                label:
                                'Emergency Phone',
                                value: user
                                    .telephoneUrgence,
                              ),

                              const Divider(height: 1),

                              _ProfileItem(
                                icon: Icons
                                    .bloodtype_outlined,
                                label:
                                'Blood Type',
                                value: user
                                    .groupeSanguin,
                              ),

                              const Divider(height: 1),

                              _ProfileItem(
                                icon: Icons
                                    .remove_red_eye_outlined,
                                label:
                                'Visual Impairment Level',
                                value: user
                                    .niveauDeficience,
                              ),

                              const Divider(height: 1),

                              _ProfileItem(
                                icon: Icons
                                    .verified_user_outlined,
                                label: 'Role',
                                value: user.role,
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 28),

                        SizedBox(
                          width: double.infinity,
                          height: 56,

                          child: ElevatedButton.icon(
                            onPressed:
                            _isLoggingOut
                                ? null
                                : _confirmLogout,

                            icon: _isLoggingOut
                                ? const SizedBox(
                              width: 22,
                              height: 22,
                              child:
                              CircularProgressIndicator(
                                color:
                                Colors.white,
                                strokeWidth:
                                2,
                              ),
                            )
                                : const Icon(
                              Icons.logout,
                            ),

                            label: Text(
                              _isLoggingOut
                                  ? 'Logging out...'
                                  : 'Logout',

                              style:
                              const TextStyle(
                                fontSize: 17,
                                fontWeight:
                                FontWeight
                                    .bold,
                              ),
                            ),

                            style:
                            ElevatedButton.styleFrom(
                              backgroundColor:
                              AppColors.sosRed,

                              foregroundColor:
                              Colors.white,

                              shape:
                              RoundedRectangleBorder(
                                borderRadius:
                                BorderRadius
                                    .circular(
                                  28,
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

    final displayValue =
    value.isEmpty ? '-' : value;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: 18,
        vertical: 18,
      ),

      child: Row(
        children: [

          CircleAvatar(
            radius: 22,
            backgroundColor:
            AppColors.navigationSoft,

            child: Icon(
              icon,
              color: AppColors.primaryLight,
            ),
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
              displayValue,

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