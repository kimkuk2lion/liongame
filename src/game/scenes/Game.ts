import { Scene } from "phaser";
import { System } from "../../system";
import { GAME_HEIGHT, GAME_WIDTH, MARBLE_SIZE, MOVE_DURATION } from "../../constants";
import {
  DEFAULT_PLAYER_COLORS,
  normalizePlayerColors,
  normalizePlayerNames,
} from "./Start";

function marbleTint(id: number, lion: boolean, playerColors: number[]) {
  return lion ? 0xff0000 : (playerColors[id] ?? DEFAULT_PLAYER_COLORS[id] ?? 0xffffff);
}

export class Game extends Scene {
  private startImmediately = false;
  private playerNames = normalizePlayerNames(undefined);
  private playerColors = normalizePlayerColors(undefined);

  constructor() {
    super("Game");
  }

  init(data: { startImmediately?: boolean; playerNames?: unknown; playerColors?: unknown } = {}) {
    this.startImmediately = data.startImmediately ?? false;
    this.playerNames = normalizePlayerNames(data.playerNames);
    this.playerColors = normalizePlayerColors(data.playerColors);
  }

  preload() {
    this.load.setPath("assets");
    this.load.image("marble_red", "marble_red.png");
    this.load.image("marble_green", "marble_green.png");
    this.load.image("hole", "hole.png");
    this.load.image("cursor", "cursor.png");
  }

