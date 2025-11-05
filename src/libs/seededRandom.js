// Simple LCG for deterministic random numbers across clients
// https://en.wikipedia.org/wiki/Linear_congruential_generator
class SeededRNG {
  constructor(seed) {
    // Ensure seed is 32-bit unsigned
    this.state = (seed >>> 0) || 1;
  }

  next() {
    // Numerical Recipes constants
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state;
  }

  nextFloat() {
    // Scale to [0,1)
    return this.next() / 0xFFFFFFFF;
  }

  range(min, max) {
    return min + (max - min) * this.nextFloat();
  }
}

export default SeededRNG;


