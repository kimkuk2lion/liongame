import { GAME_HEIGHT, GAME_WIDTH, MARBLE_SIZE, MOVE_RANDOM } from "./constants";

type Hole = {
  id: number;
  x: number;
  y: number;
};

type Marble = {
  id: number;
  x: number;
  y: number;
  lion: boolean;
  hole: number;
  alive: boolean;
  inHole: boolean;
};

const HOLES: Hole[] = [
  { id: 0, x: 300, y: 950 },
  { id: 1, x: 300, y: 700 },
  { id: 2, x: 300, y: 400 },
  { id: 3, x: 500, y: 400 },
  { id: 4, x: 100, y: 400 },
  { id: 5, x: 300, y: 150 },
];

type RenderArgs = {
  turn: number;
  marbles: Marble[];
  holes: Hole[];
  state: State;
  wallCollisions: {
    marbleId: number;
    x: number;
    y: number;
  }[];
  eatenMarbles: {
    eaterId: number;
    eatenId: number;
    eaterX: number;
    eaterY: number;
    eatenX: number;
    eatenY: number;
  }[];
};

type RenderFunction = (args: RenderArgs) => void;
type State = "wait_move" | "moving";
type BoardBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const MARBLE_RADIUS = MARBLE_SIZE / 2;
const HOLE_RADIUS = 35 / 2;
const PHYSICS_STEP = 1 / 120;
const PHYSICS_INTERVAL = 8;
const FRICTION = 900;
const RESTITUTION = 0.82;
const MAX_LAUNCH_SPEED = 1800;
const STOP_SPEED = 10;
const MAX_SIMULATION_STEPS = 720;

export class System {
  private turn: number = 0;
  private marbles: Marble[];
  private holes: Hole[] = HOLES;
  private state: State = "wait_move";
  private wallCollisions: RenderArgs["wallCollisions"] = [];
  private eatenMarbles: RenderArgs["eatenMarbles"] = [];
  debugInfo: string;

  constructor(
    private marbleCount: number,
    private renderFunction: RenderFunction,
    private boardBounds: BoardBounds
  ) {
    this.marbles = [];
    for (let i = 0; i < marbleCount; i += 1) {
      this.marbles.push({
        id: i,
        hole: 0,
        lion: false,
        x: 100 + i * 130,
        y: 1200,
        alive: true,
        inHole: false,
      });
    }
    this.debugInfo = `r:${MOVE_RANDOM}`;
  }

  moveMarble(x: number, y: number) {
    x = clamp(x, 10, GAME_WIDTH - 10);
    y = clamp(y, 10, GAME_HEIGHT - 10);
    if (this.state !== "wait_move") {
      throw Error("not wait_move");
    }
    this.state = "moving";
    const marble = this.marbles[this.turn];
    marble.inHole = false;
    const velocityX = new Array<number>(this.marbleCount).fill(0);
    const velocityY = new Array<number>(this.marbleCount).fill(0);
    const launchX = x - marble.x;
    const launchY = y - marble.y;
    const launchDistance = Math.hypot(launchX, launchY);
    if (launchDistance === 0) {
      this.state = "wait_move";
      return;
    }
    const launchSpeed = Math.min(launchDistance * 4, MAX_LAUNCH_SPEED);
    velocityX[marble.id] = (launchX / launchDistance) * launchSpeed;
    velocityY[marble.id] = (launchY / launchDistance) * launchSpeed;

    let steps = 0;
    const simulate = () => {
      steps += 1;
      const moving = this.marbles.map((ball) => {
        if (!ball.alive || ball.inHole) {
          velocityX[ball.id] = 0;
          velocityY[ball.id] = 0;
          return false;
        }
        return Math.hypot(velocityX[ball.id], velocityY[ball.id]) >= STOP_SPEED;
      });

      for (const ball of this.marbles) {
        if (!moving[ball.id]) {
          continue;
        }
        ball.x += velocityX[ball.id] * PHYSICS_STEP;
        ball.y += velocityY[ball.id] * PHYSICS_STEP;

        if (this.checkWallCollision(ball)) {
          velocityX[ball.id] = 0;
          velocityY[ball.id] = 0;
          if (ball.id === marble.id) {
            velocityX.fill(0);
            velocityY.fill(0);
          }
          continue;
        }

        if (this.checkHoleCollision(ball)) {
          velocityX[ball.id] = 0;
          velocityY[ball.id] = 0;
        }
      }

      for (let i = 0; i < this.marbles.length; i += 1) {
        const first = this.marbles[i];
        if (!first.alive || first.inHole) {
          continue;
        }
        for (let j = i + 1; j < this.marbles.length; j += 1) {
          const second = this.marbles[j];
          if (!second.alive || second.inHole) {
            continue;
          }
          this.resolveMarbleCollision(first, second, marble, velocityX, velocityY);
        }
      }

      let anyMoving = false;
      for (const ball of this.marbles) {
        if (!ball.alive || ball.inHole) {
          velocityX[ball.id] = 0;
          velocityY[ball.id] = 0;
          continue;
        }
        const speed = Math.hypot(velocityX[ball.id], velocityY[ball.id]);
        if (speed > 0) {
          const reducedSpeed = Math.max(0, speed - FRICTION * PHYSICS_STEP);
          const scale = reducedSpeed / speed;
          velocityX[ball.id] *= scale;
          velocityY[ball.id] *= scale;
        }
        if (Math.hypot(velocityX[ball.id], velocityY[ball.id]) < STOP_SPEED) {
          velocityX[ball.id] = 0;
          velocityY[ball.id] = 0;
        } else {
          anyMoving = true;
        }
      }

      if (anyMoving && steps < MAX_SIMULATION_STEPS) {
        this.render();
        setTimeout(simulate, PHYSICS_INTERVAL);
        return;
      }

      velocityX.fill(0);
      velocityY.fill(0);
      this.state = "wait_move";
      this.nextTurn();
      this.render();
    };
    simulate();
  }

