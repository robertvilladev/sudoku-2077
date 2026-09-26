import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

import 'sfx.dart';

/// [SfxPlayer] on `audioplayers`: one preloaded player per clip, in low-latency mode (Android
/// SoundPool) where the platform has it.
///
/// Any failure (no audio backend, missing plugin, a browser that blocks audio) degrades to
/// silence: sound is never allowed to break play.
class AudioplayersSfxPlayer implements SfxPlayer {
  final Map<Sfx, AudioPlayer> _players = {};
  Future<void>? _loading;

  @override
  Future<void> preload() => _loading ??= _load();

  Future<void> _load() async {
    try {
      // Short UI sounds: mix with the player's music and respect the silent switch.
      final context = AudioContextConfig(
        focus: AudioContextConfigFocus.mixWithOthers,
        respectSilence: true,
      ).build();
      await AudioPlayer.global.setAudioContext(context);
      for (final sfx in Sfx.values) {
        final player = AudioPlayer();
        await player.setPlayerMode(
          kIsWeb ? PlayerMode.mediaPlayer : PlayerMode.lowLatency,
        );
        await player.setAudioContext(context);
        await player.setReleaseMode(ReleaseMode.stop);
        await player.setSource(AssetSource(sfx.asset));
        _players[sfx] = player;
      }
    } catch (e) {
      debugPrint('SFX disabled: $e');
    }
  }

  @override
  void play(Sfx sfx) {
    final player = _players[sfx];
    if (player == null) return;
    unawaited(_restart(player, sfx));
  }

  Future<void> _restart(AudioPlayer player, Sfx sfx) async {
    try {
      await player.stop();
      await player.resume();
    } catch (e) {
      debugPrint('SFX ${sfx.name} failed: $e');
    }
  }

  @override
  Future<void> dispose() async {
    for (final player in _players.values) {
      await player.dispose();
    }
    _players.clear();
  }
}
