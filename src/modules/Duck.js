import {random as _random} from 'lodash/number';
import {assign as _extend} from 'lodash/object';
import {noop as _noop} from 'lodash/util';
import Utils from '../libs/utils';
import Character from './Character';
import sound from './Sound';

const RANDOM_FLIGHT_DELTA = 300;

class Duck extends Character {
  /**
   * Duck constructor
   * Method to instantiate a new Duck character
   * @param {Object} options with various duck configuration values
   * @param {String} options.colorProfile String that is concatinated with `duck/` to generate the sprite ID
   * @param {String} options.spritesheet The object property to ask PIXI's resource loader for
   * @param {Number} [options.maxX] When randomly flying, imposes an upper bound on the X coordinate
   * @param {Number} [options.maxY] When randomly flying, imposes an upper bound on the Y coordinate
   * @param {Number} [options.randomFlightDelta] The minimum distance the duck must travel when randomly flying
   */
  constructor(options) {
    const spriteId = 'duck/' + options.colorProfile;
    const states = [
      {
        name: 'left',
        animationSpeed: 0.18

      },
      {
        name: 'right',
        animationSpeed: 0.18

      },
      {
        name: 'top-left',
        animationSpeed: 0.18

      },
      {
        name: 'top-right',
        animationSpeed: 0.18

      },
      {
        name: 'dead',
        animationSpeed: 0.18

      },
      {
        name: 'shot',
        animationSpeed: 0.18

      }
    ];
    super(spriteId, options.spritesheet, states);
    this.alive = true;
    this.visible = true;
    this.options = options;
    this.anchor.set(0.5, 0.5);
    this.timeoutIds = []; // Track setTimeout IDs for cleanup
  }

  /**
   * randomFlight
   * Method that causes the duck the randomly fly around a specific region of its parent
   * @param {Object} opts options for the flight tween
   * @param {Number} [opts.minX=0] Lowest x value allowed
   * @param {Number} [opts.maxX=Infinity] Highest x value allowed
   * @param {Number} [opts.minY=0] Lowest Y value allowed
   * @param {Number} [opts.maxY=Infinity] Highest Y value allowed
   * @param {Number} [opts.randomFlightDelta=300] Minimum distance to the next destination
   * @param {Number} [opts.speed=1] Speed of travel on a scale of 0 (slow) to 10 (fast)
   */
  randomFlight(opts) {
    const options = _extend({
      minX: 0,
      maxX: this.options.maxX || Infinity,
      minY: 0,
      maxY: this.options.maxY || Infinity,
      randomFlightDelta: this.options.randomFilghtDelta || RANDOM_FLIGHT_DELTA,
      speed: 1
    }, opts);

    let distance, destination;
    do {
      destination = {
        x: _random(options.minX, options.maxX),
        y: _random(options.minY, options.maxY)
      };
      distance = Utils.pointDistance(this.position, destination);
    } while (distance < options.randomFlightDelta);

    this.flyTo({
      point: destination,
      speed: options.speed,
      onComplete: () => {
        // Break the synchronous call stack to prevent stack overflow
        if (this.alive && this.visible) {
          const timeoutId = setTimeout(() => {
            // Extra safety: check if duck is still alive, visible, and has a parent before continuing
            if (this.alive && this.visible && this.parent) {
              this.randomFlight(options);
            }
          }, 10);
          this.timeoutIds.push(timeoutId);
        }
      }
    });
  }

