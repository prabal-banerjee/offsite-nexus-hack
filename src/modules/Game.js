import {loader, autoDetectRenderer} from 'pixi.js';
import {remove as _remove} from 'lodash/array';
import levels from '../data/levels.json';
import Stage from './Stage';
import sound from './Sound';
import levelCreator from '../libs/levelCreator.js';
import utils from '../libs/utils';

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
    this.playerNameVal = '';
    this.roundSummaryVisible = false;
    this.hitFeedbackTimeout = null;
    this.ducksByMultiplier = {};
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
    this.showNameOverlay();
    this.animate();

  }

  get playerName() {
    return this.playerNameVal || '';
  }

  set playerName(val) {
    this.playerNameVal = val || '';
    if (this.stage && this.stage.hud) {
      if (!Object.prototype.hasOwnProperty.call(this.stage.hud,'playerName')) {
        this.stage.hud.createTextBox('playerName', {
          style: {
            fontFamily: 'Arial',
            fontSize: '16px',
            align: 'left',
            fill: 'white'
          },
          location: Stage.playerNameBoxLocation()
        });
      }
      this.stage.hud.playerName = this.playerNameVal ? ('🦆 ' + this.playerNameVal) : '';
    }
  }

  showNameOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'dhjs-name-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(0,0,0,0.35)';
    overlay.style.zIndex = '9999';

    const panel = document.createElement('div');
    panel.style.background = 'rgba(20,20,20,0.9)';
    panel.style.color = '#fff';
    panel.style.padding = '20px 24px';
    panel.style.borderRadius = '10px';
    panel.style.textAlign = 'center';
    panel.style.minWidth = '320px';

    const title = document.createElement('h2');
    title.textContent = 'Duck Hunt';
    title.style.margin = '0 0 10px 0';

    const text = document.createElement('p');
    text.textContent = 'Enter your name to start';
    text.style.margin = '0 0 12px 0';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Player name';
    input.style.padding = '8px 10px';
    input.style.borderRadius = '6px';
    input.style.border = '1px solid #444';
    input.style.width = '100%';
    input.style.marginBottom = '12px';

    const btn = document.createElement('button');
    btn.textContent = 'Start';
    btn.style.padding = '10px 16px';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.background = '#ffd27a';
    btn.style.color = '#222';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';

    btn.addEventListener('click', () => {
      this.playerName = (input.value || '').trim();
      document.body.removeChild(overlay);
      this.startLevel();
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btn.click();
      }
    });

    panel.appendChild(title);
    panel.appendChild(text);
    panel.appendChild(input);
    panel.appendChild(btn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    input.focus();
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

    // Estimate max score assuming average 4x multiplier (accounts for mix of duck types)
    this.maxScore += this.level.waves * this.level.ducks * this.level.pointsPerDuck * 4;
    this.ducksShot = 0;
    this.ducksMissed = 0;
    this.wave = 0;
    
    // Reset duck multiplier tracking for new level
    this.ducksByMultiplier = {};

    this.gameStatus = this.level.title;
    this.stage.preLevelAnimation().then(() => {
      this.gameStatus = '';
      this.startWave();
    });
  }

  startWave() {
    // eslint-disable-next-line no-console
    console.log(`🎯 STARTING WAVE ${this.wave + 1} - Level ${this.levelIndex + 1}`);
    // eslint-disable-next-line no-console
    console.log(`📊 Wave Config: ${this.level.ducks} ducks, speed: ${this.level.speed}, bullets: ${this.level.bullets}`);
    
    this.quackingSoundId = sound.play('quacking');
    this.wave += 1;
    this.waveStartTime = Date.now();
    this.bullets = this.level.bullets;
    this.ducksShotThisWave = 0;
    this.waveEnding = false;

    try {
      this.stage.addDucks(this.level.ducks, this.level.speed);
      // eslint-disable-next-line no-console
      console.log(`✅ Successfully added ${this.level.ducks} ducks`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error adding ducks:', error);
    }
  }

  endWave() {
    // eslint-disable-next-line no-console
    console.log(`🏁 ENDING WAVE ${this.wave} - Level ${this.levelIndex + 1}`);
    
    this.waveEnding = true;
    this.bullets = 0;
    sound.stop(this.quackingSoundId);

    // Clear any pending hit feedback timeouts
    if (this.hitFeedbackTimeout) {
      clearTimeout(this.hitFeedbackTimeout);
      this.hitFeedbackTimeout = null;
    }

    // Display round summary - disabled for performance
    // this.displayRoundSummary();

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
    this.gameStatus = 'Such a Loser!';
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

    // Add detailed score breakdown
    let duckBreakdown = '\n\n=== FINAL SCORE BREAKDOWN ===\n';
    duckBreakdown += `Total Score: ${this.score} points\n`;
    duckBreakdown += `Total Ducks Shot: ${this.ducksShot}\n\n`;
    
    duckBreakdown += 'Ducks by Multiplier:\n';
    const multipliers = Object.keys(this.ducksByMultiplier).sort((a, b) => b - a);
    
    if (multipliers.length > 0) {
      for (const multiplier of multipliers) {
        const count = this.ducksByMultiplier[multiplier];
        const points = count * this.levels[0].pointsPerDuck * multiplier;
        duckBreakdown += `• ${multiplier}x multiplier: ${count} ducks (${points} points)\n`;
      }
    } else {
      duckBreakdown += '• No ducks hit\n';
    }
    
    duckBreakdown += '\n========================';

    return scoreMessage + duckBreakdown;
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
      const shotResult = this.stage.shotsFired(clickPoint, this.level.radius);
      this.updateScore(shotResult);
      return;
    }

    if (this.stage.hud.replayButton && this.stage.clickedReplay(clickPoint)) {
      window.location = window.location.pathname;
    }
  }

  updateScore(shotResult) {
    const { ducksShot, hitDucks } = shotResult;
    this.ducksShot += ducksShot;
    this.ducksShotThisWave += ducksShot;

    // Calculate score based on duck multipliers
    let totalScore = 0;
    for (const duck of hitDucks) {
      const basePoints = this.level.pointsPerDuck;
      const multipliedPoints = basePoints * duck.multiplier;
      totalScore += multipliedPoints;

      // Only log special hits to reduce performance impact
      if (duck.multiplier >= 5 || duck.multiplier === 0) {
        // eslint-disable-next-line no-console, max-len
        console.log(`✓ Hit ${duck.type} duck (${duck.multiplier}x): +${multipliedPoints} points`);
      }

      // Track ducks by multiplier
      if (!this.ducksByMultiplier[duck.multiplier]) {
        this.ducksByMultiplier[duck.multiplier] = 0;
      }
      this.ducksByMultiplier[duck.multiplier]++;
    }

    this.score += totalScore;

    // Show simple hit feedback without animations
    if (hitDucks.length > 0) {
      this.showSimpleHitFeedback(hitDucks, totalScore);
    }
  }

  showSimpleHitFeedback(hitDucks, totalScore) {
    // Create detailed hit summary
    const duckCount = hitDucks.length;
    const multipliers = hitDucks.map(duck => `${duck.multiplier}x`).join(', ');
    const duckTypes = hitDucks.map(duck => duck.type).join(', ');
    
    if (this.stage && this.stage.hud) {
      // Create or update hit feedback text box at top center
      if (!this.stage.hud.hitFeedback) {
        this.stage.hud.createTextBox('hitFeedback', {
          style: {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 3
          },
          location: { x: 400, y: 30 }
        });
      }
      
      // Show detailed hit feedback: "Hit 2 ducks: scroll 3x, op 2x = +500 pts"
      let feedbackText;
      if (duckCount === 1) {
        feedbackText = `Hit ${duckTypes} (${multipliers}) = +${totalScore} pts`;
      } else {
        feedbackText = `Hit ${duckCount} ducks: ${duckTypes} (${multipliers}) = +${totalScore} pts`;
      }
      
      this.stage.hud.hitFeedback = feedbackText;
      
      // Clear previous timeout to prevent memory leaks
      if (this.hitFeedbackTimeout) {
        clearTimeout(this.hitFeedbackTimeout);
      }
      
      // Clear after 2 seconds (increased for more detailed text)
      this.hitFeedbackTimeout = setTimeout(() => {
        if (this.stage && this.stage.hud && this.stage.hud.hitFeedback) {
          this.stage.hud.hitFeedback = '';
        }
      }, 2000);
    }
  }

  showHitDucksSummary(hitDucks, totalScore) {
    const summary = hitDucks.map((duck) =>
      `${duck.type} (${duck.color}) - ${duck.multiplier}x`
    ).join(', ');

    // Only log if multiple hits or special ducks
    if (hitDucks.length > 1 || hitDucks.some(duck => duck.multiplier >= 5 || duck.multiplier === 0)) {
      // eslint-disable-next-line no-console
      console.log(`→ Shot Result: ${hitDucks.length} hit | ${summary} | +${totalScore} points`);
    }

    // Optional: Show visual summary for a few seconds
    if (this.stage && this.stage.hud) {
      const summaryText = `Hit: ${summary}`;
      if (!this.stage.hud.hitSummary) {
        this.stage.hud.createTextBox('hitSummary', {
          style: {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
          },
          location: { x: 400, y: 50 }
        });
      }

      this.stage.hud.hitSummary = summaryText;

      // Clear after 3 seconds
      setTimeout(() => {
        if (this.stage && this.stage.hud && this.stage.hud.hitSummary) {
          this.stage.hud.hitSummary = '';
        }
      }, 3000);
    }
  }

  getRoundSummary() {
    if (!this.stage || !this.stage.hitDucksThisRound) {
      return { hitDucks: [], totalScore: 0 };
    }

    const hitDucks = this.stage.hitDucksThisRound;
    let totalScore = 0;

    for (const duck of hitDucks) {
      const basePoints = this.level.pointsPerDuck;
      totalScore += basePoints * duck.multiplier;
    }

    return { hitDucks, totalScore };
  }

  displayRoundSummary() {
    if (!this.stage || !this.stage.hitDucksThisRound) {
      // eslint-disable-next-line no-console
      console.log('Wave End Summary: No ducks hit this round');
      return;
    }

    const hitDucks = this.stage.hitDucksThisRound;
    const duckTypeCount = {};
    let totalScore = 0;

    // Count duck types and calculate total score
    for (const duck of hitDucks) {
      const key = `${duck.type} (${duck.color})`;
      if (!duckTypeCount[key]) {
        duckTypeCount[key] = { count: 0, totalMultiplier: 0 };
      }
      duckTypeCount[key].count++;
      duckTypeCount[key].totalMultiplier += duck.multiplier;

      const basePoints = this.level.pointsPerDuck;
      totalScore += basePoints * duck.multiplier;
    }

    // Create summary string
    const summaryLines = [];
    summaryLines.push(`\n=== WAVE ${this.wave} SUMMARY ===`);
    summaryLines.push(`Total Ducks Hit: ${hitDucks.length}/${this.level.ducks}`);
    summaryLines.push('Duck Types Hit:');

    for (const [duckType, info] of Object.entries(duckTypeCount)) {
      const avgMultiplier = (info.totalMultiplier / info.count).toFixed(1);
      summaryLines.push(`  • ${duckType}: ${info.count}x (avg ${avgMultiplier}x multiplier)`);
    }

    summaryLines.push(`Wave Score: ${totalScore} points`);
    summaryLines.push(`Game Total: ${this.score} points`);
    summaryLines.push(`Performance: ${((hitDucks.length / this.level.ducks) * 100).toFixed(1)}% accuracy`);
    summaryLines.push('========================\n');

    // eslint-disable-next-line no-console
    console.log(summaryLines.join('\n'));
  }

  animate() {
    // Performance monitoring
    const now = performance.now();
    if (this.lastAnimateTime) {
      const deltaTime = now - this.lastAnimateTime;
      if (deltaTime > 100) { // Log if frame takes longer than 100ms
        // eslint-disable-next-line no-console
        console.warn(`⚠️  Slow frame detected: ${deltaTime.toFixed(2)}ms`);
      }
    }
    this.lastAnimateTime = now;
    
    if (!this.paused) {
      try {
        this.renderer.render(this.stage);

        if (this.shouldWaveEnd()) {
          this.endWave();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Animation error:', error);
      }
    }

    requestAnimationFrame(this.animate.bind(this));
  }
}

export default Game;
