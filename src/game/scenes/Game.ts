import { Scene } from "phaser";
import { System } from "../../system";
import { GAME_HEIGHT, GAME_WIDTH, MARBLE_SIZE, MOVE_DURATION } from "../../constants";

export class Game extends Scene {
  private startImmediately = false;

  constructor() {
    super("Game");
  }

  init(data: { startImmediately?: boolean } = {}) {
    this.startImmediately = data.startImmediately ?? false;
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
    turnPanelShadow.fillStyle(0x263226, 0.2).fillRoundedRect(22, 24, 390, 72, 18);
    const turnPanel = this.add.graphics().setDepth(4);
    turnPanel
      .fillStyle(0x365b38, 1)
      .fillRoundedRect(18, 18, 390, 72, 18)
      .fillStyle(0xfffdf0, 1)
      .fillRoundedRect(22, 22, 382, 64, 14)
      .lineStyle(2, 0x87977b, 1)
      .strokeRoundedRect(22, 22, 382, 64, 14);
    this.add
      .text(112, 54, "현재 차례:", {
        color: "#64745b",
        fontSize: "21px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(5);
    const turnMarbleText = this.add
      .text(282, 54, "", {
        color: "#263d28",
        fontSize: "27px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(5);
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

    const victoryMessage = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 65, "", {
        color: "#263d28",
        fontSize: "34px",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 440 },
      })
      .setOrigin(0.5);
    const restartButton = this.add.rectangle(GAME_WIDTH / 2 - 105, GAME_HEIGHT / 2 + 65, 190, 66, 0x4d8c50);
    const restartLabel = this.add
      .text(restartButton.x, restartButton.y, "다시 시작", {
        color: "#ffffff",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const returnHomeButton = this.add.rectangle(
      GAME_WIDTH / 2 + 105,
      GAME_HEIGHT / 2 + 65,
      160,
      66,
      0x68756a
    );
    const returnHomeLabel = this.add
      .text(returnHomeButton.x, returnHomeButton.y, "홈으로", {
        color: "#ffffff",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const victoryOverlay = this.add
      .container(0, 0, [
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.58),
        this.add
          .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 300, 0xfffdf0)
          .setStrokeStyle(4, 0x365b38),
        victoryMessage,
        restartButton,
        restartLabel,
        returnHomeButton,
        returnHomeLabel,
      ])
      .setDepth(2000)
      .setVisible(false);

    const startGame = () => {
      started = true;
      startOverlay.setVisible(false);
      homeButton.setVisible(true);
    };
    const wallCollisionAnimations = new Set<number>();
    const playWallCollisionAnimation = (marbleId: number, impactX: number, impactY: number) => {
      const img = marbleImages[marbleId];
      const label = marbleLabelTexts[marbleId];
      const resetPosition = marblePositions[marbleId];
      if (!img || !label || !resetPosition) {
        return;
      }

      wallCollisionAnimations.add(marbleId);
      img.setPosition(impactX, impactY).setAlpha(1);
      label.setPosition(impactX - 13, impactY - 17).setAlpha(1);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 240,
        onUpdate: (tween) => {
          const flashPhase = Math.floor(tween.getValue() * 6);
          if (flashPhase % 2 === 0) {
            img.setTintFill(0xffff00);
          } else {
            img.clearTint();
          }
          img.setAlpha(flashPhase % 2 === 0 ? 1 : 0.35);
          label.setAlpha(flashPhase % 2 === 0 ? 1 : 0.35);
        },
        onComplete: () => {
          this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 50,
            onUpdate: (tween) => {
              const progress = tween.getValue();
              const x = impactX + (resetPosition.x - impactX) * progress;
              const y = impactY + (resetPosition.y - impactY) * progress;
              img.setPosition(x, y);
              label.setPosition(x - 13, y - 17);
            },
            onComplete: () => {
              img.clearTint();
              img.setPosition(resetPosition.x, resetPosition.y);
              img.setTexture(resetPosition.lion ? "marble_red" : "marble_green");
              img.setAlpha(1);
              label.setPosition(resetPosition.x - 13, resetPosition.y - 17);
              label.setText(`${marbleId}`);
              label.setAlpha(1);
              wallCollisionAnimations.delete(marbleId);
            },
          });
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
        });

        args.holes.forEach((hole, i) => {
          holeImages.push(this.add.image(hole.x, hole.y, "hole"));
        });
      }

      args.wallCollisions.forEach(({ marbleId, x, y }) => {
        playWallCollisionAnimation(marbleId, x, y);
      });
      turnMarbleText.setText(`${args.turn}번 구슬`);

      args.marbles.forEach((marble, i) => {
        if (wallCollisionAnimations.has(i)) {
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
        img.setTexture(marble.lion ? "marble_red" : "marble_green");
        const txt = marbleLabelTexts[i];
        txt.setX(marble.x - 13);
        txt.setY(marble.y - 17);
        txt.setText(`${marble.id}`);
        txt.setAlpha(myTurn ? 1 : 0.3);

        if (!marble.lion) {
        }

        if (!marble.alive) {
          img.setAlpha(0);
          txt.setAlpha(0);
          return;
        }
      });

      if (!gameEnded && args.state === "wait_move") {
        const survivors = args.marbles.filter((marble) => marble.alive);
        if (survivors.length === 1) {
          gameEnded = true;
          movementInProgress = true;
          draggedMarble = undefined;
          dragGuideLine.setVisible(false);
          victoryMessage.setText(`${survivors[0].id}번 구슬이 최종 승리했습니다!`);
          victoryOverlay.setVisible(true);
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
      if (gameEnded) {
        if (restartButton.getBounds().contains(pointer.x, pointer.y)) {
          this.scene.restart({ startImmediately: true });
        } else if (returnHomeButton.getBounds().contains(pointer.x, pointer.y)) {
          this.scene.restart();
        }
        return;
      }
      if (!started) {
        if (startButton.getBounds().contains(pointer.x, pointer.y)) {
          startGame();
        }
        return;
      }
      if (
        pointer.x >= GAME_WIDTH - 76 &&
        pointer.x <= GAME_WIDTH - 18 &&
        pointer.y >= 18 &&
        pointer.y <= 76
      ) {
        this.scene.restart();
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
