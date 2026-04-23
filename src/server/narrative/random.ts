function hashSeed(seed: string) {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

export function createSeededRandom(seed: string) {
  const next = hashSeed(seed);

  return {
    float() {
      return next() / 4294967296;
    },
    int(min: number, max: number) {
      return Math.floor(this.float() * (max - min + 1)) + min;
    },
    pick<T>(values: T[]) {
      return values[this.int(0, values.length - 1)];
    },
  };
}
