import {Point, Graphics, Container, loader, extras, Text} from 'pixi.js';
import BPromise from 'bluebird';
import {some as _some} from 'lodash/collection';
import {delay as _delay} from 'lodash/function';
import {inRange as _inRange} from 'lodash/number';
import {TweenMax, Power2} from 'gsap';
import Utils from '../libs/utils';
import Duck from './Duck';
import Dog from './Dog';
import Hud from './Hud';
import duckTypesData from '../data/duckTypes.json';

const MAX_X = 800;
const MAX_Y = 600;

const DUCK_POINTS = {
  ORIGIN: new Point(MAX_X / 2, MAX_Y)
};
const DOG_POINTS = {
  DOWN: new Point(MAX_X / 2, MAX_Y),
  UP: new Point(MAX_X / 2, MAX_Y - 230),
  SNIFF_START: new Point(0, MAX_Y - 130),
  SNIFF_END: new Point(MAX_X / 2, MAX_Y - 130)
};
const HUD_LOCATIONS = {
  SCORE: new Point(MAX_X - 10, 10),
  WAVE_STATUS: new Point(MAX_X - 11, MAX_Y - 30),
  LEVEL_CREATOR_LINK: new Point(MAX_X - 11, MAX_Y - 10),
  FULL_SCREEN_LINK: new Point(MAX_X - 130, MAX_Y - 10),
  PAUSE_LINK: new Point(MAX_X - 318, MAX_Y - 10),
  MUTE_LINK: new Point(MAX_X - 236, MAX_Y - 10),
  GAME_STATUS: new Point(MAX_X / 2, MAX_Y * 0.45),
  REPLAY_BUTTON: new Point(MAX_X / 2, MAX_Y * 0.56),
  BULLET_STATUS: new Point(10, 10),
  DEAD_DUCK_STATUS: new Point(10, MAX_Y * 0.91),
  MISSED_DUCK_STATUS: new Point(10, MAX_Y * 0.95),
  PLAYER_NAME: new Point(30, 40)
};

const FLASH_MS = 60;
const FLASH_SCREEN = new Graphics();
FLASH_SCREEN.beginFill(0xFFFFFF);
FLASH_SCREEN.drawRect(0, 0, MAX_X, MAX_Y);
FLASH_SCREEN.endFill();
FLASH_SCREEN.position.x = 0;
FLASH_SCREEN.position.y = 0;

class Stage extends Container {

  /**
   * Stage Constructor
   * Container for the game
   * @param opts
   * @param opts.spritesheet - String representing the path to the spritesheet file
   */
  constructor(opts) {
    super();
    this.locked = false;
    this.spritesheet = opts.spritesheet;
    this.interactive = true;
    this.ducks = [];
    // track unique logo names and per-logo shot counts
    this.logoNames = new Set([
      'ARB-AAVE-USDT', 'ETH-PENDLE-USDC', 'ARB-AAVE-USDT'
    ]);
    this.shotLogoCounts = new Map();
    this.hitDucksThisRound = [];
    this.duckTypes = duckTypesData.duckTypes;
    this.dog = new Dog({
      spritesheet: opts.spritesheet,
      downPoint: DOG_POINTS.DOWN,
      upPoint: DOG_POINTS.UP
    });
    this.dog.visible = false;
    this.flashScreen = FLASH_SCREEN;
    this.flashScreen.visible = false;
    this.hud = new Hud();

    this._setStage();
    this.scaleToWindow();
  }

  static scoreBoxLocation() {
    return HUD_LOCATIONS.SCORE;
  }

  static waveStatusBoxLocation() {
    return HUD_LOCATIONS.WAVE_STATUS;
  }

  static gameStatusBoxLocation() {
    return HUD_LOCATIONS.GAME_STATUS;
  }

  static pauseLinkBoxLocation() {
    return HUD_LOCATIONS.PAUSE_LINK;
  }

  static muteLinkBoxLocation() {
    return HUD_LOCATIONS.MUTE_LINK;
  }

  static fullscreenLinkBoxLocation() {
    return HUD_LOCATIONS.FULL_SCREEN_LINK;
  }

  static levelCreatorLinkBoxLocation() {
    return HUD_LOCATIONS.LEVEL_CREATOR_LINK;
  }

  static replayButtonLocation() {
    return HUD_LOCATIONS.REPLAY_BUTTON;
  }

  static bulletStatusBoxLocation() {
    return HUD_LOCATIONS.BULLET_STATUS;
  }

