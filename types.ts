
export type GameState = 'menu' | 'playing' | 'levelComplete' | 'win' | 'gameOver';

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  w: number;
  h: number;
  speed: number;
}

export interface Bullet extends Point {
  vy: number;
  size: number;
}

export interface Enemy extends Point {
  vx: number;
  vy: number;
  time: number;
  size: number;
  imgIndex: number;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export interface Star extends Point {
  speed: number;
  size: number;
}
