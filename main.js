////////////////////////////////////////////////////-Importing-/////////////////////////////////////////////////////////////////////////////
import {spaceship} from "./ship.js";
import {neuralNet} from "./nn.js";
import {pipe} from "./pipe.js";
import {population} from "./population.js"

window.addEventListener("load",() => {
  const loader = document.querySelector(".loader");

  loader.classList.add("loader-hidden");

  loader.addEventListener("trasitioned", () => {
    document.body.removeChild("loader");
  })
})



//////////////////////////////////////////////////-Engine-//////////////////////////////////////////////////////////////////////////////////

document.getElementById("btn1").onclick = function(){
  var str1 = document.getElementById("grav").value;
  var str2 = document.getElementById("t_velo").value;
  var str3 = document.getElementById("muv").value;
  var str4 = document.getElementById("u_acc").value;
  
  const _GRAVITY = parseInt(str1);
  const _TERMINAL_VELOCITY = parseInt(str2);
  const _MAX_UPWARDS_VELOCITY = parseInt(str3);
  const _UPWARDS_ACCELERATION = parseInt(str4);
  const _PIPE_SPACING_X = 250;
  const _PIPE_SPACING_Y = 100;
  const _TREADMILL_SPEED = -125;

  const _CONFIG_WIDTH = 960;
  const _CONFIG_HEIGHT = 540;
  const _GROUND_Y = _CONFIG_HEIGHT;
  const _Ship_POS_X = 50;

//////////////////////////////////////////////-Engine Brain-//////////////////////////////////////////////////////////////////////////////////
  class Brain {
    constructor() {
      this.world = this.activateEngine();
      this._previousFrame = null;
      this._gameOver = true;

      this._statsText1 = null;
      this._statsText2 = null;
      this._gameOverText = null;
      this._pipes = [];
      this.ships = [];

      this.startPopulation();
    }

    startPopulation() {
      const NN_l1 = [
          {size: 7},
          {size: 5, activation: neuralNet.relu},
          {size: 1, activation: neuralNet.sigmoid}
      ];

      const NN_l2 = [
          {size: 7},
          {size: 9, activation: neuralNet.relu},
          {size: 1, activation: neuralNet.sigmoid}
      ];

      const NN_l3 = [
          {size: 7},
          {size: 9, activation: neuralNet.relu},
          {size: 9, activation: neuralNet.relu},
          {size: 1, activation: neuralNet.sigmoid}
      ];

      this._populations = [
        this.generatePopulation(100, NN_l1, 0xFF0000),
        this.generatePopulation(100, NN_l2, 0x0000FF),
        this.generatePopulation(100, NN_l3, 0x00FF00),
      ];
    }

    generatePopulation(sz, shapes, colour) {
      const t = new neuralNet.FFNeuralNetwork(shapes);

      const params = {
        population_size: sz,
        genotype: {
          size: t.toArray().length,
        },
        mutation: {
          magnitude: 0.1,
          odds: 0.1,
          decay: 0,
        },
        breed: {
          selectionCutoff: 0.2,
          immortalityCutoff: 0.05,
          childrenPercentage: 0.5,
        },
        shapes: shapes,
        tint: colour,
      };

      return new population.Population(params);
    }

    Destroy() {
      for (let b of this.ships) {
        b.Destroy();
      }
      for (let p of this._pipes) {
        p.Destroy();
      }
      this._statsText1.destroy();
      this._statsText2.destroy();
      if (this._gameOverText !== null) {
        this._gameOverText.destroy();
      }
      this.ships = [];
      this._pipes = [];
      this._previousFrame = null;
    }

    _Init() {
      for (let i = 0; i < 5; i+=1) {
        this._pipes.push(
            new pipe.PipePairObject({
              scene: this._scene,
              x: 500 + i * _PIPE_SPACING_X,
              spacing: _PIPE_SPACING_Y,
              speed: _TREADMILL_SPEED,
              config_height: _CONFIG_HEIGHT
            }));
      }

      this._gameOver = false;
      this._stats = {
        instance_remaning: 0,
        score: 0,
      };

      const style = {
        font: "40px Fantasy",
        fill: "#FFA500",
        align: "left",
        fixedWidth: 210,
      };
      this._statsText1 = this._scene.add.text(0, 0, '', style);

      style.align = 'left';
      this._statsText2 = this._scene.add.text(
          this._statsText1.width + 10, 0, '', style);

      this.ships = [];
      for (let curPop of this._populations) {
        curPop.Step();

        this.ships.push(...curPop._population.map(
            p => new spaceship.FlappyBird_NeuralNet(
                {
                  scene: this._scene,
                  pop_entity: p,
                  pop_params: curPop._params,
                  x: _Ship_POS_X,
                  config_width: _CONFIG_WIDTH,
                  config_height: _CONFIG_HEIGHT,
                  max_upwards_velocity: _MAX_UPWARDS_VELOCITY,
                  terminal_velocity: _TERMINAL_VELOCITY,
                  treadmill_speed: _TREADMILL_SPEED,
                  acceleration: _UPWARDS_ACCELERATION,
                  gravity: _GRAVITY
                })));
      }
    }

    activateEngine() {
      const self = this;
      const config = {
          type: Phaser.AUTO,
          scene: {
              preload: function() { self.placeEnvironment(this); },
              create: function() { self._OnCreate(this); },
              update: function() { self._OnUpdate(this); },
          },
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            treadmill_speed: _TREADMILL_SPEED,
            width: _CONFIG_WIDTH,
            height: _CONFIG_HEIGHT,
          }
      };

      return new Phaser.Game(config);
    }

    placeEnvironment(scene) {
      this._scene = scene;
      this._scene.load.image('background', 'assets/back.png');
      this._scene.load.image('bird', 'assets/ship.png');
      this._scene.load.image('bird-colour', 'assets/shipcolor.png');
      this._scene.load.image('pipe', 'assets/obstical.png');
    }

    _OnCreate(scene) {
      const s = this._scene.add.image(0, 0, 'background');
      s.displayOriginX = 0;
      s.displayOriginY = 0;
      s.displayWidth = _CONFIG_WIDTH;
      s.displayHeight = _CONFIG_HEIGHT;

      this._keys = {
        up: this._scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        f: this._scene.input.keyboard.addKey('F'),
        r: this._scene.input.keyboard.addKey('R'),
      }

      this._keys.f.on('down', function () {
        if (this._scene.scale.isFullscreen) {
          this._scene.scale.stopFullscreen();
        } else {
          this._scene.scale.startFullscreen();
        }
      }, this);

      this._keys.r.on('down', function () {
        this._Destroy();
        this._Init();
      }, this);

      this._Init();
    }

    _OnUpdate(scene) {
      if (this._gameOver) {
        this._DrawStats();
        return;
      }

      const currentFrame = scene.time.now;
      if (this._previousFrame == null) {
        this._previousFrame = currentFrame;
      }

      const timeElapsedInS = Math.min(
          (currentFrame - this._previousFrame) / 1000.0, 1.0 / 30.0);

      this.UpdateShip(timeElapsedInS);
      this.UpdateObstical(timeElapsedInS);
      this._CheckGameOver();
      this._DrawStats();

      this._previousFrame = currentFrame;
    }

    _CheckGameOver() {
      const results = this.ships.map(b => this.IsShipOutOfBounds(b));

      this._stats.instance_remaning = results.reduce((t, r) => (r ? t: t + 1), 0);

      if (results.every(b => b)) {
        this._GameOver();
      }
    }

    IsShipOutOfBounds(ship) {
      const shipAABB = ship.Bounds;
      shipAABB.top += 10;
      shipAABB.bottom -= 10;
      shipAABB.left += 10;
      shipAABB.right -= 10;

      if (ship.Dead) {
        return true;
      }

      if (shipAABB.bottom >= _GROUND_Y || shipAABB.top <= 0) {
        ship.Dead = true;
        return true;
      }

      for (const p of this._pipes) {
        if (p.Intersects(shipAABB)) {
          ship.Dead = true;
          return true;
        }
      }
      return false;
    }

    _GetNearestPipes() {
      let index = 0;
      if (this._pipes[0].X + this._pipes[0].Width <= _Ship_POS_X) {
        index = 1;
      }
      return this._pipes.slice(index, 2);
    }

    UpdateShip(timeElapsed) {
      const params = {
          timeElapsed: timeElapsed,
          keys: {up: Phaser.Input.Keyboard.JustDown(this._keys.up)},
          nearestPipes: this._GetNearestPipes(),
      };

      for (let b of this.ships) {
        b.Update(params);
      }
    }

    UpdateObstical(timeElapsed) {
      const oldPipeX = this._pipes[0].X + this._pipes[0].Width;

      for (const p of this._pipes) {
        p.Update(timeElapsed);
      }

      const newPipeX = this._pipes[0].X + this._pipes[0].Width;

      if (oldPipeX > _Ship_POS_X && newPipeX <= _Ship_POS_X) {
        this._stats.score += 1;
      }

      if ((this._pipes[0].X + this._pipes[0].Width) <= 0) {
        const p = this._pipes.shift();
        p.Reset(this._pipes[this._pipes.length - 1].X + _PIPE_SPACING_X);
        this._pipes.push(p);
      }
    }

    _GameOver() {
      const text = "!!Fatality!!";
      const style = {
        font: "100px Roboto",
        fill: "#FF0000",
        align: "center",
        fixedWidth: _CONFIG_WIDTH,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: "#000",
          blur: 2,
          fill: true
        }
      };

      this._gameOverText = this._scene.add.text(
          0, _CONFIG_HEIGHT * 0.25, text, style);
      this._gameOver = true;

      setTimeout(() => {
        this.Destroy();
        this._Init();
      }, 2000);
    }

    _DrawStats() {
      function _Line(t, s) {
        return t + ': ' + s + '\n';
      }

      const text1 = 'Generation:\n' + 'Alive:\n' + 'Score:\n';
      this._statsText1.text = text1;

      const text2 = (
          this._populations[0]._generations + '\n' +
          this._stats.instance_remaning + '\n' +
          this._stats.score  + '\n');
      this._statsText2.text = text2;
    }
  }

  ////////////////////////////////////////////////////////////-Active Brain-//////////////////////////////////////////////////////////////
  const _GAME = new Brain();
  
}


