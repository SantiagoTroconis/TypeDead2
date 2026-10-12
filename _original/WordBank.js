// Word banks per stage; also helpers to pick a word that doesn't start with a letter already in use (so each zombie has a unique first letter among live targets).
const WordBank_SHORT = [
  'run','die','rot','gut','jaw','axe','hex','bat','owl','web','fog','bog','mud','pit','cry','gag','gob','ick','imp','vex',
  'orb','urn','nag','ooze','grim','howl','moan','dusk','curse','ghost','bone','soul','dead','evil','grave','blood','skull','witch','spell','night','scare','creep','howl','pale','rust','ghoul','ichor'
];
const WordBank_MED = [
  'graveyard','skeleton','pumpkin','midnight','monster','phantom','specter','vampire','werewolf','cauldron','cobweb','coffin','crypt','demon','elixir','ghastly','goblin','gothic','hollow','ichorous','jackal','lantern','lurker','malice','mortis','necropolis','ominous','possess','rotten','sinister','slither','sorcery','spidery','terror','undying','vicious','wander','wraith','zombie','abyss','banshee','blight','corpse','creeper','cursed','damned','deadly','devour','doom','dread','evil','fester','frozen','fungus','gargoyle','gloom','howling','infernal','killer','lonely','malign','morbid','night','obscure','pallid','plague','poison','quiver','ravage','ritual','shadow','shriek','spirit','stalker','thorn','tombs','twisted','unholy','venom','voodoo','whisper','winter'
];
const WordBank_LONG = [
  'eviscerate','exorcism','gravedigger','hauntingly','insanity','malediction','necromancer','pestilence','pumpkinhead','revenant','ritualistic','sarcophagus','sepulcher','abomination','apocalypse','blackmagic','bloodcurse','catastrophe','cemeterial','damnation','decapitate','disembowel','enchantress','extirpate','ghostwraith','grimoires','gravestone','infestation','malevolent','monstrosity','necropolitan','nightmarish','poltergeist','purgatorial','pyromantic','resurrection','sanguinary','skeletalist','spectralize','suffocation','terrifying','unspeakable','vengeance','witchcraft'
];

const WordBank_BOSS = {
  1: ['gravekeeper','tombwraith','corpsemaster','bonewalker'],
  2: ['pumpkinreaper','jackolantern','harvestfiend','pumpkinqueen'],
  3: ['bloodbaroness','vampirelord','sanguinemaster','crimsonfang'],
  4: ['werewolfking','moonhowler','lupinelordship','feralmoonbeast'],
  5: ['necromancerofthevoid','abominationprime','deathincarnate','apocalypticspecter']
};

function WordBank_pickForStage(stage, isBoss) {
  if (isBoss) {
    const pool = WordBank_BOSS[stage] || WordBank_BOSS[5];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  let pool;
  if (stage <= 1) pool = WordBank_SHORT.concat(WordBank_SHORT);
  else if (stage === 2) pool = WordBank_SHORT.concat(WordBank_MED);
  else if (stage === 3) pool = WordBank_MED;
  else if (stage === 4) pool = WordBank_MED.concat(WordBank_LONG);
  else pool = WordBank_LONG.concat(WordBank_MED);
  return pool[Math.floor(Math.random() * pool.length)];
}

function WordBank_pickUnique(stage, usedFirstLetters, isBoss) {
  for (let i = 0; i < 60; i++) {
    const w = WordBank_pickForStage(stage, isBoss);
    if (!usedFirstLetters.has(w[0])) return w;
  }
  // Fallback — allow collision
  return WordBank_pickForStage(stage, isBoss);
}
