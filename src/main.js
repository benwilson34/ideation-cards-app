import Pencil, {
  Button,
  Component,
  Container,
  LinearGradient,
  Position,
  Rectangle,
  Scene,
  Text,
} from "https://unpkg.com/pencil.js@3.2.0/dist/pencil.esm.js";

// based on palette: https://coolors.co/palette/0081a7-00afb9-fdfcdc-fed9b7-f07167
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
const CARD_RECT_STYLES = {
  fill: COLORS[4],
  rounded: 4,
  shadow: {
    blur: 40,
    position: [0, 20],
    color: "#33333380",
  },
  cursor: Component.cursors.pointer,
};
const CARD_BUTTON_STYLES = {
  foreground: COLORS[2],
  fontSize: 14,
  fill: "transparent",
  stroke: "#ffffff11",
  hover: "#ffffff11",
  rounded: 4,
};
const CUSTOM_FONT_URL =
  // "//fonts.gstatic.com/s/courgette/v5/wEO_EBrAnc9BLjLQAUk1VvoK.woff2";
  // "https://fonts.gstatic.com/s/amaticsc/v28/TUZyzwprpvBS1izr_vOECuSf.woff2";
  "https://fonts.gstatic.com/s/comingsoon/v20/qWcuB6mzpYL7AJ2VfdQR1t-VWDk.woff2";

let allCardContents = [];
let clickCount = 0;

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
    ...CARD_RECT_STYLES,
    scale: new Position(1, 1),
    rotationCenter: [CARD_WIDTH / 2, CARD_HEIGHT / 2],
    rotation,
  });
  rect.draggable();
  rect.on(Pencil.MouseEvent.events.down, () => {
    // NOTE maybe there's some max zIndex that this would reach eventually, not sure
    clickCount += 1;
    rect.options.zIndex = clickCount + 1;
  });

  const fontSize = 56;
  const PADDING = 8;
  const text = new Text(
    [PADDING * 3, CARD_HEIGHT / 2 - fontSize / 2 + 10],
    cardContents.sideA,
    {
      fill: COLORS[2],
      font: CUSTOM_FONT_URL,
      fontSize,
      align: Text.alignments.center,
      bold: true,
      cursor: Component.cursors.pointer,
    }
  );
  rect.add(text);

  const ID_TEXT_FONT_SIZE = 14;
  const idText = new Text(
    [PADDING, CARD_HEIGHT - ID_TEXT_FONT_SIZE - PADDING],
    `#${cardContents.id}a`,
    {
      fill: COLORS[2],
      fontSize: ID_TEXT_FONT_SIZE,
      cursor: Component.cursors.pointer,
    }
  );
  rect.add(idText);

  const discardButton = new Button([CARD_WIDTH - PADDING - 22, PADDING], {
    ...CARD_BUTTON_STYLES,
    value: "X",
  });
  discardButton.on(Pencil.MouseEvent.events.down, () => {
    // TODO animate
    rect.delete();
  });
  rect.add(discardButton);

  let isAnimating = false;
  let animationFrameCount = 0;
  let isCardOnSideA = true;
  const flipButton = new Button([PADDING, PADDING], {
    ...CARD_BUTTON_STYLES,
    value: "flip",
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

    // flip animation
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

function renderDeck(scene) {
  const deck = new Container();
  const DECK_CARD_COUNT = 10;
  const DECK_CARD_OFFSET_PX = 6;
  for (let i = 0; i < DECK_CARD_COUNT; i += 1) {
    const card = new Rectangle(
      [
        scene.width / 2 - CARD_WIDTH / 2,
        -CARD_HEIGHT / 2 - i * DECK_CARD_OFFSET_PX,
      ],
      CARD_WIDTH,
      CARD_HEIGHT,
      {
        ...CARD_RECT_STYLES,
        stroke: COLORS[4],
        ...(i !== 0 && {
          shadow: {
            blur: 40,
            position: [0, 3],
            color: "#33333320",
          },
        }),
      }
    );
    deck.add(card);
  }
  deck.on(Pencil.MouseEvent.events.down, () => {
    clickCount += 1;
    const newCard = createRandomCard();
    newCard.options.zIndex = clickCount;
    newCard.position.set(scene.center);
    scene.add(newCard);
  });
  return deck;
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

  const deck = renderDeck(scene);
  scene.add(deck);

  const card1 = createRandomCard();
  const card1Offset = getRandomPositionOffset().multiply(-1, 1);
  card1.position.set(
    scene.center.subtract(CARD_WIDTH, CARD_HEIGHT / 2).add(card1Offset)
  );
  const card2 = createRandomCard();
  const card2Offset = getRandomPositionOffset();
  card2.position.set(scene.center.add(0, -CARD_HEIGHT / 2).add(card2Offset));

  scene.add(card1, card2);

  const preloadFontText = new Text([0, 0], "", {
    font: CUSTOM_FONT_URL,
  });
  preloadFontText.on("ready", () => {
    scene.startLoop();
  });
}

main();
