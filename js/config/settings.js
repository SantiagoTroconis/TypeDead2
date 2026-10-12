// Tunable gameplay values (previously edited through the CodeWisp "Worlds" panel).
const GameSettings = {
  startingStage: 1,          // 1-5
  startingHp: 100,
  baseZombieSpeed: 28,
  speedPerStage: 6,
  speedPerWave: 2,
  playerDamagePerSecond: 20, // damage while a zombie is touching the player
  comboWindow: 3,            // seconds to land the next kill before the combo resets

  voice: {
    lang: 'en-US',           // recognition language; the word bank is English
    letterInterval: 0.03,    // seconds between bullets when a spoken word is "fired"
    settleDelay: 0.6,        // seconds an unchanged interim guess waits before it counts as final
    // false: the word must be pronounced well enough that the recognizer writes it exactly.
    // true:  also accept similar-sounding words and the recognizer's backup guesses.
    lenientPronunciation: false
  }
};
