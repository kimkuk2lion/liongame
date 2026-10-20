import { Scene } from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../../constants";

export const DEFAULT_PLAYER_NAMES = ["플레이어 1", "플레이어 2", "플레이어 3", "플레이어 4"];
export const PLAYER_COLOR_OPTIONS = [
  { name: "보라색", value: 0x8000ff },
  { name: "파란색", value: 0x0000ff },
  { name: "초록색", value: 0x00ff00 },
  { name: "노란색", value: 0xffff00 },
  { name: "주황색", value: 0xff8800 },
  { name: "분홍색", value: 0xff69b4 },
  { name: "하늘색", value: 0x00bfff },
  { name: "민트색", value: 0x00d6a0 },
  { name: "청록색", value: 0x008b8b },
  { name: "자주색", value: 0xc000c0 },
] as const;
export const DEFAULT_PLAYER_COLORS = [
  PLAYER_COLOR_OPTIONS[0].value,
  PLAYER_COLOR_OPTIONS[1].value,
  PLAYER_COLOR_OPTIONS[2].value,
  PLAYER_COLOR_OPTIONS[3].value,
];

export function normalizePlayerNames(value: unknown): string[] {
  return DEFAULT_PLAYER_NAMES.map((defaultName, index) => {
    const candidate = Array.isArray(value) ? value[index] : undefined;
    if (typeof candidate !== "string") {
      return defaultName;
    }

    const name = Array.from(candidate.trim()).slice(0, 12).join("").trim();
    return name || defaultName;
  });
}

export function normalizePlayerColors(value: unknown): number[] {
  const validColors = PLAYER_COLOR_OPTIONS.map(({ value: color }) => color);
  const assigned = new Set<number>();
  return DEFAULT_PLAYER_COLORS.map((defaultColor, index) => {
    const candidate = Array.isArray(value) ? value[index] : undefined;
    const preferred =
      typeof candidate === "number" && validColors.includes(candidate) && !assigned.has(candidate)
        ? candidate
        : defaultColor;
    const selected = !assigned.has(preferred) ? preferred : validColors.find((color) => !assigned.has(color));
    const color = selected ?? defaultColor;
    assigned.add(color);
    return color;
  });
}

export class Start extends Scene {
  private playerNames = normalizePlayerNames(undefined);
  private playerColors = normalizePlayerColors(undefined);

  constructor() {
    super("Start");
  }

  init(data: { playerNames?: unknown; playerColors?: unknown } = {}) {
    this.playerNames = normalizePlayerNames(data.playerNames);
    this.playerColors = normalizePlayerColors(data.playerColors);
  }

