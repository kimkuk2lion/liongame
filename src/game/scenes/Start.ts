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

function colorLabelTextColor(color: number): string {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? "#263226" : "#fffdf0";
}

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
      .rectangle(GAME_WIDTH / 2, 1010, 300, 86, 0xffd84d)
      .setStrokeStyle(3, 0xc99a24)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);
    startButton
      .on("pointerover", () => startButton.setFillStyle(0xffe680).setStrokeStyle(3, 0xffd84d))
      .on("pointerout", () => startButton.setFillStyle(0xffd84d).setStrokeStyle(3, 0xc99a24));
    const startLabel = this.add
      .text(GAME_WIDTH / 2, 1010, "게임 시작", {
        color: "#3b261b",
        fontSize: "34px",
        fontStyle: "bold",
        fontFamily: "Malgun Gothic, Arial, sans-serif",
        padding: { top: 12, bottom: 12 },
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
      .text(GAME_WIDTH / 2, 290, "LION GAME", {
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
        fontFamily: "Malgun Gothic, Arial, sans-serif",
        padding: { top: 12, bottom: 12 },
      })
      .setOrigin(0.5);
    this.add
      .text(236, 462, "플레이어 이름", {
        color: "#ffd84d",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(520, 462, "색상 선택", {
        color: "#ffd84d",
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const canvas = this.game.canvas;
    const inputMeasureContext = document.createElement("canvas").getContext("2d");
    if (inputMeasureContext) {
      inputMeasureContext.font = "bold 20px sans-serif";
    }
    const inputs: HTMLInputElement[] = [];
    const listeners: { input: HTMLInputElement; type: string; listener: EventListener }[] = [];
    const composing = new WeakSet<HTMLInputElement>();
    const inputPositions = [535, 635, 735, 835];
    const playerColors = [...this.playerColors];
    const selectedColorButtons: Phaser.GameObjects.Rectangle[] = [];
    const selectedColorLabels: Phaser.GameObjects.Text[] = [];
    const colorSelectionMessage = this.add
      .text(GAME_WIDTH / 2, 930, "색상 버튼을 누르고 마우스 휠로 색상을 선택하세요.", {
        color: "#fffdf0",
        fontSize: "16px",
        fontStyle: "bold",
        fontFamily: "Malgun Gothic, Arial, sans-serif",
        padding: { top: 8, bottom: 8 },
      })
      .setOrigin(0.5);
    const palette = this.add.container(0, 0).setDepth(20).setVisible(false);
    const palettePanel = this.add.graphics();
    palettePanel
      .fillStyle(0x30281d, 0.98)
      .fillRoundedRect(0, 0, 244, 144, 14)
      .lineStyle(2, 0xffd84d, 1)
      .strokeRoundedRect(0, 0, 244, 144, 14);
    const paletteRows = PLAYER_COLOR_OPTIONS.slice(0, 4).map(() => {
      const background = this.add
        .rectangle(122, 22, 228, 28, 0x30281d)
        .setStrokeStyle(1, 0x766b52)
        .setInteractive({ useHandCursor: true });
      const swatch = this.add.circle(22, 22, 9, 0xffffff).setStrokeStyle(1, 0xffffff);
      const label = this.add
        .text(42, 22, "", {
          color: "#fffdf0",
          fontSize: "16px",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);
      return { background, swatch, label };
    });
    palette.add([
      palettePanel,
      ...paletteRows.flatMap(({ background, swatch, label }, index) => {
        const rowY = 22 + index * 32;
        background.setY(rowY);
        swatch.setY(rowY);
        label.setY(rowY);
        return [background, swatch, label];
      }),
    ]);
    let activePlayerIndex: number | undefined;
    let paletteStartIndex = 0;
    const paletteVisibleCount = paletteRows.length;
    const closePalette = () => {
      activePlayerIndex = undefined;
      palette.setVisible(false);
    };
    const updatePaletteRows = () => {
      if (activePlayerIndex === undefined) {
        return;
      }
      paletteRows.forEach(({ background, swatch, label }, rowIndex) => {
        const colorIndex = paletteStartIndex + rowIndex;
        const option = PLAYER_COLOR_OPTIONS[colorIndex];
        if (!option) {
          background.setVisible(false);
          swatch.setVisible(false);
          label.setVisible(false);
          return;
        }
        const selected = playerColors[activePlayerIndex] === option.value;
        const unavailable = playerColors.some(
          (color, playerIndex) => playerIndex !== activePlayerIndex && color === option.value
        );
        background
          .setVisible(true)
          .setFillStyle(selected ? 0x4d8c50 : 0x30281d, 1)
          .setStrokeStyle(selected ? 2 : 1, selected ? 0xffd84d : 0x766b52)
          .setAlpha(unavailable && !selected ? 0.35 : 1);
        swatch
          .setVisible(true)
          .setFillStyle(option.value, 1)
          .setStrokeStyle(selected ? 2 : 1, selected ? 0xffd84d : 0xffffff)
          .setAlpha(unavailable && !selected ? 0.35 : 1);
        label
          .setVisible(true)
          .setText(option.name)
          .setAlpha(unavailable && !selected ? 0.35 : 1);
      });
    };

    paletteRows.forEach(({ background }, rowIndex) => {
      background.on("pointerup", () => {
        if (activePlayerIndex === undefined) {
          return;
        }
        const option = PLAYER_COLOR_OPTIONS[paletteStartIndex + rowIndex];
        if (!option) {
          return;
        }
        const playerIndex = activePlayerIndex;
        if (playerColors.some((color, assignedIndex) => assignedIndex !== playerIndex && color === option.value)) {
          colorSelectionMessage.setText("이미 다른 플레이어가 선택한 색상입니다.").setColor("#ffb4a9");
          return;
        }
        playerColors[playerIndex] = option.value;
        selectedColorButtons[playerIndex].setFillStyle(option.value, 1);
        selectedColorLabels[playerIndex]
          .setText(option.name)
          .setColor(colorLabelTextColor(option.value));
        colorSelectionMessage.setText("색상이 선택되었습니다.").setColor("#fffdf0");
        closePalette();
      });
    });
    const onPaletteWheel = (
      pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number
    ) => {
      if (
        activePlayerIndex === undefined ||
        pointer.x < palette.x ||
        pointer.x > palette.x + 244 ||
        pointer.y < palette.y ||
        pointer.y > palette.y + 144
      ) {
        return;
      }
      const maxStartIndex = PLAYER_COLOR_OPTIONS.length - paletteVisibleCount;
      paletteStartIndex = Phaser.Math.Clamp(
        paletteStartIndex + Math.sign(deltaY),
        0,
        maxStartIndex
      );
      updatePaletteRows();
    };
    this.input.on("wheel", onPaletteWheel);

    DEFAULT_PLAYER_NAMES.forEach((defaultName, index) => {
      this.add
        .text(78, inputPositions[index] + 24, `${index + 1}번`, {
          color: "#fffdf0",
          fontSize: "24px",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);

      const input = document.createElement("input");
      input.type = "text";
      input.value = this.playerNames[index] ?? defaultName;
      input.autocomplete = "off";
      input.setAttribute("aria-label", `${index + 1}번 플레이어 이름`);
      input.style.position = "fixed";
      input.style.zIndex = "10000";
      input.style.boxSizing = "border-box";
      input.style.padding = "0 16px";
      input.style.border = "2px solid #b28b35";
      input.style.borderRadius = "12px";
      input.style.background = "#fffdf0";
      input.style.color = "#263226";
      input.style.font = "bold 20px sans-serif";
      input.style.textAlign = "center";
      input.style.outline = "none";
      input.style.pointerEvents = "auto";
      document.body.appendChild(input);
      inputs.push(input);

      const initialColor = playerColors[index];
      const selectedColorButton = this.add
        .rectangle(520, inputPositions[index] + 24, 220, 48, initialColor)
        .setStrokeStyle(2, 0xb28b35)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => {
          if (activePlayerIndex === index) {
            closePalette();
            return;
          }
          activePlayerIndex = index;
          paletteStartIndex = Math.max(
            0,
            PLAYER_COLOR_OPTIONS.findIndex(({ value }) => value === playerColors[index]) - 1
          );
          const paletteY = inputPositions[index] + 50;
          const buttonTop = inputPositions[index];
          const paletteTop =
            paletteY + 144 <= 930 ? paletteY : buttonTop - 144 - 6;
          palette.setPosition(398, paletteTop).setVisible(true);
          colorSelectionMessage.setText("색상 버튼을 누르고 마우스 휠로 색상을 선택하세요.").setColor("#fffdf0");
          updatePaletteRows();
        });
      selectedColorButtons.push(selectedColorButton);
      selectedColorLabels.push(
        this.add
          .text(520, inputPositions[index] + 24, PLAYER_COLOR_OPTIONS.find(({ value }) => value === initialColor)?.name ?? "", {
            color: colorLabelTextColor(initialColor),
            fontSize: "20px",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
      );

      const inputListener: EventListener = () => {
        if (!composing.has(input)) {
          input.value = Array.from(input.value).slice(0, 12).join("");
        }
        layoutInputs();
      };
      const compositionStartListener: EventListener = () => composing.add(input);
      const compositionEndListener: EventListener = () => {
        composing.delete(input);
        input.value = Array.from(input.value).slice(0, 12).join("");
        layoutInputs();
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
        input.style.left = `${bounds.left + 126 * scaleX}px`;
        input.style.top = `${bounds.top + inputPositions[index] * scaleY}px`;
        input.style.width = `${220 * scaleX}px`;
        input.style.height = `${48 * scaleY}px`;
        input.style.padding = `0 ${16 * scaleX}px`;
        const textWidth =
          inputMeasureContext?.measureText(input.value).width ?? Array.from(input.value).length * 20;
        const availableWidth = 220 * scaleX - 32 * scaleX - 4;
        const fontSize = Math.min(20 * scaleY, (20 * availableWidth) / textWidth);
        input.style.fontSize = `${fontSize}px`;
      });
    };
    const cleanup = () => {
      this.scale.off("resize", layoutInputs);
      window.removeEventListener("resize", layoutInputs);
      window.removeEventListener("scroll", layoutInputs);
      this.input.off("wheel", onPaletteWheel);
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