  /**
   * flyTo
   * Method that adds an animation to the ducks timeline for flying to a specified point.
   * @param opts
   * @param {PIXI.Point} [opts.point] Location the duck should go to
   * @param {Number} [opts.speed] Integer from 0 to 10 which determines how fast the duck flys
   * @param {Function} [opts.onStart=_noop] Method to call when the duck begins flying to the destination
   * @param {Function} [opts.onComplete_noop] Method to call when the duck has arrived at the destination
   * @returns {Duck}
   */
  flyTo(opts) {
    // Safety check to prevent animation on dead/invisible ducks
    if (!this.alive || !this.visible) {
      return this;
    }

    const options = _extend({
      point: this.position,
      speed: this.speed,
      onStart: _noop,
      onComplete: _noop
    }, opts);

    this.speed = options.speed;

    const direction = Utils.directionOfTravel(this.position, options.point);
    const tweenSeconds = (this.flightAnimationMs + _random(0, 300)) / 1000;

    this.timeline.to(this.position, tweenSeconds, {
      x: options.point.x,
      y: options.point.y,
      ease: 'Linear.easeNone',
      onStart: () => {
        if (!this.alive) {
          this.stopAndClearTimeline();
        }
        this.play();
        this.state = direction.replace('bottom', 'top');
        options.onStart();
      },
      onComplete: () => {
        // Additional safety check before calling onComplete
        if (this.alive && this.visible) {
          options.onComplete();
        }
      }
    });

    return this;
  }

  /**
   * clearAllTimeouts
   * Method that clears all pending setTimeout callbacks
   */
  clearAllTimeouts() {
    this.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeoutIds = [];
  }

  /**
   * destroy
   * Method that completely destroys the duck and all its animations
   */
  destroy() {
    this.alive = false;
    this.visible = false;
    
    // Clear all animations and timeouts
    this.clearAllTimeouts();
    
    // Stop any current sprite animations immediately
    this.stop();
    
    // Kill and clear the GSAP timeline completely
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    
    // Remove from parent if it has one
    if (this.parent) {
      this.parent.removeChild(this);
    }
    
    // Clear any remaining references to help garbage collection
    this.options = null;
    this.states = null;
  }

  /**
   * shot
   * Method that animates the duck when the player shoots it
   */
  shot() {
    if (!this.alive) {
      return;
    }
    this.alive = false;
    this.stopAndClearTimeline();
    sound.play('quak', _noop);
    this.state = 'shot';
    this.timeline.to(this.position, 0.4, {
      y: this.position.y + 100,
      ease: 'Linear.easeNone',
      onComplete: () => {
        this.state = 'dead';
        this.timeline.to(this.position, 1, {
          y: this.position.y + 400,
          ease: 'Linear.easeNone',
          onComplete: () => {
            this.visible = false;
          }
        });
      }
    });
  }

  /**
   * isActive
   * Helper that tells whether the duck is currently or is able to be animated.
   * Because ducks have a complex death sequence, this method checks if a duck is visible
   * in addition to the standard timeline animation check. This avoids potential race conditions
   * since in Duckhunt, if you can see the duck, it's beind animated in some way even if it's
   * technically "dead"
   * @returns {*|boolean}
   */
  isActive() {
    // Safety check: if timeline is null (destroyed duck), it's not active
    if (!this.timeline) {
      return false;
    }
    return this.visible || super.isActive();
  }

  /**
   * speed - getter
   * This method returns the
   * @returns {Number} Returns the speed level, a number from 0 to 10
   */
  get speed() {
    return this.speedVal;
  }

  /**
   * speed - setter
   * Method that determines how fast the duck should fly. Uses a 0-10 scale for ease and since
   * it technically "goes to 11"
   * @see https://www.youtube.com/watch?v=KOO5S4vxi0o.
   * @param {Number} val A number from 0 (slow) to 10 (fast) that sets the length of the flight tween
   */
  set speed(val) {
    let flightAnimationMs;
    switch (val) {
      case 0:
        flightAnimationMs = 3000;
        break;
      case 1:
        flightAnimationMs = 2800;
        break;
      case 2:
        flightAnimationMs = 2500;
        break;
      case 3:
        flightAnimationMs = 2000;
        break;
      case 4:
        flightAnimationMs = 1800;
        break;
      case 5:
        flightAnimationMs = 1500;
        break;
      case 6:
        flightAnimationMs = 1300;
        break;
      case 7:
        flightAnimationMs = 1200;
        break;
      case 8:
        flightAnimationMs = 800;
        break;
      case 9:
        flightAnimationMs = 600;
        break;
      case 10:
        flightAnimationMs = 500;
        break;
    }
    this.speedVal = val;
    this.flightAnimationMs = flightAnimationMs;
  }
}

export default Duck;
