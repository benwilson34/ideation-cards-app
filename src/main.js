import Pencil, {
  Button,
  Component,
  LinearGradient,
  Position,
  Rectangle,
  Scene,
  Text,
} from "https://unpkg.com/pencil.js@3.2.0/dist/pencil.esm.js";

// palette: https://coolors.co/palette/0081a7-00afb9-fdfcdc-fed9b7-f07167
const COLORS = [
  "#0081a7",
  "#00afb9",
  "#fdfcdc",
  "#fed9b7",
  "#f07167",
  "#eebf25ff",
];
const CARD_WIDTH = 300;
const CARD_HEIGHT = 200;
const CARD_FLIP_ANIMATION_TIMELINE = [0, 120, 121, 241];

let allCardContents = [];

function parseCsv(str) {
  const HEADERS = ["id", "sideA", "sideB", "notes"];
  const objs = [];
  const lines = str.split("\r\n").slice(1); // skip header row
  for (const line of lines) {
    const obj = Object.fromEntries(
      line.split(",").map((token, index) => [[HEADERS[index]], token])
    );
    objs.push(obj);
  }
  return objs;
}

async function loadCardContentsCsv() {
  const PATH = "./public/card-contents.csv";

  const response = await fetch(PATH);
  if (!response.ok) {
    console.error("failed to load card contents:", response);
  }

  const result = await response.text();
  return parseCsv(result);
}

function getRandomCardContents() {
  const randomIndex = Math.floor(Math.random() * allCardContents.length);
  return allCardContents[randomIndex];
}

function createRandomCard() {
  const cardContents = getRandomCardContents();

  const ROTATION_RANGE = 0.005;
  const rotation = Math.random() * ROTATION_RANGE * 2 - ROTATION_RANGE;
  const rect = new Rectangle([0, 0], CARD_WIDTH, CARD_HEIGHT, {
    fill: COLORS[4],
    rounded: 4,
    shadow: {
      blur: 40,
      position: [0, 20],
      color: "#33333380",
    },
    scale: new Position(1, 1),
    cursor: Component.cursors.pointer,
    rotationCenter: [CARD_WIDTH / 2, CARD_HEIGHT / 2],
    rotation,
  });
  rect.draggable();

  const fontSize = 28;
  const MAJOR_PADDING = 28;
  const MINOR_PADDING = 14;
  const text = new Text(
    [MAJOR_PADDING, CARD_HEIGHT / 2 - fontSize / 2],
    cardContents.sideA,
    {
      fill: COLORS[2],
      fontSize: 28,
      align: Text.alignments.center,
      bold: true,
      cursor: Component.cursors.pointer,
    }
  );
  rect.add(text);

  const ID_TEXT_FONT_SIZE = 14;
  const idText = new Text(
    [MINOR_PADDING, CARD_HEIGHT - ID_TEXT_FONT_SIZE - MINOR_PADDING],
    `#${cardContents.id}a`,
    {
      fill: COLORS[2],
      fontSize: ID_TEXT_FONT_SIZE,
      cursor: Component.cursors.pointer,
    }
  );
  rect.add(idText);

  let isAnimating = false;
  let animationFrameCount = 0;
  let isCardOnSideA = true;
  const flipButton = new Button([0, 0], {
    value: "flip",
    foreground: COLORS[2],
    fontSize: 14,
    fill: "transparent",
    stroke: "transparent",
    background: "#222",
    hover: "#ffffff11",
  });
  flipButton.on(Pencil.MouseEvent.events.down, () => {
    if (isAnimating) {
      return;
    }
    isAnimating = true;
  });
  rect.add(flipButton);

  rect.on("draw", () => {
    if (!isAnimating) {
      return;
    }

    if (animationFrameCount <= CARD_FLIP_ANIMATION_TIMELINE[1]) {
      const yScale = 1 - animationFrameCount / CARD_FLIP_ANIMATION_TIMELINE[1];
      rect.options.scale.set(1, yScale);
      rect.position.add(0, CARD_HEIGHT / 2 / CARD_FLIP_ANIMATION_TIMELINE[1]);
    } else if (animationFrameCount <= CARD_FLIP_ANIMATION_TIMELINE[2]) {
      const nextCardSide = isCardOnSideA
        ? cardContents.sideB
        : cardContents.sideA;
      text.text = nextCardSide;
      isCardOnSideA = !isCardOnSideA;
      rect.options.fill = COLORS[isCardOnSideA ? 4 : 5];
      idText.text = `#${cardContents.id}${isCardOnSideA ? "a" : "b"}`;
      rect.options.rotation = -1 * rect.options.rotation;
    } else if (animationFrameCount <= CARD_FLIP_ANIMATION_TIMELINE[3]) {
      const segmentOffset =
        animationFrameCount - CARD_FLIP_ANIMATION_TIMELINE[2];
      const yScale = segmentOffset / CARD_FLIP_ANIMATION_TIMELINE[2];
      rect.options.scale.set(1, yScale);
      rect.position.subtract(
        0,
        CARD_HEIGHT /
          2 /
          (CARD_FLIP_ANIMATION_TIMELINE[3] - CARD_FLIP_ANIMATION_TIMELINE[2])
      );
    } else {
      isAnimating = false;
      animationFrameCount = 0;
    }
    animationFrameCount += 1;
  });

  return rect;
}

function getRandomPositionOffset() {
  const X_RANGE = 50;
  const Y_RANGE = 100;
  const xOffset = Math.random() * X_RANGE;
  const yOffset = Math.random() * Y_RANGE - Y_RANGE / 2; // center y offset
  return new Position(xOffset, yOffset);
}

async function main() {
  allCardContents = await loadCardContentsCsv();

  const scene = new Scene(undefined, {
    fill: "#000000",
  });
  const { width, height } = scene;
  scene.options.fill = new LinearGradient([0, 0], [0, height], {
    0: COLORS[1],
    1: COLORS[0],
  });

  const card1 = createRandomCard();
  const card1Offset = getRandomPositionOffset().multiply(-1, 1);
  card1.position.set(
    scene.center.subtract(CARD_WIDTH, CARD_HEIGHT / 2).add(card1Offset)
  );
  const card2 = createRandomCard();
  const card2Offset = getRandomPositionOffset();
  card2.position.set(scene.center.add(0, -CARD_HEIGHT / 2).add(card2Offset));

  scene
    .add(card1, card2)
    .startLoop()
    .on(
      "draw",
      () => {
        // sun.position.lerp(scene.cursorPosition, 0.05);
        // const sunSettingRatio = (sun.position.y - height / 4) / (height / 2);
        // scene.options.fill.set("#45a8ff").lerp("#150a1b", sunSettingRatio);
        // ocean.options.fill.position.set(
        //   sun.position.x,
        //   height / 2 - sun.position.y
        // );
      },
      true
    );
}

main();
