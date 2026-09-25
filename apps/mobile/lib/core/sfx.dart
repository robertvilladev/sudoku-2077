/// Sound effects behind a small interface, so widget tests (and platforms without an audio
/// backend) use [NoopSfxPlayer].
library;

enum Sfx {
  unitChirp1('sfx/unit_chirp_1.wav'),
  unitChirp2('sfx/unit_chirp_2.wav'),
  unitChirp3('sfx/unit_chirp_3.wav');

  const Sfx(this.asset);

  /// Path relative to `assets/`.
  final String asset;

  /// The chirp for [units] units completed at once (clamped to 1–3).
  static Sfx unitChirp(int units) =>
      const [unitChirp1, unitChirp2, unitChirp3][units.clamp(1, 3) - 1];
}

abstract interface class SfxPlayer {
  /// Loads every clip. Safe to call once at startup; failures are swallowed.
  Future<void> preload();

  /// Fire and forget. Never throws.
  void play(Sfx sfx);

  Future<void> dispose();
}

class NoopSfxPlayer implements SfxPlayer {
  const NoopSfxPlayer();

  @override
  Future<void> preload() async {}

  @override
  void play(Sfx sfx) {}

  @override
  Future<void> dispose() async {}
}
