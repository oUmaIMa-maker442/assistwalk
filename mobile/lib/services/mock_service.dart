/// Mock utilisé pendant le développement quand le backend OCR
/// n'est pas encore disponible. Remplacer par ApiService.extractText
/// dès que Dev A signale que l'endpoint est prêt.
class MockService {
  Future<Map<String, dynamic>> extractText(String imagePath) async {
    await Future.delayed(const Duration(seconds: 1));
    return {
      'id': 1,
      'text': 'Texte de test : Sortie de secours à 50 mètres',
      'confidence': 0.92,
    };
  }
}