  private nextTurn() {
    this.turn += 1;
    if (this.turn === this.marbleCount) {
      this.turn = 0;
    }
    const turnMarble = this.marbles[this.turn];
    if (!turnMarble.alive) {
      this.nextTurn();
    }
  }

  private checkWallCollision(marble: Marble): boolean {
    const { left, right, top, bottom } = this.boardBounds;
    if (
      marble.x - MARBLE_RADIUS < left ||
      marble.x + MARBLE_RADIUS > right ||
      marble.y - MARBLE_RADIUS < top ||
      marble.y + MARBLE_RADIUS > bottom
    ) {
      this.wallCollisions.push({ marbleId: marble.id, x: marble.x, y: marble.y });
      marble.x = 100 + marble.id * 130;
      marble.y = 1200;
      marble.hole = 0;
      marble.lion = false;
      marble.alive = true;
      marble.inHole = false;
      return true;
    }

    return false;
  }

  private checkHoleCollision(marble: Marble): boolean {
    if (!marble.lion) {
      const targetHole = this.holes[marble.hole];

      if (collision(targetHole.x, targetHole.y, marble.x, marble.y, HOLE_RADIUS, MARBLE_RADIUS)) {
        this.nextHole(marble);
        return true;
      }
    }

    return false;
  }

  private resolveMarbleCollision(
    first: Marble,
    second: Marble,
    activeMarble: Marble,
    velocityX: number[],
    velocityY: number[]
  ) {
    let dx = second.x - first.x;
    let dy = second.y - first.y;
    let distance = Math.hypot(dx, dy);
    const minDistance = MARBLE_RADIUS * 2;
    if (distance >= minDistance) {
      return;
    }

    if (distance === 0) {
      const relativeX = velocityX[second.id] - velocityX[first.id];
      const relativeY = velocityY[second.id] - velocityY[first.id];
      distance = Math.hypot(relativeX, relativeY) || 1;
      dx = relativeX || 1;
      dy = relativeY;
    }
    const normalX = dx / distance;
    const normalY = dy / distance;

    if (first.id === activeMarble.id && first.lion) {
      this.eatenMarbles.push({
        eaterId: first.id,
        eatenId: second.id,
        eaterX: first.x,
        eaterY: first.y,
        eatenX: second.x,
        eatenY: second.y,
      });
      second.alive = false;
      second.inHole = false;
      velocityX[second.id] = 0;
      velocityY[second.id] = 0;
      velocityX[first.id] = 0;
      velocityY[first.id] = 0;
      return;
    }
    if (second.id === activeMarble.id && second.lion) {
      this.eatenMarbles.push({
        eaterId: second.id,
        eatenId: first.id,
        eaterX: second.x,
        eaterY: second.y,
        eatenX: first.x,
        eatenY: first.y,
      });
      first.alive = false;
      first.inHole = false;
      velocityX[first.id] = 0;
      velocityY[first.id] = 0;
      velocityX[second.id] = 0;
      velocityY[second.id] = 0;
      return;
    }
    if (first.id === activeMarble.id && second.lion) {
      first.alive = false;
      first.inHole = false;
      velocityX[first.id] = 0;
      velocityY[first.id] = 0;
      return;
    }
    if (second.id === activeMarble.id && first.lion) {
      second.alive = false;
      second.inHole = false;
      velocityX[second.id] = 0;
      velocityY[second.id] = 0;
      return;
    }

    const overlap = minDistance - distance;
    first.x -= (normalX * overlap) / 2;
    first.y -= (normalY * overlap) / 2;
    second.x += (normalX * overlap) / 2;
    second.y += (normalY * overlap) / 2;

    const relativeVelocity =
      (velocityX[second.id] - velocityX[first.id]) * normalX +
      (velocityY[second.id] - velocityY[first.id]) * normalY;
    if (relativeVelocity < 0) {
      const impulse = (-(1 + RESTITUTION) * relativeVelocity) / 2;
      velocityX[first.id] -= impulse * normalX;
      velocityY[first.id] -= impulse * normalY;
      velocityX[second.id] += impulse * normalX;
      velocityY[second.id] += impulse * normalY;
    }
  }

  private nextHole(marble: Marble) {
    const targetHole = this.holes[marble.hole];
    marble.inHole = true;
    marble.x = targetHole.x;
    marble.y = targetHole.y;
    marble.hole += 1;
    if (marble.hole === this.holes.length) {
      marble.lion = true;
    }
  }

  render() {
    this.renderFunction({
      turn: this.turn,
      holes: this.holes,
      marbles: this.marbles,
      state: this.state,
      wallCollisions: this.wallCollisions,
      eatenMarbles: this.eatenMarbles,
    });
    this.wallCollisions = [];
    this.eatenMarbles = [];
  }
}

function collision(x1: number, y1: number, x2: number, y2: number, d1: number, d2: number) {
  const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  return distance <= d1 + d2;
}

function clamp(v: number, min: number, max: number) {
  if (v < min) {
    return min;
  }
  if (v > max) {
    return max;
  }
  return v;
}
