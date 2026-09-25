import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

import '../../tool/render_chirps.dart';

void main() {
  test('committed chirp WAVs match tool/render_chirps.dart', () {
    for (var count = 1; count <= 3; count++) {
      final expected = encodeWav(renderChirp(count));
      final actual = File('assets/sfx/unit_chirp_$count.wav').readAsBytesSync();
      expect(actual.length, expected.length, reason: 'unit_chirp_$count.wav');
      expect(actual.sublist(0, 44), expected.sublist(0, 44));
      // Allow 1 LSB of float drift between platforms' libm.
      final a = ByteData.sublistView(actual);
      final e = ByteData.sublistView(expected);
      for (var i = 44; i < actual.length; i += 2) {
        final diff =
            (a.getInt16(i, Endian.little) - e.getInt16(i, Endian.little)).abs();
        if (diff > 1) fail('unit_chirp_$count.wav differs at byte $i');
      }
    }
  });

  test('chirp lengths follow the spec: 140/210/280 ms plus 20 ms of tail', () {
    expect(renderChirp(1).length, (0.16 * sampleRate).round());
    expect(renderChirp(2).length, (0.23 * sampleRate).round());
    expect(renderChirp(3).length, (0.30 * sampleRate).round());
    final peak = renderChirp(3)
        .map((s) => s.abs())
        .reduce((a, b) => a > b ? a : b);
    expect(peak, inInclusiveRange(0.15, 0.3));
  });
}
