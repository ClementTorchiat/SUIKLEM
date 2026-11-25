import { FRUITS } from './fruits.js';

export const JAR_BOUNDS = {
  width: 380,
  height: 560,
  left: 14,
  right: 366,
  top: 92,
  bottom: 544,
  dangerY: 134,
  dropY: 46,
};

export class PhysicsWorld {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.bodies = [];
    this.nextId = 1;

    this.gravityX = 0;
    this.gravityY = 1150;
    this.restitution = 0.06;
    this.wallRestitution = 0.1;
    this.friction = 0.22;
    this.linearDamping = 0.988;
    this.angularDamping = 0.88;
    this.dangerLimit = 2.2;

    this.maxDangerRatio = 0;
    this.isDangerActive = false;
    this.windTimer = 0;
    this.windDuration = 2.6;
    this.windProtectionTimer = 0;
    this.activeChaos = null;
    this._chaosTickAcc = 0;
    this.viewWidth = JAR_BOUNDS.width;
    this.jarLeft = JAR_BOUNDS.left;
    this.jarRight = JAR_BOUNDS.right;
    this.jarBottom = JAR_BOUNDS.bottom;
    this.bonkCount = 0;
  }

  setGravityY(g) {
    this.gravityY = g;
  }

  reset() {
    this.bodies = [];
    this.nextId = 1;
    this.maxDangerRatio = 0;
    this.isDangerActive = false;
    this.windTimer = 0;
    this.windProtectionTimer = 0;
    this.activeChaos = null;
    this._chaosTickAcc = 0;
    this.viewWidth = JAR_BOUNDS.width;
    this.jarLeft = JAR_BOUNDS.left;
    this.jarRight = JAR_BOUNDS.right;
    this.jarBottom = JAR_BOUNDS.bottom;
    this.bonkCount = 0;
  }

  getTelemetry() {
    let totalMass = 0;
    let kineticEnergy = 0;
    let maxSpeed = 0;
    let totalSpin = 0;
    let totalArea = 0;
    let fireCount = 0;
    let wifiCount = 0;
    let calories = 0;

    for (const b of this.bodies) {
      const spd = Math.hypot(b.vx, b.vy);
      totalMass += b.mass;
      kineticEnergy += 0.5 * b.mass * spd * spd;
      if (spd > maxSpeed) maxSpeed = spd;
      totalSpin += Math.abs(b.angularVel);
      totalArea += Math.PI * b.radius * b.radius;
      if (b.onFireTimer > 0) fireCount++;
      if (b.tier === 4) wifiCount++;
      calories += (b.tier + 1) * (b.tier + 1) * 18;
    }

    const jarArea = (this.jarRight - this.jarLeft) * Math.max(40, this.jarBottom - JAR_BOUNDS.top);
    const count = this.bodies.length;
    return {
      count,
      massKg: totalMass * 0.0042,
      kineticJ: kineticEnergy * 0.00015,
      maxSpeed,
      avgRpm: count > 0 ? (totalSpin / count) * 9.55 : 0,
      fillPct: Math.min(100, (totalArea / Math.max(1, jarArea)) * 100),
      fireCount,
      wifiCount,
      calories,
    };
  }

  triggerWind(duration = 2.6) {
    this.windDuration = duration;
    this.windTimer = duration;
    this.windProtectionTimer = duration + 1.2;
    for (const b of this.bodies) {
      b.vy -= 150 + Math.random() * 90;
      b.vx += (Math.random() - 0.5) * 180;
      b.angularVel += (Math.random() - 0.5) * 7;
      b.mood = 'bonked';
      b.moodTimer = 0.9;
      b.graceTimer = Math.max(b.graceTimer, this.windProtectionTimer);
    }
  }

  triggerChaos(event) {
    const initialPotato = event.id === 'hotpotato' && this.bodies.length > 0
      ? this.bodies[Math.floor(Math.random() * this.bodies.length)].id
      : null;

    let escapedBall = null;
    if (event.id === 'fourthwall' && this.bodies.length > 0) {
      let bestIdx = 0;
      for (let i = 1; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        const best = this.bodies[bestIdx];
        if (b.tier > best.tier || (b.tier === best.tier && b.radius > best.radius)) {
          bestIdx = i;
        }
      }
      const [removed] = this.bodies.splice(bestIdx, 1);
      escapedBall = { ...removed };
      if (this.callbacks.onChaosFx) {
        this.callbacks.onChaosFx({ type: 'fourthwallEscape', x: removed.x, y: removed.y, tier: removed.tier });
      }
    }

    this.activeChaos = {
      ...event,
      remaining: event.duration,
      elapsed: 0,
      sideDir: Math.random() < 0.5 ? -1 : 1,
      cosplayTier: event.id === 'cosplay' ? Math.floor(Math.random() * FRUITS.length) : 0,
      blackholeX: 190,
      blackholeY: 295,
      potatoId: initialPotato,
      potatoTimer: 2.8,
      ufoX: 190,
      ufoY: 74,
      ufoTargetId: null,
      ufoPhase: 'seek',
      ufoTimer: 0.35,
      ufoDestX: 190,
      escapedBall,
    };
    this._chaosTickAcc = 0;

    // Protect from unfair Game Over during physics-breaking events
    this.windProtectionTimer = Math.max(this.windProtectionTimer, event.duration + 1.4);

    if (event.id === 'wall') {
      const wallLeft = 183;
      const wallRight = 197;
      const wallTop = JAR_BOUNDS.top + 30;
      for (const b of this.bodies) {
        if (b.y + b.radius > wallTop && b.x + b.radius > wallLeft && b.x - b.radius < wallRight) {
          const goLeft = b.x < 190 || (b.x === 190 && Math.random() < 0.5);
          if (goLeft) {
            b.x = Math.max(this.jarLeft + b.radius, wallLeft - b.radius);
            b.vx = -Math.max(120, Math.abs(b.vx));
          } else {
            b.x = Math.min(this.jarRight - b.radius, wallRight + b.radius);
            b.vx = Math.max(120, Math.abs(b.vx));
          }
          b.vy -= 85;
          b.mood = 'bonked';
          b.moodTimer = 0.8;
        }
      }
    } else if (event.id === 'bouncy') {
      for (const b of this.bodies) {
        b.vy -= 460 + Math.random() * 240;
        b.vx += (Math.random() - 0.5) * 420;
        b.angularVel += (Math.random() - 0.5) * 10;
        b.mood = 'bonked';
        b.moodTimer = 1.0;
      }
    } else if (event.id === 'ghost') {
      for (const b of this.bodies) {
        b.ghostFlashTimer = 0;
      }
    } else if (event.id === 'quake') {
      for (const b of this.bodies) {
        b.vy -= 260 + Math.random() * 240;
        b.vx += (Math.random() - 0.5) * 420;
        b.angularVel += (Math.random() - 0.5) * 14;
        b.squashX = 1.26;
        b.squashY = 0.76;
        b.mood = 'bonked';
        b.moodTimer = 0.9;
        b.graceTimer = Math.max(b.graceTimer, 1.2);
      }
    } else if (event.id === 'antigrav') {
      for (const b of this.bodies) {
        b.vy -= 80;
        b.mood = 'worried';
        b.moodTimer = 1.2;
      }
    }
  }

  findFruitAt(x, y) {
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      const dx = x - b.x;
      const dy = y - b.y;
      const hitRadius = b.radius + 6;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return b;
      }
    }
    return null;
  }

  removeFruitById(id) {
    const idx = this.bodies.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const [removed] = this.bodies.splice(idx, 1);
    this._nudgeNearby(removed.x, removed.y, removed.radius + 45, 20);
    return removed;
  }

  swapFruits(idA, idB) {
    if (idA === idB) return null;
    const a = this.bodies.find((b) => b.id === idA);
    const b = this.bodies.find((b) => b.id === idB);
    if (!a || !b) return null;

    const oldAx = a.x;
    const oldAy = a.y;
    const oldBx = b.x;
    const oldBy = b.y;

    const clampBody = (body, targetX, targetY) => {
      const r = body.radius;
      body.x = Math.max(JAR_BOUNDS.left + r, Math.min(JAR_BOUNDS.right - r, targetX));
      body.y = Math.max(JAR_BOUNDS.top + r, Math.min(JAR_BOUNDS.bottom - r, targetY));
      body.vx = 0;
      body.vy = 0;
      body.angularVel = 0;
      body.squashX = 1.24;
      body.squashY = 0.78;
      body.mood = 'happy';
      body.moodTimer = 1.1;
      body.graceTimer = Math.max(body.graceTimer, 0.75);
      body.dangerTime = 0;
    };

    clampBody(a, oldBx, oldBy);
    clampBody(b, oldAx, oldAy);
    return { a, b, oldAx, oldAy, oldBx, oldBy };
  }

  nukeAt(x, y, blastRadius = 105) {
    const removed = [];
    const survivors = [];
    for (const b of this.bodies) {
      const dist = Math.hypot(b.x - x, b.y - y);
      if (dist <= blastRadius + b.radius * 0.35) {
        removed.push(b);
      } else {
        survivors.push(b);
      }
    }
    this.bodies = survivors;
    this._nudgeNearby(x, y, blastRadius + 90, 320);
    return removed;
  }

  cloneFruit(id, maxTier = 6) {
    const src = this.bodies.find((b) => b.id === id);
    if (!src || src.tier > maxTier) return null;
    const offsetSide = src.x > (this.jarLeft + this.jarRight) * 0.5 ? -1 : 1;
    const spawnX = Math.max(
      this.jarLeft + src.baseRadius,
      Math.min(this.jarRight - src.baseRadius, src.x + offsetSide * src.baseRadius * 0.85),
    );
    const spawnY = Math.max(JAR_BOUNDS.top + src.baseRadius, src.y - src.baseRadius * 0.35);
    const clone = this.spawnFruit(src.tier, spawnX, spawnY, {
      vx: -offsetSide * 45,
      vy: 20,
      squashX: 1.25,
      squashY: 0.78,
      mood: 'happy',
      moodTimer: 0.9,
      graceTimer: 0.8,
      noCharge: true,
    });
    return { src, clone };
  }

  purgeLowTiers(maxTier = 3) {
    const purged = [];
    const kept = [];
    for (const b of this.bodies) {
      if (b.tier <= maxTier) purged.push(b);
      else kept.push(b);
    }
    this.bodies = kept;
    for (const p of purged) {
      this._nudgeNearby(p.x, p.y, 70, 50);
    }
    return purged;
  }

  apocalypseUpgrade(maxTargets = 4) {
    const candidates = this.bodies.filter((b) => b.tier < FRUITS.length - 1);
    if (candidates.length === 0) return [];
    // Shuffle copy
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const chosen = candidates.slice(0, maxTargets);
    for (const b of chosen) {
      b.tier += 1;
      const def = FRUITS[b.tier];
      b.baseRadius = def.radius;
      b.radius = this.activeChaos?.id === 'inflate' ? def.radius * 1.24 : def.radius;
      b.mass = b.radius * b.radius;
      b.invMass = 1 / b.mass;
      b.x = Math.max(this.jarLeft + b.radius, Math.min(this.jarRight - b.radius, b.x));
      b.y = Math.min(this.jarBottom - b.radius, b.y);
      b.vy -= 140;
      b.squashX = 1.3;
      b.squashY = 0.74;
      b.mood = 'happy';
      b.moodTimer = 1.2;
      b.onFireTimer = 1.6;
      b.graceTimer = Math.max(b.graceTimer, 0.9);
      this._nudgeNearby(b.x, b.y, b.radius + 70, 95, b.id);
    }
    return chosen;
  }

  spawnFruit(tier, x, y, options = {}) {
    const def = FRUITS[tier];
    const r = def.radius;
    let clampedX = Math.max(this.jarLeft + r, Math.min(this.jarRight - r, x));
    if (this.activeChaos?.id === 'wall' && y + r > JAR_BOUNDS.top + 30) {
      if (clampedX + r > 183 && clampedX - r < 197) {
        clampedX = clampedX < 190 ? Math.max(this.jarLeft + r, 183 - r) : Math.min(this.jarRight - r, 197 + r);
      }
    } else if (this.activeChaos?.id === 'wall' && Math.abs(clampedX - 190) < 4) {
      clampedX = clampedX < 190 ? 185 : 195;
    }
    const body = {
      id: this.nextId++,
      tier,
      x: clampedX,
      y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      angle: options.angle ?? (Math.random() - 0.5) * 0.35,
      angularVel: options.angularVel ?? 0,
      baseRadius: r,
      radius: r,
      mass: r * r,
      invMass: 1 / (r * r),
      squashX: options.squashX ?? 1,
      squashY: options.squashY ?? 1,
      squashVelX: 0,
      squashVelY: 0,
      mood: options.mood ?? 'falling',
      moodTimer: options.moodTimer ?? 0.65,
      blinkTimer: 1.4 + Math.random() * 3.0,
      isBlinking: false,
      graceTimer: options.graceTimer ?? 0.9,
      dangerTime: 0,
      hasCollided: false,
      onFireTimer: 0,
      ghostFlashTimer: 0.65,
      noCharge: Boolean(options.noCharge),
    };
    this.bodies.push(body);
    return body;
  }

  raycastDropY(x, radius) {
    let bestY = this.jarBottom - radius;
    if (this.activeChaos?.id === 'wall' && x + radius > 183 && x - radius < 197) {
      bestY = Math.min(bestY, JAR_BOUNDS.top + 30 - radius);
    }
    for (const b of this.bodies) {
      const dx = Math.abs(x - b.x);
      const sumR = radius + b.radius;
      if (dx < sumR) {
        const dy = Math.sqrt(sumR * sumR - dx * dx);
        const contactY = b.y - dy;
        if (contactY < bestY) {
          bestY = contactY;
        }
      }
    }
    return Math.max(JAR_BOUNDS.dropY + radius, bestY);
  }

  step(dt) {
    const substeps = 4;
    const iterations = 3;
    const subDt = dt / substeps;
    const mergedIds = new Set();
    const pendingMerges = [];

    if (this.windTimer > 0) {
      this.windTimer = Math.max(0, this.windTimer - dt);
    }
    if (this.windProtectionTimer > 0) {
      this.windProtectionTimer = Math.max(0, this.windProtectionTimer - dt);
    }

    if (this.activeChaos) {
      const prevId = this.activeChaos.id;
      this.activeChaos.remaining -= dt;
      this.activeChaos.elapsed += dt;
      this._stepChaosSpecials(dt);
      if (this.activeChaos.remaining <= 0) {
        const endedChaos = this.activeChaos;
        this.activeChaos = null;
        if (prevId === 'stretch') {
          this._snapStretchBack();
        } else if (prevId === 'elevator') {
          this._snapElevatorBack();
        } else if (prevId === 'talljar') {
          this._snapTallJarBack();
        } else if (prevId === 'blackhole') {
          this._releaseBlackhole();
        } else if (prevId === 'fourthwall' && endedChaos.escapedBall) {
          this._returnEscapedBall(endedChaos.escapedBall);
        }
      }
    }

    if (this.activeChaos?.id === 'stretch') {
      this.viewWidth += (732 - this.viewWidth) * Math.min(1, dt * 7);
    } else if (this.viewWidth !== JAR_BOUNDS.width) {
      this.viewWidth = JAR_BOUNDS.width;
    }
    const halfExtra = (this.viewWidth - JAR_BOUNDS.width) * 0.5;
    this.jarLeft = JAR_BOUNDS.left - halfExtra;
    this.jarRight = JAR_BOUNDS.right + halfExtra;

    if (this.activeChaos?.id === 'elevator') {
      const liftProgress = Math.min(1, this.activeChaos.elapsed / 3.6);
      this.jarBottom = JAR_BOUNDS.bottom - liftProgress * 105;
    } else if (this.activeChaos?.id === 'talljar') {
      const dropProgress = Math.min(1, this.activeChaos.elapsed / 1.3);
      this.jarBottom = JAR_BOUNDS.bottom + dropProgress * 370;
    } else if (this.jarBottom !== JAR_BOUNDS.bottom) {
      this.jarBottom = JAR_BOUNDS.bottom;
    }

    // Smooth inflation/deflation for 'inflate' chaos
    const targetScale = this.activeChaos?.id === 'inflate' ? 1.24 : 1;
    for (const b of this.bodies) {
      const targetR = b.baseRadius * targetScale;
      b.radius += (targetR - b.radius) * Math.min(1, dt * 8);
      b.mass = b.radius * b.radius;
      b.invMass = 1 / b.mass;
      if (b.onFireTimer > 0) b.onFireTimer = Math.max(0, b.onFireTimer - dt);
    }

    const chaosId = this.activeChaos?.id ?? null;
    const gx = chaosId === 'sideways'
      ? Math.sin(this.activeChaos.elapsed * 1.4) * 850
      : chaosId === 'quake'
        ? Math.sin(this.activeChaos.elapsed * 32) * 2400
        : this.gravityX;
    const gy = chaosId === 'antigrav'
      ? -760
      : chaosId === 'blackhole'
        ? 50
        : chaosId === 'sideways'
          ? 840
          : this.gravityY;
    const activeRestitution = chaosId === 'bouncy' ? 1.03 : (chaosId === 'quake' ? 0.72 : this.restitution);
    const activeWallRest = chaosId === 'bouncy' ? 1.02 : (chaosId === 'quake' ? 0.72 : this.wallRestitution);
    const activeDamping = chaosId === 'bouncy' ? 0.999 : this.linearDamping;
    const isBouncy = chaosId === 'bouncy';

    const windActive = this.windTimer > 0 || chaosId === 'tornado';
    const swirlDir = chaosId === 'tornado'
      ? (Math.sin(this.activeChaos.elapsed * 3.1) >= 0 ? 1 : -1)
      : (Math.sin((this.windDuration - this.windTimer) * 2.5) >= 0 ? 1 : -1);
    const centerX = (JAR_BOUNDS.left + JAR_BOUNDS.right) * 0.5;
    const centerY = (JAR_BOUNDS.top + JAR_BOUNDS.bottom) * 0.54;

    for (let s = 0; s < substeps; s++) {
      if (chaosId === 'magnet') {
        const countM = this.bodies.length;
        for (let i = 0; i < countM; i++) {
          const a = this.bodies[i];
          for (let j = i + 1; j < countM; j++) {
            const b = this.bodies[j];
            if (a.tier !== b.tier) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 1 && dist < 260) {
              const pull = 480 * subDt;
              a.vx += (dx / dist) * pull;
              a.vy += (dy / dist) * pull;
              b.vx -= (dx / dist) * pull;
              b.vy -= (dy / dist) * pull;
            }
          }
        }
      }

      for (const b of this.bodies) {
        if (chaosId === 'ufo' && this.activeChaos.ufoPhase === 'carry' && b.id === this.activeChaos.ufoTargetId) {
          b.x += (this.activeChaos.ufoX - b.x) * Math.min(1, subDt * 14);
          b.y += (136 - b.y) * Math.min(1, subDt * 10);
          b.vx = 0;
          b.vy = 0;
          b.angularVel += 6 * subDt;
          b.angle += b.angularVel * subDt;
          b.mood = 'worried';
          b.moodTimer = 0.25;
          b.graceTimer = Math.max(b.graceTimer, 1.0);
          continue;
        }

        b.vx += gx * subDt;
        b.vy += gy * subDt;

        if (chaosId === 'blackhole') {
          const dx = this.activeChaos.blackholeX - b.x;
          const dy = this.activeChaos.blackholeY - b.y;
          const dist = Math.max(22, Math.hypot(dx, dy));
          const nx = dx / dist;
          const ny = dy / dist;
          const tx = -ny;
          const ty = nx;
          b.vx += (nx * 1450 + tx * 820) * subDt;
          b.vy += (ny * 1450 + ty * 820) * subDt;
          b.angularVel = Math.max(-7, Math.min(7, b.angularVel + 10 * subDt));
          b.graceTimer = Math.max(b.graceTimer, 1.0);
        }

        if (windActive) {
          const dx = b.x - centerX;
          const dy = b.y - centerY;
          const dist = Math.max(24, Math.hypot(dx, dy));
          const tx = -dy / dist;
          const ty = dx / dist;
          const swirlForce = 1850 * swirlDir;
          const liftForce = b.y > centerY ? -1450 : -520;
          b.vx += (tx * swirlForce - (dx / dist) * 260) * subDt;
          b.vy += (ty * swirlForce + liftForce) * subDt;
          b.angularVel = Math.max(-7, Math.min(7, b.angularVel + swirlDir * 14 * subDt));
          if (b.mood !== 'happy') {
            b.mood = 'bonked';
            b.moodTimer = 0.3;
          }
        }

        b.vx *= Math.pow(activeDamping, subDt * 60);
        b.vy *= Math.pow(activeDamping, subDt * 60);
        b.angularVel *= Math.pow(this.angularDamping, subDt * 60);

        // Keep bouncy / blackhole speeds thrilling without exploding to infinity
        if (isBouncy || chaosId === 'blackhole') {
          const maxSpd = isBouncy ? 900 : 680;
          const spd = Math.hypot(b.vx, b.vy);
          if (spd > maxSpd) {
            const scale = maxSpd / spd;
            b.vx *= scale;
            b.vy *= scale;
          }
        }

        b.x += b.vx * subDt;
        b.y += b.vy * subDt;
        b.angle += b.angularVel * subDt;

        // Keep fruits bounded inside top of jar during chaotic upward events
        if (
          (windActive || chaosId === 'bouncy' || chaosId === 'quake' || chaosId === 'antigrav' || chaosId === 'popcorn' || chaosId === 'blackhole' || chaosId === 'hotpotato')
          && b.y - b.radius < JAR_BOUNDS.top
        ) {
          b.y = JAR_BOUNDS.top + b.radius;
          if (b.vy < 0) b.vy = -b.vy * (chaosId === 'antigrav' ? 0.15 : 0.35);
        }
      }

      const count = this.bodies.length;
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < count; i++) {
          const a = this.bodies[i];
          for (let j = i + 1; j < count; j++) {
            const b = this.bodies[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = a.radius + b.radius;
            const distSq = dx * dx + dy * dy;

            if (distSq >= minDist * minDist) continue;

            if (chaosId !== 'strike' && a.tier === b.tier && !mergedIds.has(a.id) && !mergedIds.has(b.id)) {
              mergedIds.add(a.id);
              mergedIds.add(b.id);
              pendingMerges.push([a, b]);
              continue;
            }

            this._resolvePair(a, b, dx, dy, distSq, minDist, s === 0 && iter === 0, activeRestitution);
          }
        }

        const isWallActive = chaosId === 'wall';
        for (const b of this.bodies) {
          this._solveWallCollisions(b, s === 0 && iter === 0, activeWallRest, isBouncy, isWallActive);
        }
      }
    }

    for (const b of this.bodies) {
      if (Math.abs(b.vx) < 3 && Math.abs(b.vy) < 3) {
        b.vx *= 0.6;
        b.vy *= 0.6;
      }
      if (Math.abs(b.angularVel) < 0.08) {
        b.angularVel = 0;
      }
    }

    if (pendingMerges.length > 0) {
      this._processMerges(pendingMerges, mergedIds);
    }

    this._updateVisualStatesAndDanger(dt);
  }

  _stepChaosSpecials(dt) {
    const id = this.activeChaos.id;
    if (id === 'quake' && this.bodies.length > 0) {
      this._chaosTickAcc += dt;
      if (this._chaosTickAcc >= 0.24) {
        this._chaosTickAcc = 0;
        for (const b of this.bodies) {
          b.vy -= 170 + Math.random() * 240;
          b.vx += (Math.random() - 0.5) * 380;
          b.angularVel += (Math.random() - 0.5) * 12;
          b.squashX = 1.22;
          b.squashY = 0.8;
          b.mood = 'bonked';
          b.moodTimer = 0.5;
          b.graceTimer = Math.max(b.graceTimer, 1.0);
        }
        if (this.callbacks.onChaosFx) {
          const rx = 60 + Math.random() * 260;
          const ry = 260 + Math.random() * 240;
          this.callbacks.onChaosFx({ type: 'quakeJolt', x: rx, y: ry, tier: 8 });
        }
      }
    } else if (id === 'popcorn' && this.bodies.length > 0) {
      this._chaosTickAcc += dt;
      if (this._chaosTickAcc >= 0.72) {
        this._chaosTickAcc = 0;
        const target = this.bodies[Math.floor(Math.random() * this.bodies.length)];
        target.vy = -420 - Math.random() * 140;
        target.vx += (Math.random() - 0.5) * 260;
        target.angularVel += (Math.random() - 0.5) * 10;
        target.squashX = 1.32;
        target.squashY = 0.72;
        target.onFireTimer = 1.6;
        target.mood = 'bonked';
        target.moodTimer = 0.7;
        if (this.callbacks.onChaosFx) {
          this.callbacks.onChaosFx({ type: 'popcorn', x: target.x, y: target.y, tier: target.tier });
        }
      }
    } else if (id === 'rain') {
      this._chaosTickAcc += dt;
      if (this._chaosTickAcc >= 1.1 && this.bodies.length < 28) {
        this._chaosTickAcc = 0;
        const miniTier = Math.random() < 0.65 ? 0 : 1;
        const rx = this.jarLeft + 30 + Math.random() * (this.jarRight - this.jarLeft - 60);
        const dropped = this.spawnFruit(miniTier, rx, JAR_BOUNDS.top + 10, {
          vy: 140,
          vx: (Math.random() - 0.5) * 100,
          mood: 'falling',
          graceTimer: 1.5,
        });
        if (this.callbacks.onChaosFx) {
          this.callbacks.onChaosFx({ type: 'rain', x: dropped.x, y: dropped.y, tier: miniTier });
        }
      }
    } else if (id === 'ufo') {
      const c = this.activeChaos;
      c.ufoTimer -= dt;
      if (c.ufoPhase === 'seek') {
        c.ufoX += Math.sin(c.elapsed * 3.5) * 90 * dt;
        c.ufoX = Math.max(this.jarLeft + 34, Math.min(this.jarRight - 34, c.ufoX));
        if (c.ufoTimer <= 0 && this.bodies.length > 0) {
          const target = this.bodies[Math.floor(Math.random() * this.bodies.length)];
          c.ufoTargetId = target.id;
          c.ufoPhase = 'carry';
          c.ufoTimer = 1.65;
          c.ufoDestX = target.x < 190 ? 290 : 90;
          if (this.callbacks.onChaosFx) {
            this.callbacks.onChaosFx({ type: 'ufoBeam', x: target.x, y: target.y, tier: target.tier });
          }
        }
      } else if (c.ufoPhase === 'carry') {
        const target = this.bodies.find((b) => b.id === c.ufoTargetId);
        if (!target) {
          c.ufoPhase = 'seek';
          c.ufoTimer = 0.5;
          c.ufoTargetId = null;
        } else {
          c.ufoX += (c.ufoDestX - c.ufoX) * Math.min(1, dt * 3.2);
          if (c.ufoTimer <= 0) {
            target.vx = (Math.random() - 0.5) * 80;
            target.vy = 160;
            c.ufoTargetId = null;
            c.ufoPhase = 'seek';
            c.ufoTimer = 0.75;
          }
        }
      }
    } else if (id === 'hotpotato') {
      const c = this.activeChaos;
      let potato = this.bodies.find((b) => b.id === c.potatoId);
      if (!potato && this.bodies.length > 0) {
        potato = this.bodies[Math.floor(Math.random() * this.bodies.length)];
        c.potatoId = potato.id;
        c.potatoTimer = 2.6;
      }
      if (potato) {
        c.potatoTimer -= dt;
        if (c.potatoTimer <= 0) {
          this.windProtectionTimer = Math.max(this.windProtectionTimer, 1.5);
          this._nudgeNearby(potato.x, potato.y, 190, 480, potato.id);
          potato.vy -= 420;
          potato.vx += (Math.random() - 0.5) * 260;
          potato.onFireTimer = 1.8;
          potato.mood = 'bonked';
          potato.moodTimer = 1.0;
          for (const b of this.bodies) {
            b.graceTimer = Math.max(b.graceTimer, 1.3);
            if (Math.hypot(b.x - potato.x, b.y - potato.y) < 160) {
              b.vy -= 220;
              b.onFireTimer = Math.max(b.onFireTimer, 1.0);
            }
          }
          if (this.callbacks.onChaosFx) {
            this.callbacks.onChaosFx({ type: 'potatoBoom', x: potato.x, y: potato.y, tier: potato.tier });
          }
          const next = this.bodies[Math.floor(Math.random() * this.bodies.length)];
          c.potatoId = next ? next.id : null;
          c.potatoTimer = 2.6;
        }
      }
    } else if (id === 'swap' && this.bodies.length >= 2) {
      this._chaosTickAcc += dt;
      if (this._chaosTickAcc >= 1.25) {
        this._chaosTickAcc = 0;
        const idxA = Math.floor(Math.random() * this.bodies.length);
        let idxB = Math.floor(Math.random() * (this.bodies.length - 1));
        if (idxB >= idxA) idxB += 1;
        const a = this.bodies[idxA];
        const b = this.bodies[idxB];
        const ax = a.x;
        const ay = a.y;
        a.x = Math.max(this.jarLeft + a.radius, Math.min(this.jarRight - a.radius, b.x));
        a.y = Math.min(this.jarBottom - a.radius, Math.max(JAR_BOUNDS.top + a.radius, b.y));
        b.x = Math.max(this.jarLeft + b.radius, Math.min(this.jarRight - b.radius, ax));
        b.y = Math.min(this.jarBottom - b.radius, Math.max(JAR_BOUNDS.top + b.radius, ay));
        a.vx *= 0.25;
        b.vx *= 0.25;
        a.vy = -80;
        b.vy = -80;
        a.ghostFlashTimer = 0.7;
        b.ghostFlashTimer = 0.7;
        a.mood = 'bonked';
        b.mood = 'bonked';
        a.moodTimer = 0.6;
        b.moodTimer = 0.6;
        if (this.callbacks.onChaosFx) {
          this.callbacks.onChaosFx({ type: 'swap', x: a.x, y: a.y, x2: b.x, y2: b.y, tier: a.tier });
        }
      }
    }
  }

  _snapStretchBack() {
    this.viewWidth = JAR_BOUNDS.width;
    this.jarLeft = JAR_BOUNDS.left;
    this.jarRight = JAR_BOUNDS.right;
    this.windProtectionTimer = Math.max(this.windProtectionTimer, 1.5);

    for (const b of this.bodies) {
      const r = b.radius;
      const wasOutside = b.x - r < this.jarLeft || b.x + r > this.jarRight;
      b.x = Math.max(this.jarLeft + r, Math.min(this.jarRight - r, b.x));
      if (wasOutside) {
        b.vx = (190 - b.x) * 3.4;
        b.vy -= 260 + Math.random() * 140;
        b.squashX = 0.72;
        b.squashY = 1.32;
        b.onFireTimer = 1.5;
        b.mood = 'bonked';
        b.moodTimer = 1.1;
        b.graceTimer = Math.max(b.graceTimer, 1.5);
      } else {
        b.vy -= 90;
      }
    }
    if (this.callbacks.onChaosFx) {
      this.callbacks.onChaosFx({ type: 'slam', x: 190, y: 320, tier: 10 });
    }
  }

  _snapElevatorBack() {
    this.jarBottom = JAR_BOUNDS.bottom;
    this.windProtectionTimer = Math.max(this.windProtectionTimer, 1.5);
    for (const b of this.bodies) {
      b.vy = Math.max(b.vy, 320 + Math.random() * 140);
      b.squashX = 0.78;
      b.squashY = 1.24;
      b.mood = 'bonked';
      b.moodTimer = 1.0;
      b.graceTimer = Math.max(b.graceTimer, 1.4);
    }
    if (this.callbacks.onChaosFx) {
      this.callbacks.onChaosFx({ type: 'elevatorSlam', x: 190, y: 440, tier: 10 });
    }
  }

  _snapTallJarBack() {
    this.jarBottom = JAR_BOUNDS.bottom;
    this.windProtectionTimer = Math.max(this.windProtectionTimer, 2.0);
    for (const b of this.bodies) {
      const r = b.radius;
      const wasInAbyss = b.y + r > JAR_BOUNDS.bottom;
      b.y = Math.min(JAR_BOUNDS.bottom - r, b.y);
      if (wasInAbyss) {
        b.vy = -380 - Math.random() * 220;
        b.vx += (Math.random() - 0.5) * 180;
        b.squashX = 0.75;
        b.squashY = 1.28;
        b.onFireTimer = 1.4;
        b.mood = 'bonked';
        b.moodTimer = 1.2;
        b.graceTimer = Math.max(b.graceTimer, 1.8);
      } else {
        b.vy -= 120;
      }
    }
    if (this.callbacks.onChaosFx) {
      this.callbacks.onChaosFx({ type: 'talljarSnap', x: 190, y: 520, tier: 10 });
    }
  }

  _releaseBlackhole() {
    this.windProtectionTimer = Math.max(this.windProtectionTimer, 1.4);
    for (const b of this.bodies) {
      b.vx += (Math.random() - 0.5) * 140;
      b.vy -= 60;
      b.graceTimer = Math.max(b.graceTimer, 1.2);
    }
  }

  _returnEscapedBall(escaped) {
    this.windProtectionTimer = Math.max(this.windProtectionTimer, 2.0);
    const def = FRUITS[escaped.tier];
    const r = def.radius;
    const x = Math.max(this.jarLeft + r, Math.min(this.jarRight - r, 190));
    const y = JAR_BOUNDS.top + r + 8;
    const returned = this.spawnFruit(escaped.tier, x, y, {
      vy: 180,
      vx: (Math.random() - 0.5) * 60,
      squashX: 1.3,
      squashY: 0.72,
      mood: 'happy',
      moodTimer: 1.4,
      graceTimer: 1.8,
      noCharge: Boolean(escaped.noCharge),
    });
    returned.ghostFlashTimer = 0.8;
    if (this.callbacks.onChaosFx) {
      this.callbacks.onChaosFx({ type: 'fourthwallReturn', x, y, tier: escaped.tier });
    }
    return returned;
  }

  _solveWallCollisions(b, allowAudio, wallRest = this.wallRestitution, isBouncy = false, isWallActive = false) {
    const left = this.jarLeft;
    const right = this.jarRight;
    const bottom = this.jarBottom;
    const r = b.radius;

    if (b.y + r >= bottom) {
      b.y = bottom - r;
      if (b.vy > 0) {
        const impact = b.vy;
        if (isBouncy) {
          b.vy = -Math.max(360, impact * wallRest);
          b.vx += (Math.random() - 0.5) * 70;
        } else {
          b.vy = impact < 55 ? 0 : -b.vy * wallRest;
          b.vx *= 0.92;
        }
        b.angularVel = Math.max(-5, Math.min(5, (b.vx / r) * 0.5));
        this._onImpact(b, impact, allowAudio);
      } else if (isBouncy && Math.abs(b.vy) < 40) {
        b.vy = -380;
      }
    }

    if (b.x - r < left) {
      b.x = left + r;
      if (b.vx < 0) {
        const impact = -b.vx;
        b.vx = isBouncy ? Math.max(160, impact * wallRest) : -b.vx * wallRest;
        if (!isBouncy && Math.abs(b.vx) < 25) b.vx = 0;
        b.angularVel = Math.max(-7, Math.min(7, b.angularVel - (b.vy / r) * 0.08));
        this._onImpact(b, impact, allowAudio);
      }
    }

    if (b.x + r > right) {
      b.x = right - r;
      if (b.vx > 0) {
        const impact = b.vx;
        b.vx = isBouncy ? -Math.max(160, impact * wallRest) : -b.vx * wallRest;
        if (!isBouncy && Math.abs(b.vx) < 25) b.vx = 0;
        b.angularVel = Math.max(-7, Math.min(7, b.angularVel + (b.vy / r) * 0.08));
        this._onImpact(b, impact, allowAudio);
      }
    }

    if (isWallActive) {
      const wallLeft = 183;
      const wallRight = 197;
      const wallTop = JAR_BOUNDS.top + 30;
      if (b.y + r > wallTop && b.x + r > wallLeft && b.x - r < wallRight) {
        const penLeft = b.x + r - wallLeft;
        const penRight = wallRight - (b.x - r);
        const penTop = b.y + r - wallTop;
        if (penTop <= penLeft && penTop <= penRight && b.y < wallTop + 6) {
          b.y = wallTop - r;
          if (b.vy > 0) {
            const impact = b.vy;
            b.vy = -b.vy * wallRest;
            this._onImpact(b, impact, allowAudio);
          }
          if (Math.abs(b.x - 190) < 3) {
            b.vx += b.x >= 190 ? 32 : -32;
          }
        } else if (penLeft <= penRight) {
          b.x = wallLeft - r;
          if (b.vx > 0) {
            const impact = b.vx;
            b.vx = isBouncy ? -Math.max(160, impact * wallRest) : -b.vx * wallRest;
            this._onImpact(b, impact, allowAudio);
          }
        } else {
          b.x = wallRight + r;
          if (b.vx < 0) {
            const impact = -b.vx;
            b.vx = isBouncy ? Math.max(160, impact * wallRest) : -b.vx * wallRest;
            this._onImpact(b, impact, allowAudio);
          }
        }
      }
    }
  }

  _resolvePair(a, b, dx, dy, distSq, minDist, allowAudio, restitution = this.restitution) {
    let dist = Math.sqrt(distSq);
    let nx = 0;
    let ny = -1;
    if (dist > 0.0001) {
      nx = dx / dist;
      ny = dy / dist;
    } else {
      dist = 0.0001;
    }

    const overlap = minDist - dist;
    const totalInvMass = a.invMass + b.invMass;

    const slop = 0.04;
    const percent = 0.42;
    const corrMag = (Math.max(0, overlap - slop) / totalInvMass) * percent;
    a.x -= nx * corrMag * a.invMass;
    a.y -= ny * corrMag * a.invMass;
    b.x += nx * corrMag * b.invMass;
    b.y += ny * corrMag * b.invMass;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return;

    const e = restitution >= 1 ? restitution : (Math.abs(velAlongNormal) < 60 ? 0 : restitution);
    const j = (-(1 + e) * velAlongNormal) / totalInvMass;

    const impulseX = j * nx;
    const impulseY = j * ny;
    a.vx -= impulseX * a.invMass;
    a.vy -= impulseY * a.invMass;
    b.vx += impulseX * b.invMass;
    b.vy += impulseY * b.invMass;

    const tx = -ny;
    const ty = nx;
    const relTan = rvx * tx + rvy * ty - (a.angularVel * a.radius + b.angularVel * b.radius);
    const jt = -relTan / (3 * totalInvMass);
    const maxJt = Math.max(0, j * this.friction);
    const clampedJt = Math.max(-maxJt, Math.min(maxJt, jt));

    a.vx -= tx * clampedJt * a.invMass;
    a.vy -= ty * clampedJt * a.invMass;
    b.vx += tx * clampedJt * b.invMass;
    b.vy += ty * clampedJt * b.invMass;

    a.angularVel = Math.max(-7, Math.min(7, a.angularVel - (2 * clampedJt) / (a.mass * a.radius)));
    b.angularVel = Math.max(-7, Math.min(7, b.angularVel - (2 * clampedJt) / (b.mass * b.radius)));

    const impactSpeed = -velAlongNormal;
    this._onImpact(a, impactSpeed, allowAudio, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    this._onImpact(b, impactSpeed, false);
  }

  _onImpact(body, speed, allowAudio, hitX = body.x, hitY = body.y) {
    body.hasCollided = true;
    body.graceTimer = Math.min(body.graceTimer, 0.25);
    if (speed > 95) {
      body.ghostFlashTimer = Math.max(body.ghostFlashTimer, 0.45);
    }

    if (speed > 130) {
      const amt = Math.min(0.22, speed * 0.00045);
      body.squashX = Math.max(body.squashX, 1 + amt);
      body.squashY = Math.min(body.squashY, 1 - amt * 0.85);
      if (speed > 210 && body.mood !== 'happy') {
        body.mood = 'bonked';
        body.moodTimer = 0.45;
      }
      if (speed > 320) {
        body.onFireTimer = Math.max(body.onFireTimer, 1.0);
        if (allowAudio && this.callbacks.onChaosFx) {
          this.callbacks.onChaosFx({ type: 'bonk', x: hitX, y: hitY, tier: body.tier });
        }
      }
    }

    if (speed > 115) {
      this.bonkCount += 1;
    }
    if (allowAudio && speed > 75 && this.callbacks.onBump) {
      this.callbacks.onBump(speed);
    }
  }

  _processMerges(pendingMerges, mergedIds) {
    this.bodies = this.bodies.filter((b) => !mergedIds.has(b.id));

    for (const [a, b] of pendingMerges) {
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const isWatermelonPair = a.tier >= FRUITS.length - 1;
      const fromPower = Boolean(a.noCharge || b.noCharge);

      if (isWatermelonPair) {
        this._nudgeNearby(mx, my, 150, 70);
        if (this.callbacks.onMerge) {
          this.callbacks.onMerge({
            x: mx,
            y: my,
            newTier: a.tier,
            isMaxPop: true,
            fromPower,
          });
        }
        continue;
      }

      const nextTier = a.tier + 1;
      const nextDef = FRUITS[nextTier];
      const clampedX = Math.max(
        this.jarLeft + nextDef.radius,
        Math.min(this.jarRight - nextDef.radius, mx),
      );
      const clampedY = Math.min(this.jarBottom - nextDef.radius, my);

      const newBody = this.spawnFruit(nextTier, clampedX, clampedY, {
        vx: (a.vx + b.vx) * 0.25,
        vy: Math.min((a.vy + b.vy) * 0.25, 0),
        angle: (a.angle + b.angle) * 0.5,
        squashX: 1.24,
        squashY: 0.78,
        mood: 'happy',
        moodTimer: 1.1,
        graceTimer: 0.35,
      });
      newBody.hasCollided = true;
      if (nextTier >= 4) newBody.onFireTimer = 1.4;

      this._nudgeNearby(clampedX, clampedY, nextDef.radius + 55, 34, newBody.id);

      if (this.callbacks.onMerge) {
        this.callbacks.onMerge({
          x: clampedX,
          y: clampedY,
          newTier: nextTier,
          isMaxPop: false,
          fromPower,
          body: newBody,
        });
      }
    }
  }

  _nudgeNearby(cx, cy, range, force, ignoreId = -1) {
    for (const b of this.bodies) {
      if (b.id === ignoreId) continue;
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 1 && dist < range) {
        const falloff = 1 - dist / range;
        b.vx += (dx / dist) * force * falloff;
        b.vy += (dy / dist) * force * falloff;
      }
    }
  }

  _updateVisualStatesAndDanger(dt) {
    let highestDanger = 0;
    let anyDanger = false;

    for (const b of this.bodies) {
      const stiffness = 210;
      const damping = 16;
      const ax = (1 - b.squashX) * stiffness - b.squashVelX * damping;
      const ay = (1 - b.squashY) * stiffness - b.squashVelY * damping;
      b.squashVelX += ax * dt;
      b.squashVelY += ay * dt;
      b.squashX += b.squashVelX * dt;
      b.squashY += b.squashVelY * dt;

      if (b.graceTimer > 0) b.graceTimer = Math.max(0, b.graceTimer - dt);
      if (b.ghostFlashTimer > 0) b.ghostFlashTimer = Math.max(0, b.ghostFlashTimer - dt);
      if (b.moodTimer > 0) {
        b.moodTimer -= dt;
        if (b.moodTimer <= 0) b.mood = 'idle';
      }

      b.blinkTimer -= dt;
      if (b.blinkTimer <= 0) {
        b.isBlinking = !b.isBlinking;
        b.blinkTimer = b.isBlinking ? 0.13 : 2.0 + Math.random() * 3.5;
      }

      const topEdge = b.y - b.radius;
      if (this.windProtectionTimer <= 0 && b.graceTimer <= 0 && topEdge < JAR_BOUNDS.dangerY) {
        anyDanger = true;
        b.dangerTime += dt;
        b.mood = 'worried';
        b.moodTimer = 0.2;
        if (b.dangerTime > highestDanger) {
          highestDanger = b.dangerTime;
        }
      } else {
        b.dangerTime = Math.max(0, b.dangerTime - dt * 2.5);
      }
    }

    this.isDangerActive = anyDanger && highestDanger > 0.35;
    this.maxDangerRatio = Math.min(1, highestDanger / this.dangerLimit);

    if (highestDanger >= this.dangerLimit && this.callbacks.onGameOver) {
      this.callbacks.onGameOver();
    }
  }
}
