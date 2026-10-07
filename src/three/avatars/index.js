// Zuordnung Phaser-Textur → Avatar-Klasse. Jedes Sprite der Play-Szene wird über seinen
// Textur-Key gespiegelt; null bedeutet: nur in Phaser ausblenden (Teil eines anderen Avatars).

import { HeroAvatar, PflaumeAvatar } from './hero.js';
import { WalkerAvatar, HopperAvatar } from './enemies.js';
import { CoinAvatar, KeyAvatar, GateAvatar, FlagAvatar, ThornsAvatar, CheckpointAvatar, BerryAvatar, FireballAvatar } from './items.js';

const BY_TEXTURE = {
  lotti: HeroAvatar,
  greta: HeroAvatar,
  pflaume: PflaumeAvatar,
  leaf: null,              // Blätterschirm gehört zum Hero-Avatar
  walker: WalkerAvatar,
  hopper: HopperAvatar,
  coin: CoinAvatar,
  key: KeyAvatar,
  gate: GateAvatar,
  flag: FlagAvatar,
  thorns: ThornsAvatar,
  checkpoint: CheckpointAvatar,
  berry: BerryAvatar,
  fireball: FireballAvatar,
};

/** Avatar für ein Phaser-Objekt erzeugen (oder null, wenn es keinen eigenen braucht). */
export function createAvatar(view, obj) {
  const C = BY_TEXTURE[obj.texture?.key];
  return C ? new C(view, obj) : null;
}