  static deadDuckStatusBoxLocation() {
    return HUD_LOCATIONS.DEAD_DUCK_STATUS;
  }

  static missedDuckStatusBoxLocation() {
    return HUD_LOCATIONS.MISSED_DUCK_STATUS;
  }

  static playerNameBoxLocation() {
    return HUD_LOCATIONS.PLAYER_NAME;
  }

  pause() {
    this.dog.timeline.pause();
    this.ducks.forEach((duck) => {
      duck.timeline.pause();
    });
  }

  resume() {
    this.dog.timeline.play();
    this.ducks.forEach((duck) => {
      duck.timeline.play();
    });
  }

  /**
   * scaleToWindow
   * Helper method that scales the stage container to the window size
   */
  scaleToWindow() {
    this.scale.set(window.innerWidth / MAX_X, window.innerHeight / MAX_Y);
  }

  /**
   * _setStage
   * Private method that adds all of the main pieces to the scene
   * @returns {Stage}
   * @private
   */
  _setStage() {
    const background = new extras.AnimatedSprite([
      loader.resources[this.spritesheet].textures['scene/back/0.png']
    ]);
    background.position.set(0, 0);

    const tree = new extras.AnimatedSprite([loader.resources[this.spritesheet].textures['scene/tree/0.png']]);
    tree.position.set(100, 237);

    this.addChild(tree);
    this.addChild(background);
    this.addChild(this.dog);
    this.addChild(this.flashScreen);
    this.addChild(this.hud);

    return this;
  }

  /**
   * preLevelAnimation
   * Helper method that runs the level intro animation with the dog and returns a promise that resolves
   * when it's complete.
   * @returns {Promise}
   */
  preLevelAnimation() {
    return new BPromise((resolve) => {
      this.cleanUpDucks();

      const sniffOpts = {
        startPoint: DOG_POINTS.SNIFF_START,
        endPoint: DOG_POINTS.SNIFF_END
      };

      const findOpts = {
        onComplete: () => {
          this.setChildIndex(this.dog, 0);
          resolve();
        }
      };

      this.dog.sniff(sniffOpts).find(findOpts);
    });
  }

  /**
   * addDucks
   * Helper method that adds ducks to the container and causes them to fly around randomly.
   * @param {Number} numDucks - How many ducks to add to the stage
   * @param {Number} speed - Value from 0 (slow) to 10 (fast) that determines how fast the ducks will fly
   */
  addDucks(numDucks, speed) {
    // eslint-disable-next-line no-console
    console.log(`🦆 Adding ${numDucks} ducks with speed ${speed}`);
    
    // CRITICAL: Clean up any existing ducks first to prevent accumulation
    if (this.ducks.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`⚠️ Found ${this.ducks.length} existing ducks, cleaning up first`);
      this.cleanUpDucks();
    }
    
    // Clear previous round's hit duck tracking
    this.hitDucksThisRound = [];

    const duckColorKeys = Object.keys(this.duckTypes);
    // eslint-disable-next-line no-console
    console.log(`📝 Available duck types: ${duckColorKeys.join(', ')}`);

    for (let i = 0; i < numDucks; i++) {
      // Randomly select duck type from available types
      const randomColorKey = duckColorKeys[Math.floor(Math.random() * duckColorKeys.length)];
      const duckTypeInfo = this.duckTypes[randomColorKey];

      // Generate random multiplier within the duck type's range
      const minMult = duckTypeInfo.multiplierRange[0];
      const maxMult = duckTypeInfo.multiplierRange[1];
      const multiplier = Math.floor(Math.random() * (maxMult - minMult + 1)) + minMult;

      const newDuck = new Duck({
        spritesheet: this.spritesheet,
        colorProfile: duckTypeInfo.color,
        maxX: MAX_X,
        maxY: MAX_Y
      });

      // Add duck type properties
      newDuck.duckType = duckTypeInfo.name;
      newDuck.duckColor = duckTypeInfo.color;
      newDuck.scoreMultiplier = multiplier;
      newDuck.baseSpeed = duckTypeInfo.baseSpeed;

      newDuck.position.set(DUCK_POINTS.ORIGIN.x, DUCK_POINTS.ORIGIN.y);

      // assign a random logo tag from the Set (but don't create visual label for performance)
      const namesArr = Array.from(this.logoNames);
      newDuck.logoTag = namesArr[Math.floor(Math.random() * namesArr.length)];
      
      // Removed all visual indicators for maximum performance

      this.addChildAt(newDuck, 0);

      // Adjust speed based on duck type (black/avail ducks fly faster)
      const adjustedSpeed = speed * newDuck.baseSpeed;
      newDuck.randomFlight({
        speed: adjustedSpeed
      });

      this.ducks.push(newDuck);
      
      // Reduced logging for performance - only log occasionally
      if (i === 0) {
        // eslint-disable-next-line no-console
        console.log(`➕ Creating ${numDucks} ducks: first one is ${duckTypeInfo.name} (${duckTypeInfo.color}) ${multiplier}x speed ${adjustedSpeed}`);
      }
    }
    
