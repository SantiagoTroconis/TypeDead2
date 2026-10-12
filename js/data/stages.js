// The five stages of the run. The last wave of each stage brings its boss.
const Stages = {
  1: { title: 'GRAVEYARD', desc: 'The dead walk among the stones.', waves: 3 },
  2: { title: 'PUMPKIN FIELD', desc: 'Lanterns flicker. Something stirs.', waves: 3 },
  3: { title: 'ABANDONED HOUSE', desc: 'Blood runs down the walls.', waves: 3 },
  4: { title: 'HAUNTED WOODS', desc: 'The moon howls back.', waves: 3 },
  5: { title: 'THE VOID', desc: 'All of them. All at once.', waves: 3 },

  count: 5,
  get(stage) { return this[stage] || this[5]; }
};
