import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:assistwalk/main.dart';

void main() {
  testWidgets('Login screen shows correct widgets', (WidgetTester tester) async {
    // Construire l'application
    await tester.pumpWidget(const AssistWalkApp());

    // Vérifier que l'écran de login (SplashRouter) affiche le titre "AssistWalk"
    // (le SplashRouter montre d'abord un CircularProgressIndicator,
    //  mais après le temps de chargement, il redirige vers LoginScreen.
    //  Pour simplifier, on vérifie la présence du texte "Se connecter" après un court délai)

    // Attendre que l'écran de login apparaisse (le SplashRouter est très rapide,
    // mais on peut utiliser pumpAndSettle pour attendre les animations)
    await tester.pumpAndSettle();

    // Vérifier que le texte "Se connecter" est présent (bouton de login)
    expect(find.text('Se connecter'), findsOneWidget);

    // Vérifier que le champ email est présent
    expect(find.widgetWithText(TextField, 'Email'), findsOneWidget);
  });
}