    // eslint-disable-next-line no-console
    console.log(`✅ Created ${numDucks} ducks. Total ducks in stage: ${this.ducks.length}`);
  }

  /**
   * shotsFired
   * Click handler for the stage, scale's the location of the click to ensure coordinate system
   * alignment and then calculates if any of the ducks were hit and should be shot.
   * @param {{x:Number, y:Number}} clickPoint - Point where the container was clicked in real coordinates
   * @param {Number} radius - The "blast radius" of the player's weapon
   * @returns {Number} - The number of ducks hit with the shot
   */
  shotsFired(clickPoint, radius) {
    // flash the screen
    this.flashScreen.visible = true;
    _delay(() => {
      this.flashScreen.visible = false;
    }, FLASH_MS);

    let ducksShot = 0;
    const hitDucks = [];

    // Pre-calculate scaled click location once for performance
    const scaledClickPoint = this.getScaledClickLocation(clickPoint);
    
    for (let i = 0; i < this.ducks.length; i++) {
      const duck = this.ducks[i];
      if (duck.alive && Utils.pointDistance(duck.position, scaledClickPoint) < radius) {
        ducksShot++;
        duck.shot();

        // Track hit duck for round summary
        hitDucks.push({
          type: duck.duckType,
          color: duck.duckColor,
          multiplier: duck.scoreMultiplier,
          logoTag: duck.logoTag
        });

        if (duck.logoTag) {
          const prev = this.shotLogoCounts.get(duck.logoTag) || 0;
          this.shotLogoCounts.set(duck.logoTag, prev + 1);
        }
        
        // Break early after hitting first duck for better performance
        break;
      }
    }

    // Add hit ducks to round tracking
    this.hitDucksThisRound.push(...hitDucks);

    return { ducksShot, hitDucks };
  }

  showHitFeedback(duck) {
    // Create floating text showing what was hit
    const hitText = new Text(`${duck.duckType} ${duck.scoreMultiplier}x!`, {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: duck.scoreMultiplier === 10 ? '#FFD700' : duck.scoreMultiplier === 0 ? '#FF0000' : '#00FF00',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    hitText.anchor.set(0.5, 0.5);
    hitText.position.set(duck.position.x, duck.position.y - 30);
    this.addChild(hitText);
    
    // Animate the feedback text
    TweenMax.to(hitText, 0.5, {
      y: hitText.position.y - 50,
      alpha: 0,
      ease: Power2.easeOut,
      onComplete: () => {
        this.removeChild(hitText);
      }
    });
  }

  clickedReplay(clickPoint) {
    // this link is in the middle of the page, general radius search is sufficient here
    return Utils.pointDistance(this.getScaledClickLocation(clickPoint), HUD_LOCATIONS.REPLAY_BUTTON) < 200;
  }

  clickedLevelCreatorLink(clickPoint) {
    const scaledClickPoint = this.getScaledClickLocation(clickPoint);

    // with this link we have a very narrow hit box, radius search is not appropriate
    return _inRange(scaledClickPoint.x, HUD_LOCATIONS.LEVEL_CREATOR_LINK.x-110, HUD_LOCATIONS.LEVEL_CREATOR_LINK.x) &&
      _inRange(scaledClickPoint.y, HUD_LOCATIONS.LEVEL_CREATOR_LINK.y-30, HUD_LOCATIONS.LEVEL_CREATOR_LINK.y+10);
  }

  clickedPauseLink(clickPoint) {
    const scaledClickPoint = this.getScaledClickLocation(clickPoint);
    return _inRange(scaledClickPoint.x, HUD_LOCATIONS.PAUSE_LINK.x-110, HUD_LOCATIONS.PAUSE_LINK.x) &&
      _inRange(scaledClickPoint.y, HUD_LOCATIONS.PAUSE_LINK.y-30, HUD_LOCATIONS.PAUSE_LINK.y+10);
  }

  clickedFullscreenLink(clickPoint) {
    const scaledClickPoint = this.getScaledClickLocation(clickPoint);
    return _inRange(scaledClickPoint.x, HUD_LOCATIONS.FULL_SCREEN_LINK.x-110, HUD_LOCATIONS.FULL_SCREEN_LINK.x) &&
      _inRange(scaledClickPoint.y, HUD_LOCATIONS.FULL_SCREEN_LINK.y-30, HUD_LOCATIONS.FULL_SCREEN_LINK.y+10);
  }

  clickedMuteLink(clickPoint) {
    const scaledClickPoint = this.getScaledClickLocation(clickPoint);
    return _inRange(scaledClickPoint.x, HUD_LOCATIONS.MUTE_LINK.x-110, HUD_LOCATIONS.MUTE_LINK.x) &&
      _inRange(scaledClickPoint.y, HUD_LOCATIONS.MUTE_LINK.y-30, HUD_LOCATIONS.MUTE_LINK.y+10);
  }

  getScaledClickLocation(clickPoint) {
    return {
      x: clickPoint.x / this.scale.x,
      y: clickPoint.y / this.scale.y
    };
  }
  /**
   * flyAway
   * Helper method that causes the sky to change color and the ducks to fly away
   * @returns {Promise} - This promise is resolved when all the ducks have flown away
   */
  flyAway() {
    this.dog.stopAndClearTimeline();
    this.dog.laugh();
    this.lock();
    const duckPromises = [];

    for (let i = 0; i < this.ducks.length; i++) {
      const duck = this.ducks[i];
      if (duck.alive) {
        duckPromises.push(new BPromise((resolve) => {
          duck.stopAndClearTimeline();
          duck.flyTo({
            point: new Point(MAX_X / 2, -500),
            onComplete: resolve
          });
        }));
      }
    }

    return BPromise.all(duckPromises).then(this.cleanUpDucks.bind(this)).then(this.unlock.bind(this));
  }

  /**
   * cleanUpDucks
   * Helper that removes all ducks from the container and object
   */
  cleanUpDucks() {
    // eslint-disable-next-line no-console
    console.log(`🧹 Cleaning up ${this.ducks.length} ducks`);
    
    // Use optimized cleanup - destroy all ducks in one pass
    for (let i = 0; i < this.ducks.length; i++) {
      this.ducks[i].destroy();
    }
    this.ducks = [];
    // Clear hit tracking to prevent memory buildup
    this.hitDucksThisRound = [];
    
    // eslint-disable-next-line no-console
    console.log(`✅ Cleanup complete. Ducks remaining: ${this.ducks.length}`);
  }

  /**
   * ducksAlive
   * Helper that returns a boolean value depending on whether or not ducks are alive. The distinction
   * is that even dead ducks may be animating and still "active"
   * @returns {Boolean}
   */
  ducksAlive() {
    // Optimized: use native for loop instead of lodash for better performance
    for (let i = 0; i < this.ducks.length; i++) {
      if (this.ducks[i].alive) return true;
    }
    return false;
  }

  /**
   * ducksActive
   * Helper that returns a boolean value depending on whether or not ducks are animating. Both live
   * and dead ducks may be animating.
   * @returns {Boolean}
   */
  ducksActive() {
    // Optimized: use native for loop instead of lodash for better performance
    for (let i = 0; i < this.ducks.length; i++) {
      if (this.ducks[i].isActive()) return true;
    }
    return false;
  }

  /**
   * dogActive
   * Helper proxy method that returns a boolean depending on whether the dog is animating
   * @returns {boolean}
   */
  dogActive() {
    return this.dog.isActive();
  }

  /**
   * isActive
   * High level helper to determine if things are animating on the stage
   * @returns {boolean|Boolean}
   */
  isActive() {
    return this.dogActive() || this.ducksAlive() || this.ducksActive();
  }

  /**
   * lock
   * Lock the stage to prevent new animations from being added to timelines, specifically useful for managing race and
   * edge conditions around dogs and ducks.
   */
  lock() {
    this.locked = true;
  }

  /**
   * unlock
   * Unlock the stage so that new animations can be added to timelines.
   */
  unlock() {
    this.locked = false;
  }

  /**
   * isLocked
   * Helper to tell if the stage is locked to new animations or not
   * @returns {Boolean}
   */
  isLocked() {
    return this.locked;
  }
}

export default Stage;