  create() {
    const marbleImages: Phaser.GameObjects.Image[] = [];
    const holeImages: Phaser.GameObjects.Image[] = [];
    const marbleLabelTexts: Phaser.GameObjects.Text[] = [];
    const lionEmojiTexts: Phaser.GameObjects.Text[] = [];
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x171512)
      .setDepth(-100);
    this.add
      .rectangle(GAME_WIDTH / 2, 700, GAME_WIDTH - 16, 1184, 0x3b261b)
      .setDepth(-99);
    this.add
      .rectangle(GAME_WIDTH / 2, 700, GAME_WIDTH - 36, 1168, 0x145c3a)
      .setStrokeStyle(4, 0x0b3d28)
      .setDepth(-98);
    const turnPanelShadow = this.add.graphics().setDepth(3);
    turnPanelShadow.fillStyle(0x263226, 0.2).fillRoundedRect(22, 24, 540, 72, 18);
    const turnPanel = this.add.graphics().setDepth(4);
    turnPanel
      .fillStyle(0x365b38, 1)
      .fillRoundedRect(18, 18, 540, 72, 18)
      .fillStyle(0xfffdf0, 1)
      .fillRoundedRect(22, 22, 532, 64, 14)
      .lineStyle(2, 0x87977b, 1)
      .strokeRoundedRect(22, 22, 532, 64, 14);
    this.add
      .text(142, 54, "현재 차례:", {
        color: "#64745b",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(5);
    const turnMarbleText = this.add
      .text(375, 54, "", {
        color: "#263d28",
        fontSize: "25px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(5);
    const bonusStatusText = this.add
      .text(GAME_WIDTH / 2, 110, "", {
        color: "#fff4b0",
        backgroundColor: "#365b38",
        fontSize: "21px",
        fontStyle: "bold",
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
    const homeButton = this.add.graphics().setDepth(100).setVisible(false);
    homeButton
      .fillStyle(0x263226, 0.2)
      .fillRoundedRect(GAME_WIDTH - 72, 24, 58, 58, 14)
      .fillStyle(0xfffdf0, 1)
      .fillRoundedRect(GAME_WIDTH - 76, 18, 58, 58, 14)
      .lineStyle(2, 0x87977b, 1)
      .strokeRoundedRect(GAME_WIDTH - 76, 18, 58, 58, 14)
      .lineStyle(3, 0x365b38, 1)
      .beginPath()
      .moveTo(GAME_WIDTH - 64, 45)
      .lineTo(GAME_WIDTH - 47, 31)
      .lineTo(GAME_WIDTH - 30, 45)
      .strokePath()
      .strokeRoundedRect(GAME_WIDTH - 59, 42, 24, 20, 3)
      .lineBetween(GAME_WIDTH - 51, 62, GAME_WIDTH - 51, 52)
      .lineBetween(GAME_WIDTH - 45, 62, GAME_WIDTH - 45, 52)
      .lineBetween(GAME_WIDTH - 51, 52, GAME_WIDTH - 45, 52);
    const guideLine = this.add.line(0, 0, 0, 0, 0, 0, 0xff0000, 0.3);
    guideLine.setDepth(99).setLineWidth(20, 1);
    const dragGuideLine = this.add.line(0, 0, 0, 0, 0, 0, 0xffd84d, 1);
    dragGuideLine.setDepth(200).setLineWidth(4, 1).setVisible(false);

    let init = false;
    let started = false;
    let currentTurn = 0;
    let movementInProgress = false;
    let gameEnded = false;
    let pendingWinnerId: number | undefined;
    let marblePositions: { x: number; y: number; alive: boolean; lion: boolean }[] = [];
    let draggedMarble: { x: number; y: number } | undefined;
    const startOverlay = this.add.container(0, 0).setDepth(1000);
    const startButton = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 100,
      260,
      80,
      0x4d8c50
    );
    const startLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, "게임 시작", {
        color: "#ffffff",
        fontSize: "32px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    startOverlay.add([
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55),
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 330, 0xffffff).setStrokeStyle(4, 0x365b38),
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 95, "사자 구슬 게임", {
          color: "#24452a",
          fontSize: "48px",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15, "구슬을 움직여 구멍에 넣고\n사자 구슬로 변신시켜 보세요!", {
          color: "#333333",
          fontSize: "25px",
          align: "center",
          lineSpacing: 12,
        })
        .setOrigin(0.5),
      startButton,
      startLabel,
    ]);

    const victoryPanel = this.add.graphics();
    victoryPanel
      .fillStyle(0x171512, 0.94)
      .fillRoundedRect(-250, -185, 500, 370, 28)
      .lineStyle(5, 0xffd84d, 1)
      .strokeRoundedRect(-250, -185, 500, 370, 28);
    const victoryTitle = this.add
      .text(0, -115, "VICTORY!", {
        color: "#ffff00",
        fontSize: "54px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const victoryWinnerText = this.add
      .text(0, -35, "", {
        color: "#fffdf0",
        fontSize: "32px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const restartButton = this.add.rectangle(0, 115, 220, 64, 0x4d8c50);
    const restartLabel = this.add
      .text(restartButton.x, restartButton.y, "다시 시작", {
        color: "#ffffff",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const victoryOverlay = this.add
      .container(0, 0, [
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.58),
      ])
      .setDepth(2000)
      .setVisible(false);
    const victoryContent = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        victoryPanel,
        victoryTitle,
        victoryWinnerText,
        restartButton,
        restartLabel,
      ])
      .setDepth(2001)
      .setScale(0.8)
      .setVisible(false);

    const startGame = () => {
      started = true;
      startOverlay.setVisible(false);
      homeButton.setVisible(true);
    };
    const eatingMarbles = new Set<number>();
    const showVictoryIfReady = () => {
      if (pendingWinnerId === undefined || eatingMarbles.size > 0 || gameEnded) {
        return;
      }
      gameEnded = true;
      movementInProgress = true;
      draggedMarble = undefined;
      dragGuideLine.setVisible(false);
      victoryWinnerText.setText(`${pendingWinnerId}번 구슬 · ${this.playerNames[pendingWinnerId]} 승리!`);
      victoryOverlay.setVisible(true);
      victoryContent.setVisible(true);
      this.tweens.add({
        targets: victoryContent,
        scale: 1,
        duration: 300,
        ease: "Back.Out",
      });
    };
    const playEatingAnimation = (
      eaterId: number,
      eatenId: number,
      eaterX: number,
      eaterY: number,
      eatenX: number,
      eatenY: number
    ) => {
      const eaterImage = marbleImages[eaterId];
      const eaterLionEmoji = lionEmojiTexts[eaterId];
      const eatenImage = marbleImages[eatenId];
      const eatenLabel = marbleLabelTexts[eatenId];
      const eatenLionEmoji = lionEmojiTexts[eatenId];
      if (!eaterImage || !eatenImage || !eatenLabel) {
        return;
      }

      eatingMarbles.add(eatenId);
      eatenLionEmoji?.setVisible(false);
      const eatenScaleX = eatenImage.scaleX;
      const eatenScaleY = eatenImage.scaleY;
      eatenImage
        .setPosition(eatenX, eatenY)
        .setAlpha(1)
        .setTintFill(marbleTint(eatenId, marblePositions[eatenId]?.lion ?? false, this.playerColors));
      eatenLabel.setPosition(eatenX - 13, eatenY - 17).setAlpha(1);
      const eaterScaleX = eaterImage.scaleX;
      const eaterScaleY = eaterImage.scaleY;
      this.tweens.add({
        targets: eaterImage,
        scaleX: eaterScaleX * 1.2,
        scaleY: eaterScaleY * 1.2,
        duration: 90,
        yoyo: true,
        ease: "Quad.Out",
      });
      if (eaterLionEmoji?.visible) {
        this.tweens.add({
          targets: eaterLionEmoji,
          scale: 1.2,
          duration: 90,
          yoyo: true,
          ease: "Quad.Out",
        });
      }
      this.cameras.main.shake(160, 0.004);

      for (let i = 0; i < 9; i += 1) {
        const angle = (Math.PI * 2 * i) / 9;
        const particle = this.add
          .circle(
            eatenX + Math.cos(angle) * 8,
            eatenY + Math.sin(angle) * 8,
            3 + (i % 3),
            i % 2 === 0 ? 0xffd84d : 0xff8c32,
            1
          )
          .setDepth(2);
        this.tweens.add({
          targets: particle,
          x: eaterX + Math.cos(angle) * 18,
          y: eaterY + Math.sin(angle) * 18,
          scale: 0.15,
          alpha: 0,
          duration: 320,
          ease: "Cubic.Out",
          onComplete: () => particle.destroy(),
        });
      }

      const animation = { progress: 0 };
      this.tweens.add({
        targets: animation,
        progress: 1,
        duration: 340,
        ease: "Cubic.In",
        onUpdate: () => {
          const currentEaterX = eaterImage.x;
          const currentEaterY = eaterImage.y;
          eatenImage.setPosition(
            eatenX + (currentEaterX - eatenX) * animation.progress,
            eatenY + (currentEaterY - eatenY) * animation.progress
          );
          eatenLabel.setPosition(eatenImage.x - 13, eatenImage.y - 17);
          const scale = 1 - animation.progress * 0.9;
          eatenImage.setScale(eatenScaleX * scale, eatenScaleY * scale);
          eatenLabel.setScale(scale);
          eatenImage.setAlpha(1 - animation.progress);
          eatenLabel.setAlpha(1 - animation.progress);
        },
        onComplete: () => {
          eatenImage.clearTint().setAlpha(0).setScale(eatenScaleX, eatenScaleY);
          eatenLabel.setAlpha(0).setScale(1);
          eatingMarbles.delete(eatenId);
          showVictoryIfReady();
        },
      });
    };
    if (this.startImmediately) {
      startGame();
    }

    const system = new System(4, (args) => {
      currentTurn = args.turn;
      movementInProgress = args.state !== "wait_move";
      marblePositions = args.marbles.map(({ x, y, alive, lion }) => ({ x, y, alive, lion }));
      const bonusStatusMessages = {
        none: "",
        earned: "쿠션 성공! 보너스샷 획득",
        ready: "보너스샷 — 한 번 더 발사하세요",
      };
      bonusStatusText.setText(bonusStatusMessages[args.bonusStatus]);
      bonusStatusText.setVisible(args.bonusStatus !== "none");

      if (!init) {
        init = true;
        args.marbles.forEach((marble, i) => {
          marbleImages.push(
            this.add
              .image(0, 0, marble.lion ? "marble_red" : "marble_green")
              .setDisplaySize(MARBLE_SIZE, MARBLE_SIZE)
              .setDepth(1)
          );
          marbleLabelTexts.push(
            this.add
              .text(0, 0, "asdjflkasdjfl", {
                color: "#000",
                fontSize: 40,
                fontStyle: "bold",
              })
              .setDepth(2)
          );
          lionEmojiTexts.push(
            this.add
              .text(0, 0, "🦁", {
                color: "#ffffff",
                fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif',
                fontSize: `${Math.round(MARBLE_SIZE * 1.3)}px`,
              })
              .setOrigin(0.5)
              .setDepth(3)
              .setVisible(false)
          );
        });

        args.holes.forEach((hole, i) => {
          holeImages.push(this.add.image(hole.x, hole.y, "hole"));
        });
      }

      args.eatenMarbles.forEach(({ eaterId, eatenId, eaterX, eaterY, eatenX, eatenY }) => {
        playEatingAnimation(eaterId, eatenId, eaterX, eaterY, eatenX, eatenY);
      });
      turnMarbleText.setText(`${args.turn}번 · ${this.playerNames[args.turn]}`);

      args.marbles.forEach((marble, i) => {
        if (eatingMarbles.has(i)) {
          return;
        }
        const myTurn = i == args.turn;
        if (myTurn) {
          holeImages.forEach((hole, hole_i) => {
            const targetHole = hole_i == marble.hole;
            hole.setAlpha(targetHole ? 0.9 : 0.3);
            if (targetHole) {
              guideLine.setTo(marble.x, marble.y, hole.x, hole.y);
            }
          });
        }
        const img = marbleImages[i];
        img.setX(marble.x);
        img.setY(marble.y);
        img
          .setTexture(marble.lion ? "marble_red" : "marble_green")
          .setTintFill(marbleTint(marble.id, marble.lion, this.playerColors))
          .setAlpha(marble.alive ? 1 : 0);
        const txt = marbleLabelTexts[i];
        txt.setX(marble.x - 13);
        txt.setY(marble.y - 17);
        txt.setText(`${marble.id}`);
        txt.setAlpha(marble.alive && !marble.lion ? (myTurn ? 1 : 0.3) : 0);
        const lionEmoji = lionEmojiTexts[i];
        lionEmoji.setPosition(marble.x, marble.y);
        lionEmoji.setVisible(marble.alive && marble.lion);

        if (!marble.alive) {
          img.setAlpha(0);
          txt.setAlpha(0);
          lionEmoji.setVisible(false);
          return;
        }
      });

      if (!gameEnded && args.state === "wait_move") {
        const survivors = args.marbles.filter((marble) => marble.alive);
        if (survivors.length === 1) {
          pendingWinnerId = survivors[0].id;
          showVictoryIfReady();
        }
      }
    }, {
      left: 20,
      right: GAME_WIDTH - 20,
      top: 118,
      bottom: GAME_HEIGHT - 18,
    });
    system.render();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (
        pointer.x >= GAME_WIDTH - 76 &&
        pointer.x <= GAME_WIDTH - 18 &&
        pointer.y >= 18 &&
        pointer.y <= 76
      ) {
        this.scene.start("Start", {
          playerNames: this.playerNames,
          playerColors: this.playerColors,
        });
        return;
      }
      if (gameEnded) {
        if (restartButton.getBounds().contains(pointer.x, pointer.y)) {
          this.scene.restart({
            startImmediately: true,
            playerNames: this.playerNames,
            playerColors: this.playerColors,
          });
        }
        return;
      }
      if (!started) {
        if (startButton.getBounds().contains(pointer.x, pointer.y)) {
          startGame();
        }
        return;
      }
      if (movementInProgress) {
        return;
      }

      const marble = marblePositions[currentTurn];
      if (
        !marble ||
        !marble.alive ||
        Math.hypot(pointer.x - marble.x, pointer.y - marble.y) > MARBLE_SIZE / 2 + 8
      ) {
        return;
      }
      draggedMarble = { x: marble.x, y: marble.y };
      guideLine.setVisible(false);
      dragGuideLine.setTo(marble.x, marble.y, pointer.x, pointer.y).setVisible(true);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (started && draggedMarble) {
        dragGuideLine.setTo(draggedMarble.x, draggedMarble.y, pointer.x, pointer.y);
      }
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!draggedMarble || gameEnded) {
        return;
      }

      const marble = draggedMarble;
      draggedMarble = undefined;
      dragGuideLine.setVisible(false);
      guideLine.setVisible(true);

      const dragX = pointer.x - marble.x;
      const dragY = pointer.y - marble.y;
      if (Math.hypot(dragX, dragY) < 4) {
        return;
      }
      system.moveMarble(marble.x - dragX, marble.y - dragY);
    });
    this.input.keyboard?.once("keydown-ENTER", startGame);
    this.input.keyboard?.once("keydown-SPACE", startGame);
  }
}
