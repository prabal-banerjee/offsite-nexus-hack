import {loader, autoDetectRenderer} from 'pixi.js';
import {remove as _remove} from 'lodash/array';
import levels from '../data/levels.json';
import Stage from './Stage';
import sound from './Sound';
import levelCreator from '../libs/levelCreator.js';
import utils from '../libs/utils';
import Multiplayer from './Multiplayer';

const BLUE_SKY_COLOR = 0x64b0ff;
const PINK_SKY_COLOR = 0xfbb4d4;
const SUCCESS_RATIO = 0.6;
const BOTTOM_LINK_STYLE = {
  fontFamily: 'Arial',
  fontSize: '15px',
  align: 'left',
  fill: 'white'
};

class Game {
  /**
   * Game Constructor
   * @param opts
   * @param {String} opts.spritesheet Path to the spritesheet file that PIXI's loader should load
   * @returns {Game}
   */
  constructor(opts) {
    this.spritesheet = opts.spritesheet;
    this.loader = loader;
    this.renderer =  autoDetectRenderer(window.innerWidth, window.innerHeight, {
      backgroundColor: BLUE_SKY_COLOR
    });
    this.levelIndex = 0;
    this.maxScore = 0;
    this.timePaused = 0;
    this.muted = false;
    this.paused = false;
    this.activeSounds = [];

    this.waveEnding = false;
    this.quackingSoundId = null;
    this.levels = levels.normal;
    this.hideBullets = !!opts.hideBullets;
    
    // Multiplayer support
    this.multiplayerEnabled = opts.multiplayer || false;
    this.multiplayer = null;
    this.roomId = opts.roomId || null;
    this.playerName = opts.playerName || null;
    this.serverUrl = opts.serverUrl || 'http://localhost:3000';
    this.duckSyncInterval = null;
    this.iStartedGame = false;
    
    return this;
  }

  get ducksMissed() {
    return this.ducksMissedVal ? this.ducksMissedVal : 0;
  }

  set ducksMissed(val) {
    this.ducksMissedVal = val;

    if (this.stage && this.stage.hud) {

      if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'ducksMissed')) {
        this.stage.hud.createTextureBasedCounter('ducksMissed', {
          texture: 'hud/score-live/0.png',
          spritesheet: this.spritesheet,
          location: Stage.missedDuckStatusBoxLocation(),
          rowMax: 20,
          max: 20
        });
      }

