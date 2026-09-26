// Renders the unit-complete chirp (Phase 5.5 spec, section 5) to 16-bit mono WAV assets.
//
//   cd apps/mobile && dart run tool/render_chirps.dart
//
// Writes assets/sfx/unit_chirp_{1,2,3}.wav. This is an offline port of web's Web Audio patch
// (`playUnitChirp` in the spec): the same oscillator, glide and envelope, evaluated sample by
// sample the way Web Audio's AudioParam automation defines them. Re-run it after changing any
// parameter below and commit the WAVs; `test/tool/render_chirps_test.dart` fails if they drift.
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

const sampleRate = 44100;

/// Base frequencies of blips 0..2: E5, A5, C#6.
const chirpNotes = [659.25, 880.0, 1108.73];
const blipSpacing = 0.07; // s between blip starts
const glideRatio = 1.26; // about +4 semitones
const glideTime = 0.06; // s, exponential ramp
const attackTime = 0.005; // s, linear ramp 0 -> peak
const peakGain = 0.22;
const decayEnd = 0.12; // s, exponential ramp peak -> floor
const floorGain = 0.0001;
const stopTime = 0.14; // s, oscillator stop
const tailSilence = 0.02; // s appended to every file

/// Web Audio's band-limited triangle: odd sine harmonics at 8/(pi^2 n^2), alternating sign, kept
/// below Nyquist.
double _triangle(double phase, double freq) {
  var sum = 0.0;
  for (var n = 1; n * freq < sampleRate / 2; n += 2) {
    final sign = (n ~/ 2).isEven ? 1.0 : -1.0;
    sum += sign * math.sin(n * phase) / (n * n);
  }
  return sum * 8 / (math.pi * math.pi);
}

double _frequency(double f, double t) =>
    t < glideTime ? f * math.pow(glideRatio, t / glideTime) : f * glideRatio;

double _gain(double t) {
  if (t < attackTime) return peakGain * t / attackTime;
  if (t < decayEnd) {
    final x = (t - attackTime) / (decayEnd - attackTime);
    return peakGain * math.pow(floorGain / peakGain, x);
  }
  return floorGain;
}

/// PCM samples in [-1, 1] for [count] units completed at once (clamped to 1–3).
Float64List renderChirp(int count) {
  final blips = count.clamp(1, 3);
  final length =
      ((blips - 1) * blipSpacing + stopTime + tailSilence) * sampleRate;
  final out = Float64List(length.round());
  for (var k = 0; k < blips; k++) {
    final start = (k * blipSpacing * sampleRate).round();
    final end = (stopTime * sampleRate).round();
    var phase = 0.0;
    for (var i = 0; i < end; i++) {
      final t = i / sampleRate;
      final f = _frequency(chirpNotes[k], t);
      out[start + i] += _gain(t) * _triangle(phase, f);
      phase += 2 * math.pi * f / sampleRate;
    }
  }
  return out;
}

/// A 16-bit mono PCM WAV file.
Uint8List encodeWav(Float64List samples) {
  final data = ByteData(44 + samples.length * 2);
  void ascii(int offset, String s) {
    for (var i = 0; i < s.length; i++) {
      data.setUint8(offset + i, s.codeUnitAt(i));
    }
  }

  ascii(0, 'RIFF');
  data.setUint32(4, 36 + samples.length * 2, Endian.little);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  data.setUint32(16, 16, Endian.little); // fmt chunk size
  data.setUint16(20, 1, Endian.little); // PCM
  data.setUint16(22, 1, Endian.little); // mono
  data.setUint32(24, sampleRate, Endian.little);
  data.setUint32(28, sampleRate * 2, Endian.little); // byte rate
  data.setUint16(32, 2, Endian.little); // block align
  data.setUint16(34, 16, Endian.little); // bits per sample
  ascii(36, 'data');
  data.setUint32(40, samples.length * 2, Endian.little);
  for (var i = 0; i < samples.length; i++) {
    final v = (samples[i].clamp(-1.0, 1.0) * 32767).round();
    data.setInt16(44 + i * 2, v, Endian.little);
  }
  return data.buffer.asUint8List();
}

void main() {
  for (var count = 1; count <= 3; count++) {
    final file = File('assets/sfx/unit_chirp_$count.wav');
    file.writeAsBytesSync(encodeWav(renderChirp(count)));
    stdout.writeln('${file.path}: ${file.lengthSync()} bytes');
  }
}
