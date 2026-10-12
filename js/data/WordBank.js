// Word pools per stage. Every enemy carries a list of "segments": regular
// zombies have a single word, bosses have 2-3 words that must each be spoken.
//
// Picked for voice play: everyday words most English learners know, mostly
// two syllables or more (isolated one-syllable words are the ones speech
// recognizers get wrong most often), and no homophones ("sea"/"see"), numbers
// (recognizers answer "2" instead of "two") or single letters.
const WordBank = (() => {
  const EASY = [
    'apple','water','pizza','music','money','happy','table','phone','house','chair',
    'bread','coffee','movie','party','train','beach','smile','dance','sleep','dream',
    'lemon','tiger','zebra','robot','piano','radio','hotel','taxi','pasta','salad',
    'candy','honey','pencil','garden','doctor','summer','winter','monkey','rabbit','orange',
    'yellow','purple','basket','camera','jacket','kitchen','window','bottle','rocket','soccer',
    'guitar','cookie','button','sunday','friday','family','school','teacher','forest','island'
  ];
  const MEDIUM = [
    'banana','tomato','chocolate','computer','elephant','hospital','umbrella','sandwich','bicycle','airplane',
    'keyboard','birthday','popcorn','pancake','dinosaur','hamburger','butterfly','strawberry','kangaroo','crocodile',
    'spaghetti','avocado','microphone','calendar','medicine','newspaper','breakfast','yesterday','tomorrow','beautiful',
    'important','adventure','vacation','furniture','telephone','basketball','football','volcano','penguin','gorilla',
    'chicken','potato','cinema','museum','library','monday','saturday','weekend','holiday','airport'
  ];
  const HARD = [
    'refrigerator','helicopter','motorcycle','watermelon','pineapple','television','restaurant','supermarket','photograph','grasshopper',
    'electricity','university','skateboard','playground','everybody','incredible','celebration','information','temperature','environment',
    'grandmother','vocabulary','alligator','calculator','caterpillar','hippopotamus','rhinoceros','experiment','imagination','conversation',
    'vegetables','cauliflower','fantastic','wonderful','dangerous','delicious','comfortable','interesting','unbelievable','neighborhood'
  ];
  const BOSS = {
    1: [['good', 'morning'], ['hot', 'coffee'], ['pizza', 'party'], ['happy', 'birthday']],
    2: [['orange', 'juice'], ['chicken', 'soup'], ['movie', 'night'], ['summer', 'vacation']],
    3: [['chocolate', 'cookie'], ['peanut', 'butter'], ['french', 'fries'], ['birthday', 'party']],
    4: [['happy', 'new', 'year'], ['banana', 'chocolate', 'pancake'], ['rainy', 'sunday', 'morning'], ['strawberry', 'milk', 'shake']],
    5: [['merry', 'christmas', 'everybody'], ['supermarket', 'shopping', 'list'], ['chocolate', 'birthday', 'cake'], ['peanut', 'butter', 'sandwich']]
  };

  function poolFor(stage) {
    if (stage <= 1) return EASY;
    if (stage === 2) return EASY.concat(MEDIUM);
    if (stage === 3) return MEDIUM;
    if (stage === 4) return MEDIUM.concat(HARD);
    return HARD.concat(MEDIUM);
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /**
   * Picks segments for a new enemy, avoiding any word that could be confused
   * by voice with a word already on screen (activeWords).
   */
  function pick(stage, activeWords, isBoss) {
    const draw = isBoss
      ? () => pickRandom(BOSS[stage] || BOSS[5])
      : () => [pickRandom(poolFor(stage))];
    for (let i = 0; i < 60; i++) {
      const segments = draw();
      const clash = segments.some(seg => activeWords.some(w => WordMatcher.confusable(seg, w)));
      if (!clash) return segments;
    }
    return draw(); // crowded screen — accept a possible clash
  }

  // Every word the stage can show; used to bias on-device recognition.
  function vocabulary(stage) {
    const words = new Set(poolFor(stage));
    for (const phrase of BOSS[stage] || BOSS[5]) words.add(phrase.join(' '));
    return [...words];
  }

  return { pick, vocabulary };
})();