      this.stage.hud.ducksMissed = val;
    }
  }

  get ducksShot() {
    return this.ducksShotVal ? this.ducksShotVal : 0;
  }

  set ducksShot(val) {
    this.ducksShotVal = val;

    if (this.stage && this.stage.hud) {

      if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'ducksShot')) {
        this.stage.hud.createTextureBasedCounter('ducksShot', {
          texture: 'hud/score-dead/0.png',
          spritesheet: this.spritesheet,
          location: Stage.deadDuckStatusBoxLocation(),
          rowMax:20,
          max: 20
        });
      }

      this.stage.hud.ducksShot = val;
    }
  }
  /**
   * bullets - getter
   * @returns {Number}
   */
  get bullets() {
    return this.bulletVal ? this.bulletVal : 0;
  }

  /**
   * bullets - setter
   * Setter for the bullets property of the game. Also in charge of updating the HUD. In the event
   * the HUD doesn't know about displaying bullets, the property and a corresponding texture container
   * will be created in HUD.
   * @param {Number} val Number of bullets
   */
  set bullets(val) {
    this.bulletVal = val;

    if (this.hideBullets) {
      // If bullets HUD exists from a previous run, hide it
      if (this.stage && this.stage.hud && this.stage.hud['bulletsContainer']) {
        this.stage.hud['bulletsContainer'].visible = false;
      }
      return;
    }

    if (this.stage && this.stage.hud) {

      if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'bullets')) {
        this.stage.hud.createTextureBasedCounter('bullets', {
          texture: 'hud/bullet/0.png',
          spritesheet: this.spritesheet,
          location: Stage.bulletStatusBoxLocation(),
          max: 80,
          rowMax: 20
        });
      }

      this.stage.hud.bullets = val;
      // Ensure visible if we're showing bullets
      if (this.stage.hud['bulletsContainer']) {
        this.stage.hud['bulletsContainer'].visible = true;
      }
    }

  }

  /**
   * score - getter
   * @returns {Number}
   */
  get score() {
    return this.scoreVal ? this.scoreVal : 0;
  }

  /**
   * score - setter
   * Setter for the score property of the game. Also in charge of updating the HUD. In the event
   * the HUD doesn't know about displaying the score, the property and a corresponding text box
   * will be created in HUD.
   * @param {Number} val Score value to set
   */
  set score(val) {
    this.scoreVal = val;

    if (this.stage && this.stage.hud) {

      if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'score')) {
        this.stage.hud.createTextBox('score', {
          style: {
            fontFamily: 'Arial',
            fontSize: '18px',
            align: 'left',
            fill: 'white'
          },
          location: Stage.scoreBoxLocation(),
          anchor: {
            x: 1,
            y: 0
          }
        });
      }

      this.stage.hud.score = val;
    }

  }

  /**
   * wave - get
   * @returns {Number}
   */
  get wave() {
    return this.waveVal ? this.waveVal : 0;
  }

  /**
   * wave - set
   * Setter for the wave property of the game. Also in charge of updating the HUD. In the event
   * the HUD doesn't know about displaying the wave, the property and a corresponding text box
   * will be created in the HUD.
   * @param {Number} val
   */
  set wave(val) {
    this.waveVal = val;

    if (this.stage && this.stage.hud) {

      if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'waveStatus')) {
        this.stage.hud.createTextBox('waveStatus', {
          style: {
            fontFamily: 'Arial',
            fontSize: '14px',
            align: 'center',
            fill: 'white'
          },
          location: Stage.waveStatusBoxLocation(),
          anchor: {
            x: 1,
            y: 1
          }
        });
      }

      if (!isNaN(val) && val > 0) {
        this.stage.hud.waveStatus = 'wave ' + val + ' of ' + this.level.waves;
      } else {
        this.stage.hud.waveStatus = '';
      }
    }
  }

  /**
   * gameStatus - get
   * @returns {String}
   */
  get gameStatus() {
    return this.gameStatusVal ? this.gameStatusVal : '';
  }

  /**
   * gameStatus - set
   * @param {String} val
   */
  set gameStatus(val) {
    this.gameStatusVal = val;

    if (this.stage && this.stage.hud) {

      if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'gameStatus')) {
        this.stage.hud.createTextBox('gameStatus', {
          style: {
            fontFamily: 'Arial',
            fontSize: '40px',
            align: 'left',
            fill: 'white'
          },
          location: Stage.gameStatusBoxLocation()
        });
      }

      this.stage.hud.gameStatus = val;
    }
  }

  load() {
    this.loader
      .add(this.spritesheet)
      .load(this.onLoad.bind(this));
  }

  onLoad() {
    document.body.appendChild(this.renderer.view);

    this.stage = new Stage({
      spritesheet: this.spritesheet
    });

    this.scaleToWindow();
    this.addLinkToLevelCreator();
    this.addPauseLink();
    this.addMuteLink();
    this.addFullscreenLink();
    this.bindEvents();
    
    if (this.multiplayerEnabled) {
      this.initMultiplayer().then(() => {
        this.startLevel();
        this.animate();
      }).catch((error) => {
        console.error('Multiplayer connection failed:', error);
        console.log('Starting game in single-player mode...');
        // Fallback to single-player if multiplayer fails
        this.multiplayerEnabled = false;
        this.startLevel();
        this.animate();
      });
    } else {
      this.startLevel();
      this.animate();
    }

  }

  displaySelfName() {
    if (!this.multiplayerEnabled || !this.stage || !this.stage.hud || !this.playerName) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'selfName')) {
      this.stage.hud.createTextBox('selfName', {
        style: {
          fontFamily: 'Arial',
          fontSize: '12px',
          align: 'left',
          fill: '#00ff99'
        },
        location: Stage.multiplayerSelfLocation(),
        anchor: { x: 0, y: 0 }
      });
    }
    this.stage.hud.selfName = `You: ${this.playerName}`;
  }

  addFullscreenLink() {
    this.stage.hud.createTextBox('fullscreenLink', {
      style: BOTTOM_LINK_STYLE,
      location: Stage.fullscreenLinkBoxLocation(),
      anchor: {
        x: 1,
        y: 1
      }
    });
    this.stage.hud.fullscreenLink = 'fullscreen (f)';
  }
  addMuteLink() {
    this.stage.hud.createTextBox('muteLink', {
      style: BOTTOM_LINK_STYLE,
      location: Stage.muteLinkBoxLocation(),
      anchor: {
        x: 1,
        y: 1
      }
    });
    this.stage.hud.muteLink = 'mute (m)';
  }

  addPauseLink() {
    this.stage.hud.createTextBox('pauseLink', {
      style: BOTTOM_LINK_STYLE,
      location: Stage.pauseLinkBoxLocation(),
      anchor: {
        x: 1,
        y: 1
      }
    });
    this.stage.hud.pauseLink = 'pause (p)';
  }

  addLinkToLevelCreator() {
    this.stage.hud.createTextBox('levelCreatorLink', {
      style: BOTTOM_LINK_STYLE,
      location: Stage.levelCreatorLinkBoxLocation(),
      anchor: {
        x: 1,
        y: 1
      }
    });
    this.stage.hud.levelCreatorLink = 'level creator (c)';
  }

  initMultiplayer() {
    return new Promise((resolve, reject) => {
      this.multiplayer = new Multiplayer();
      
      this.multiplayer.onGameStateUpdate = (state) => {
        this.updateMultiplayerDisplay(state);
      };

      this.multiplayer.onShotFired = (data) => {
        // Visual marker for other players' shots
        if (this.stage) {
          this.stage.showShotMarker(data.clickPoint);
        }
      };

      // No per-frame position sync needed with deterministic seeds

      this.multiplayer.onDuckShot = (data) => {
        // Another player shot a duck
        if (this.stage && this.stage.ducks) {
          const duck = this.stage.ducks.find(d => d.id === data.duckId);
          if (duck && duck.alive) {
            duck.shot();
          }
        }
      };

      this.multiplayer.onScoreUpdate = (data) => {
        this.updateMultiplayerDisplay(data);
      };

      this.multiplayer.onWaveStarted = (data) => {
        // Sync wave start - another player started a wave
        if (data.waveStartTime) {
          this.waveStartTime = data.waveStartTime;
        }
        // If we're not already in this wave, start it
        if (this.wave !== data.wave && this.level) {
          this.wave = data.wave;
          // Initialize my bullets locally for this wave
          this.bullets = this.level.bullets;
          this.ducksShotThisWave = 0;
          this.waveEnding = false;
          
          // Start the same wave with synchronized duck IDs
          this.quackingSoundId = sound.play('quacking');
          this.stage.cleanUpDucks();
          const duckCount = data.ducks || this.level.ducks;
          this.stage.addDucks(duckCount, this.level.speed, data.wave, data.seed);
        }
      };

      this.multiplayer.onGameStarted = (data) => {
        // Sync game start - another player started the game
        this.players = data.players || [];
        if (data.level) {
          // Another player started, sync to their level
          this.level = data.level;
          this.levelIndex = this.levels.findIndex(l => l.id === data.level.id) || 0;
          this.maxScore += this.level.waves * this.level.ducks * this.level.pointsPerDuck;
          this.ducksShot = 0;
          this.ducksMissed = 0;
          this.wave = 0;
          
          this.gameStatus = this.level.title;
          this.stage.preLevelAnimation().then(() => {
            this.gameStatus = '';
            // Wait for wave start signal
          });
        }
      };

      this.multiplayer.connect(this.serverUrl, this.playerName)
        .then(() => {
          this.multiplayer.joinGame(this.roomId, this.playerName);
          this.displaySelfName();
          resolve();
        })
        .catch(reject);
    });
  }

  setupMultiplayerSync() {
    // Disabled: we now use seeded simulation; network noise reduced
  }

  updateMultiplayerDisplay(data) {
    if (!this.stage || !this.stage.hud) return;
    
    const players = data.players || [];
    const otherPlayers = players.filter(p => p.id !== this.multiplayer.playerId);
    
    if (otherPlayers.length > 0) {
      if (!this.stage.hud.multiplayerPlayers) {
        this.stage.hud.createTextBox('multiplayerPlayers', {
          style: {
            fontFamily: 'Arial',
            fontSize: '12px',
            align: 'left',
            fill: '#ffff00'
          },
          location: Stage.multiplayerPlayersLocation(),
          anchor: {
            x: 0,
            y: 0
          }
        });
      }
      
      const playerList = otherPlayers.map(p => 
        `${p.name}: ${p.score} pts (${p.ducksShot} ducks)`
      ).join('\n');
      this.stage.hud.multiplayerPlayers = `Other Players:\n${playerList}`;
    } else {
      if (this.stage.hud.multiplayerPlayers) {
        this.stage.hud.multiplayerPlayers = '';
      }
    }
  }

  bindEvents() {
    window.addEventListener('resize', this.scaleToWindow.bind(this));

    this.stage.mousedown = this.stage.touchstart = this.handleClick.bind(this);

    document.addEventListener('keypress', (event) => {
      event.stopImmediatePropagation();

      if (event.key === 'p') {
        this.pause();
      }

      if (event.key === 'm') {
        this.mute();
      }

      if (event.key === 'c') {
        this.openLevelCreator();
      }

      if (event.key === 'f') {
        this.fullscreen();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        this.stage.hud.fullscreenLink = 'unfullscreen (f)';
      } else {
        this.stage.hud.fullscreenLink = 'fullscreen (f)';
      }
    });

    sound.on('play', (soundId) => {
      if (this.activeSounds.indexOf(soundId) === -1) {
        this.activeSounds.push(soundId);
      }
    });
    sound.on('stop', this.removeActiveSound.bind(this));
    sound.on('end', this.removeActiveSound.bind(this));
  }

  fullscreen() {
    this.isFullscreen = !this.isFullscreen;
    utils.toggleFullscreen();
  }

  pause() {
    this.stage.hud.pauseLink = this.paused ? 'pause (p)' : 'unpause (p)';
    // SetTimeout, woof. Thing is here we need to leave enough animation frames for the HUD status to be updated
    // before pausing all rendering, otherwise the text update we need above won't be shown to the user.
    setTimeout(() => {
      this.paused = !this.paused;
      if (this.paused) {
        this.pauseStartTime = Date.now();
        this.stage.pause();
        this.activeSounds.forEach((soundId) => {
          sound.pause(soundId);
        });
      } else {
        this.timePaused += (Date.now() - this.pauseStartTime) / 1000;
        this.stage.resume();
        this.activeSounds.forEach((soundId) => {
          sound.play(soundId);
        });
      }
      
      if (this.multiplayerEnabled && this.multiplayer) {
        this.multiplayer.pauseGame(this.paused);
      }
    }, 40);
  }

  removeActiveSound(soundId) {
    _remove(this.activeSounds, function(item) {
      return item === soundId;
    });
  }

  mute() {
    this.stage.hud.muteLink = this.muted ? 'mute (m)' : 'unmute (m)';
    this.muted = !this.muted;
    sound.mute(this.muted);
  }

  scaleToWindow() {
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.stage.scaleToWindow();
  }

  startLevel() {
    if (levelCreator.urlContainsLevelData()) {
      this.level = levelCreator.parseLevelQueryString();
      this.levelIndex = this.levels.length - 1;
    } else {
      this.level = this.levels[this.levelIndex];
    }

    this.maxScore += this.level.waves * this.level.ducks * this.level.pointsPerDuck;
    this.ducksShot = 0;
    this.ducksMissed = 0;
    this.wave = 0;

    if (this.multiplayerEnabled && this.multiplayer) {
      // Announce game start; mark self as initiator
      this.iStartedGame = true;
      this.multiplayer.startGame(this.level);
    }

    this.gameStatus = this.level.title;
    this.stage.preLevelAnimation().then(() => {
      this.gameStatus = '';
      if (this.multiplayerEnabled) {
        // Server will be authoritative for waves; if we started the game, trigger wave on server
        if (this.iStartedGame && this.multiplayer) {
          // Force 2 ducks per wave for synced multiplayer
          this.multiplayer.startWave(2, this.level.bullets);
        }
      } else {
        this.startWave();
      }
    });
  }

  startWave() {
    this.quackingSoundId = sound.play('quacking');
    this.wave += 1;
    this.waveStartTime = Date.now();
    this.bullets = this.level.bullets;
    this.ducksShotThisWave = 0;
    this.waveEnding = false;

    if (this.multiplayerEnabled && this.multiplayer) {
      // Notify server about wave start
      this.multiplayer.startWave(this.level.ducks, this.level.bullets);
    }

    // Use a deterministic seed for local initiator as well
    const seed = (this.waveStartTime & 0xffffffff);
    // Pass wave number and seed to ensure consistent duck IDs and paths
    this.stage.addDucks(this.level.ducks, this.level.speed, this.wave, seed);
  }

  endWave() {
    this.waveEnding = true;
    this.bullets = 0;
    sound.stop(this.quackingSoundId);
    
    if (this.multiplayerEnabled && this.multiplayer) {
      this.multiplayer.endWave();
    }
    
    if (this.stage.ducksAlive()) {
      this.ducksMissed += this.level.ducks - this.ducksShotThisWave;
      this.renderer.backgroundColor = PINK_SKY_COLOR;
      this.stage.flyAway().then(this.goToNextWave.bind(this));
    } else {
      this.stage.cleanUpDucks();
      this.goToNextWave();
    }
  }

  goToNextWave() {
    this.renderer.backgroundColor = BLUE_SKY_COLOR;
    if (this.level.waves === this.wave) {
      this.endLevel();
    } else {
      this.startWave();
    }
  }

  shouldWaveEnd() {
    // evaluate pre-requisites for a wave to end
    if (this.wave === 0 || this.waveEnding || this.stage.dogActive()) {
      return false;
    }

    return this.isWaveTimeUp() || (this.outOfAmmo() && this.stage.ducksAlive()) || !this.stage.ducksActive();
  }

  isWaveTimeUp() {
    return this.level ? this.waveElapsedTime() >= this.level.time : false;
  }

  waveElapsedTime() {
    return ((Date.now() - this.waveStartTime) / 1000) - this.timePaused;
  }

  outOfAmmo() {
    return this.level && this.bullets === 0;
  }

  endLevel() {
    this.wave = 0;
    
    if (this.multiplayerEnabled && this.multiplayer) {
      this.multiplayer.endLevel();
    }
    
    this.goToNextLevel();
  }

  goToNextLevel() {
    this.levelIndex++;
    if (!this.levelWon()) {
      this.loss();
    } else if (this.levelIndex < this.levels.length) {
      this.startLevel();
    } else {
      this.win();
    }
  }

  levelWon() {
    return this.ducksShot > SUCCESS_RATIO * this.level.ducks * this.level.waves;
  }

  win() {
    sound.play('champ');
    this.gameStatus = 'You Win!';
    this.showReplay(this.getScoreMessage());
  }

  loss() {
    sound.play('loserSound');
    this.gameStatus = 'You Lose!';
    this.showReplay(this.getScoreMessage());
  }

  getScoreMessage() {
    let scoreMessage;

    const percentage = (this.score / this.maxScore) * 100;

    if (percentage === 100) {
      scoreMessage = 'Flawless victory.';
    }

    if (percentage < 100) {
      scoreMessage = 'Close to perfection.';
    }

    if (percentage <= 95) {
      scoreMessage = 'Truly impressive score.';
    }

    if (percentage <= 85) {
      scoreMessage = 'Solid score.';
    }

    if (percentage <= 75) {
      scoreMessage = 'Participation award.';
    }

    if (percentage <= 63) {
      scoreMessage = 'Yikes.';
    }

    return scoreMessage;
  }

  showReplay(replayText) {
    this.stage.hud.createTextBox('replayButton', {
      location: Stage.replayButtonLocation()
    });
    this.stage.hud.replayButton = replayText + ' Play Again?';
  }

  openLevelCreator() {
    // If they didn't pause the game, pause it for them
    if (!this.paused) {
      this.pause();
    }
    window.open('/creator.html', '_blank');
  }

  handleClick(event) {
    const clickPoint = {
      x: event.data.global.x,
      y: event.data.global.y
    };

    if (this.stage.clickedPauseLink(clickPoint)) {
      this.pause();
      return;
    }

    if (this.stage.clickedMuteLink(clickPoint)) {
      this.mute();
      return;
    }

    if (this.stage.clickedFullscreenLink(clickPoint)) {
      this.fullscreen();
      return;
    }

    if (this.stage.clickedLevelCreatorLink(clickPoint)) {
      this.openLevelCreator();
      return;
    }

    if (!this.stage.hud.replayButton && !this.outOfAmmo() && !this.shouldWaveEnd() && !this.paused) {
      sound.play('gunSound');
      this.bullets -= 1;
      
      const ducksShot = this.stage.shotsFired(clickPoint, this.level.radius);
      
      if (this.multiplayerEnabled && this.multiplayer) {
        this.multiplayer.fireShot(clickPoint, this.level.radius);
        if (ducksShot > 0) {
          const points = ducksShot * this.level.pointsPerDuck;
          this.multiplayer.reportDucksHit(ducksShot, points);
          
          // Report individual duck shots
          this.stage.ducks.forEach((duck) => {
            if (!duck.alive && duck.visible && duck.id) {
              this.multiplayer.reportDuckShot(duck.id);
            }
          });
        }
      }
      
      this.updateScore(ducksShot);
      return;
    }

    if (this.stage.hud.replayButton && this.stage.clickedReplay(clickPoint)) {
      window.location = window.location.pathname;
    }
  }

  updateScore(ducksShot) {
    this.ducksShot += ducksShot;
    this.ducksShotThisWave += ducksShot;
    this.score += ducksShot * this.level.pointsPerDuck;
  }

  animate() {
    if (!this.paused) {
      this.renderer.render(this.stage);

      if (this.shouldWaveEnd()) {
        this.endWave();
      }
    }

    requestAnimationFrame(this.animate.bind(this));
  }
}

export default Game;
