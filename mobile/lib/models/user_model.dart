class UserModel {
  final int id;
  final String nom;
  final String prenom;
  final String email;
  final String telephone;
  final String role;

  final String telephoneUrgence;
  final String groupeSanguin;
  final String niveauDeficience;

  UserModel({
    required this.id,
    required this.nom,
    required this.prenom,
    required this.email,
    required this.telephone,
    required this.role,
    required this.telephoneUrgence,
    required this.groupeSanguin,
    required this.niveauDeficience,
  });

  String get fullName => '$prenom $nom'.trim();

  factory UserModel.mock() {
    return UserModel(
      id: 1,
      nom: 'Khassil',
      prenom: 'Fatiha',
      email: 'fatiha@example.com',
      telephone: '+212 6 12 34 56 78',
      role: 'VISUAL_IMPAIRED',
      telephoneUrgence: '+212 6 12 34 56 78',
      groupeSanguin: 'O+',
      niveauDeficience: 'Severe Impairment',
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? 0,
      nom: json['nom'] ?? '',
      prenom: json['prenom'] ?? '',
      email: json['email'] ?? '',
      telephone: json['telephone'] ?? '',
      role: json['role'] ?? '',
      telephoneUrgence: json['telephoneUrgence'] ?? 'Not specified',
      groupeSanguin: json['groupeSanguin'] ?? 'Not specified',
      niveauDeficience: json['niveauDeficience'] ?? 'Not specified',
    );
  }
}