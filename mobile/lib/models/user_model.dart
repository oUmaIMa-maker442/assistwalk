class UserModel {
  final int id;
  final String nom;
  final String prenom;
  final String email;
  final String telephone;
  final String bloodType;
  final String visualImpairmentLevel;
  final String role;

  UserModel({
    required this.id,
    required this.nom,
    required this.prenom,
    required this.email,
    required this.telephone,
    required this.bloodType,
    required this.visualImpairmentLevel,
    required this.role,
  });

  String get fullName => '$prenom $nom'.trim();

  factory UserModel.mock() {
    return UserModel(
      id: 1,
      nom: 'Khassil',
      prenom: 'Fatiha',
      email: 'fatiha@example.com',
      telephone: '+212 6 12 34 56 78',
      bloodType: 'O+',
      visualImpairmentLevel: 'Severe Impairment',
      role: 'VISUAL_IMPAIRED',
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? 0,
      nom: json['nom'] ?? '',
      prenom: json['prenom'] ?? '',
      email: json['email'] ?? '',
      telephone: json['telephone'] ?? '',
      bloodType: json['bloodType'] ?? 'Not specified',
      visualImpairmentLevel:
      json['visualImpairmentLevel'] ?? 'Not specified',
      role: json['role'] ?? '',
    );
  }
}