  create() {
    const startButton = this.add
      .rectangle(GAME_WIDTH / 2, 1010, 300, 86, 0x4d8c50)
      .setStrokeStyle(3, 0xffd84d)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);
    const startLabel = this.add
      .text(GAME_WIDTH / 2, 1010, "게임 시작", {
        color: "#ffffff",
        fontSize: "34px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x171512).setDepth(-2);
    this.add
      .graphics()
      .fillStyle(0x211c16, 0.98)
      .fillRoundedRect(52, 190, GAME_WIDTH - 104, 900, 30)
      .lineStyle(4, 0xffd84d, 1)
      .strokeRoundedRect(52, 190, GAME_WIDTH - 104, 900, 30)
      .setDepth(-1);
    this.add
      .text(GAME_WIDTH / 2, 290, "LION MARBLE", {
        color: "#ffd84d",
        fontSize: "58px",
        fontStyle: "bold",
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 365, "사자 구슬 게임", {
        color: "#fffdf0",
        fontSize: "30px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(218, 440, "플레이어 이름", {
        color: "#ffd84d",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(520, 440, "색상 선택", {
        color: "#ffd84d",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const canvas = this.game.canvas;
    const inputs: HTMLInputElement[] = [];
    const listeners: { input: HTMLInputElement; type: string; listener: EventListener }[] = [];
    const composing = new WeakSet<HTMLInputElement>();
    const inputPositions = [535, 635, 735, 835];
    const playerColors = [...this.playerColors];
    const selectedColorLabels: Phaser.GameObjects.Text[] = [];
    const colorButtons: Phaser.GameObjects.Arc[][] = [];
    const colorSelectionMessage = this.add
      .text(GAME_WIDTH / 2, 930, "", {
        color: "#ffb4a9",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    DEFAULT_PLAYER_NAMES.forEach((defaultName, index) => {
      this.add
        .text(60, inputPositions[index] + 24, `${index}번`, {
          color: "#fffdf0",
          fontSize: "24px",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);

      const input = document.createElement("input");
      input.type = "text";
      input.value = this.playerNames[index] ?? defaultName;
      input.autocomplete = "off";
      input.setAttribute("aria-label", `${index}번 플레이어 이름`);
      input.style.position = "fixed";
      input.style.zIndex = "10000";
      input.style.boxSizing = "border-box";
      input.style.padding = "0 16px";
      input.style.border = "2px solid #b28b35";
      input.style.borderRadius = "12px";
      input.style.background = "#fffdf0";
      input.style.color = "#263226";
      input.style.font = "bold 20px sans-serif";
      input.style.outline = "none";
      input.style.pointerEvents = "auto";
      document.body.appendChild(input);
      inputs.push(input);

      const selectedPreview = this.add.circle(348, inputPositions[index] + 19, 13, playerColors[index]);
      selectedPreview.setStrokeStyle(2, 0xffd84d);
      const selectedLabel = this.add
        .text(348, inputPositions[index] + 43, `#${playerColors[index].toString(16).toUpperCase().padStart(6, "0")}`, {
          color: "#fffdf0",
          fontSize: "10px",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      selectedColorLabels.push(selectedLabel);

      const rowColorButtons: Phaser.GameObjects.Arc[] = [];
      PLAYER_COLOR_OPTIONS.forEach((option, colorIndex) => {
        const colorButton = this.add
          .circle(376 + colorIndex * 31, inputPositions[index] + 24, 11, option.value)
          .setStrokeStyle(option.value === playerColors[index] ? 3 : 1, option.value === playerColors[index] ? 0xffd84d : 0xffffff)
          .setInteractive({ useHandCursor: true });
        colorButton
          .setData("colorIndex", colorIndex)
          .setData("colorName", option.name)
          .setData("colorHex", `#${option.value.toString(16).toUpperCase().padStart(6, "0")}`);
        colorButton.on("pointerup", () => {
          const selectedColor = option.value;
          if (playerColors.some((color, playerIndex) => playerIndex !== index && color === selectedColor)) {
            colorSelectionMessage.setText("이미 다른 플레이어가 선택한 색상입니다.");
            return;
          }
          playerColors[index] = selectedColor;
          colorSelectionMessage.setText("");
          selectedPreview.setFillStyle(selectedColor, 1);
          selectedLabel.setText(`#${selectedColor.toString(16).toUpperCase().padStart(6, "0")}`);
          colorButtons.forEach((buttons, playerIndex) => {
            buttons.forEach((button, buttonIndex) => {
              const color = PLAYER_COLOR_OPTIONS[buttonIndex].value;
              const selected = playerColors[playerIndex] === color;
              const unavailable = playerColors.some(
                (assigned, assignedIndex) => assignedIndex !== playerIndex && assigned === color
              );
              button.setStrokeStyle(selected ? 3 : 1, selected ? 0xffd84d : 0xffffff);
              button.setAlpha(unavailable && !selected ? 0.25 : 1);
            });
          });
        });
        rowColorButtons.push(colorButton);
      });
      colorButtons.push(rowColorButtons);

      const inputListener: EventListener = () => {
        if (!composing.has(input)) {
          input.value = Array.from(input.value).slice(0, 12).join("");
        }
      };
      const compositionStartListener: EventListener = () => composing.add(input);
      const compositionEndListener: EventListener = () => {
        composing.delete(input);
        input.value = Array.from(input.value).slice(0, 12).join("");
      };
      const keyDownListener: EventListener = (event) => event.stopPropagation();
      for (const [type, listener] of [
        ["input", inputListener],
        ["compositionstart", compositionStartListener],
        ["compositionend", compositionEndListener],
        ["keydown", keyDownListener],
      ] as [string, EventListener][]) {
        input.addEventListener(type, listener);
        listeners.push({ input, type, listener });
      }
    });

    const layoutInputs = () => {
      const bounds = canvas.getBoundingClientRect();
      const scaleX = bounds.width / GAME_WIDTH;
      const scaleY = bounds.height / GAME_HEIGHT;
      inputs.forEach((input, index) => {
        input.style.left = `${bounds.left + 108 * scaleX}px`;
        input.style.top = `${bounds.top + inputPositions[index] * scaleY}px`;
        input.style.width = `${220 * scaleX}px`;
        input.style.height = `${48 * scaleY}px`;
        input.style.fontSize = `${20 * scaleY}px`;
      });
    };
    colorButtons.forEach((buttons, playerIndex) => {
      buttons.forEach((button, buttonIndex) => {
        const color = PLAYER_COLOR_OPTIONS[buttonIndex].value;
        const unavailable = playerColors.some(
          (assigned, assignedIndex) => assignedIndex !== playerIndex && assigned === color
        );
        button.setAlpha(unavailable && playerColors[playerIndex] !== color ? 0.25 : 1);
      });
    });
    const cleanup = () => {
      this.scale.off("resize", layoutInputs);
      window.removeEventListener("resize", layoutInputs);
      window.removeEventListener("scroll", layoutInputs);
      listeners.forEach(({ input, type, listener }) => input.removeEventListener(type, listener));
      inputs.forEach((input) => input.remove());
    };
    this.scale.on("resize", layoutInputs);
    window.addEventListener("resize", layoutInputs);
    window.addEventListener("scroll", layoutInputs);
    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);
    layoutInputs();

    let starting = false;
    startButton.on("pointerup", () => {
      if (starting) {
        return;
      }
      starting = true;
      const playerNames = normalizePlayerNames(inputs.map((input) => input.value));
      const selectedColors = normalizePlayerColors(playerColors);
      cleanup();
      this.scene.start("Game", { playerNames, playerColors: selectedColors, startImmediately: true });
    });
  }
}
