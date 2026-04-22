import 'package:tflite_flutter/tflite_flutter.dart';
import 'package:image/image.dart' as img;

class DetectorService {
  late Interpreter _interpreter;

  Future<void> loadModel() async {
    _interpreter = await Interpreter.fromAsset('assets/models/best.tflite');
    print('✅ Model loaded');
  }

  List<List<double>> runInference(img.Image image) {
    // Resize image (YOLO généralement 640x640)
    final resized = img.copyResize(image, width: 640, height: 640);

    // Convertir en float32
    var input = List.generate(
      1,
          (i) => List.generate(
        640,
            (y) => List.generate(
          640,
              (x) {
            final pixel = resized.getPixel(x, y);
            return [
              pixel.r / 255.0,
              pixel.g / 255.0,
              pixel.b / 255.0,
            ];
          },
        ),
      ),
    );

    // Output (à adapter selon modèle)
    var output = List.filled(1 * 25200 * 6, 0).reshape([1, 25200, 6]);

    _interpreter.run(input, output);

    return output;
  }
}