/**
 * Pencil.js wishlist:
 *   - `draggable` - add optional "target" container. I want to "seal" the card text behind a
 *      transparent "handle" rect which moves the whole card. Right now you can't drag cards if
 *      you mousedown on any card text. Similar point with the pseudo-3d lowlight
 *   - more control over (Rectangle) borders - per-side thickness, color, others?
 */

import Pencil, {
  Button,
  Color,
  Component,
  Container,
  LinearGradient,
  Position,
  Rectangle,
  Scene,
  Text,
} from "https://unpkg.com/pencil.js@3.2.0/dist/pencil.esm.js"; // TODO copy dependency to local?
import { easeOutCubic } from "./public/vendor/easing.js";

// based on palette: https://coolors.co/palette/0081a7-00afb9-fdfcdc-fed9b7-f07167
const COLORS = [
  "#0081a7",
  "#00afb9",
  "#fdfcdc",
  "#fed9b7",
  "#f07167",
  "#eebf25ff",
];
// TODO would be better to prepare Colors here; label semantically; literal lowlight colors here too
const CARD_WIDTH = 300;
const CARD_HEIGHT = 200;
const CARD_FLIP_ANIMATION_TIMELINE = [0, 120, 121, 241];
const CARD_MOVEMENT_ANIMATION_FRAME_LENGTH = 180;
const CARD_RECT_STYLES = {
  fill: COLORS[4],
  rounded: 4,
  // shadow: {
  //   blur: 40,
  //   position: [0, 20],
  //   color: "#66666620",
  // },
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
const CARD_STACK_OFFSET_PX = 4;
const DECK_CONTROLS_SPACING_PX = 40;
const CUSTOM_FONT_URL =
  // "//fonts.gstatic.com/s/courgette/v5/wEO_EBrAnc9BLjLQAUk1VvoK.woff2";
  // "https://fonts.gstatic.com/s/amaticsc/v28/TUZyzwprpvBS1izr_vOECuSf.woff2";
  "https://fonts.gstatic.com/s/comingsoon/v20/qWcuB6mzpYL7AJ2VfdQR1t-VWDk.woff2";

let allCardContents = [];
let clickCount = 0;
let deckPosition;
let discardAreaPosition;
let discardCount = 0;

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

function createBlankCard() {
  const mainRect = new Rectangle([0, 0], CARD_WIDTH, CARD_HEIGHT, {
    ...CARD_RECT_STYLES,
    rotationCenter: new Position(CARD_WIDTH / 2, CARD_HEIGHT / 2),
    scale: new Position(1, 1),
    rotation: 0,
  });

  const lowlightRect = mainRect.clone();
  const LOWLIGHT_OFFSET_PX = 2;
  lowlightRect.height = lowlightRect.height + LOWLIGHT_OFFSET_PX;

  const color = new Color(COLORS[4]).lightness(0.6);
  lowlightRect.options.fill = color;
  lowlightRect.options.stroke = color;
  lowlightRect.options.zIndex = -1;
  lowlightRect.options.rotation = 0;
  mainRect.add(lowlightRect);
  mainRect.lowlightRect = lowlightRect; // ?

  return mainRect;
}

function createRandomCard(initialPosition, dealPosition) {
  const card = createBlankCard();
  const cardContents = getRandomCardContents();

  const ROTATION_RANGE = 0.005;
  card.options.rotation = Math.random() * ROTATION_RANGE * 2 - ROTATION_RANGE;

  const draggable = card.draggable();
  card.on(Pencil.MouseEvent.events.down, () => {
    // NOTE maybe there's some max zIndex that this would reach eventually, not sure
    clickCount += 1;
    card.options.zIndex = clickCount + 1;
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
  card.add(text);

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
  card.add(idText);

  let isAnimatingMovement = true;
  let movementAnimationStartPosition = initialPosition.clone();
  let movementAnimationEndPosition = dealPosition.clone();
  let isAnimatingFlip = false;

  function isAnimating() {
    return isAnimatingMovement || isAnimatingFlip;
  }

  const discardButton = new Button([CARD_WIDTH - PADDING - 22, PADDING], {
    ...CARD_BUTTON_STYLES,
    value: "X",
  });
  discardButton.on(Pencil.MouseEvent.events.down, () => {
    if (isAnimating()) {
      return;
    }
    isAnimatingMovement = true;
    movementAnimationStartPosition = card.position.clone();
    movementAnimationEndPosition = discardAreaPosition
      .clone()
      .subtract(0, discardCount * CARD_STACK_OFFSET_PX);
    draggable.stop();
    // TODO remove other event listeners?
    discardCount += 1;
  });
  card.add(discardButton);

  let animationFrameCount = 0;
  let isCardOnSideA = true;
  const flipButton = new Button([PADDING, PADDING], {
    ...CARD_BUTTON_STYLES,
    value: "flip",
  });
  flipButton.on(Pencil.MouseEvent.events.down, () => {
    if (isAnimating()) {
      return;
    }
    isAnimatingFlip = true;
  });
  card.add(flipButton);

  card.on("draw", () => {
    if (!isAnimating()) {
      return;
    }

    if (isAnimatingFlip) {
      if (animationFrameCount <= CARD_FLIP_ANIMATION_TIMELINE[1]) {
        const yScale =
          1 - animationFrameCount / CARD_FLIP_ANIMATION_TIMELINE[1];
        card.options.scale.set(1, yScale);
        card.position.add(0, CARD_HEIGHT / 2 / CARD_FLIP_ANIMATION_TIMELINE[1]);
      } else if (animationFrameCount <= CARD_FLIP_ANIMATION_TIMELINE[2]) {
        const nextCardSide = isCardOnSideA
          ? cardContents.sideB
          : cardContents.sideA;
        text.text = nextCardSide;
        isCardOnSideA = !isCardOnSideA;

        const nextColor = COLORS[isCardOnSideA ? 4 : 5];
        card.options.fill = nextColor;
        const nextLightness = isCardOnSideA ? 0.6 : 0.4;
        const color = new Color(nextColor).lightness(nextLightness);
        card.lowlightRect.options.fill = color;
        card.lowlightRect.options.stroke = color;

        idText.text = `#${cardContents.id}${isCardOnSideA ? "a" : "b"}`;
        card.options.rotation = -1 * card.options.rotation;
      } else if (animationFrameCount <= CARD_FLIP_ANIMATION_TIMELINE[3]) {
        const segmentOffset =
          animationFrameCount - CARD_FLIP_ANIMATION_TIMELINE[2];
        const yScale = segmentOffset / CARD_FLIP_ANIMATION_TIMELINE[2];
        card.options.scale.set(1, yScale);
        card.position.subtract(
          0,
          CARD_HEIGHT /
            2 /
            (CARD_FLIP_ANIMATION_TIMELINE[3] - CARD_FLIP_ANIMATION_TIMELINE[2])
        );
      }

      animationFrameCount += 1;
      if (animationFrameCount !== CARD_FLIP_ANIMATION_TIMELINE[3]) {
        return;
      }
      animationFrameCount = 0;
      isAnimatingFlip = false;
      card.options.scale.set(1, 1); // FIXME animation end above seems to be off by one
    }

    if (isAnimatingMovement) {
      const segmentOffset =
        animationFrameCount / CARD_MOVEMENT_ANIMATION_FRAME_LENGTH;
      const easedOffset = easeOutCubic(segmentOffset);
      card.position = movementAnimationStartPosition
        .clone()
        .lerp(movementAnimationEndPosition, easedOffset);

      animationFrameCount += 1;
      if (animationFrameCount !== CARD_MOVEMENT_ANIMATION_FRAME_LENGTH) {
        return;
      }
      animationFrameCount = 0;
      isAnimatingMovement = false;
    }
  });

  return card;
}

function renderDeck(scene) {
  deckPosition = new Position(
    scene.center.x - CARD_WIDTH - DECK_CONTROLS_SPACING_PX / 2,
    -CARD_HEIGHT / 2
  );
  const deck = new Container();
  const DECK_CARD_COUNT = 10;
  for (let i = 0; i < DECK_CARD_COUNT; i += 1) {
    const card = createBlankCard();
    card.position = deckPosition.clone().subtract(0, i * CARD_STACK_OFFSET_PX);
    deck.add(card);
  }
  const hintText = new Text(
    deckPosition.clone().add(60, 120),
    "click to draw a new card",
    {
      fill: COLORS[2],
      fontSize: 16,
    }
  );
  deck.add(hintText);
  deck.on(Pencil.MouseEvent.events.down, () => {
    clickCount += 1;
    const dealPosition = scene.center
      .clone()
      .subtract(CARD_WIDTH / 2, CARD_HEIGHT / 2)
      .add(getRandomDealPositionOffset());
    const newCard = createRandomCard(deckPosition, dealPosition);
    newCard.options.zIndex = clickCount;
    scene.add(newCard);
  });
  return deck;
}

function renderDiscardArea(scene) {
  discardAreaPosition = new Position(
    scene.center.x + DECK_CONTROLS_SPACING_PX / 2,
    -(CARD_HEIGHT / 2) - 2
  );
  const discardArea = new Container();

  const outline = new Rectangle(discardAreaPosition, CARD_WIDTH, CARD_HEIGHT, {
    fill: "transparent",
    stroke: COLORS[2],
    dashed: true,
    rounded: 4,
  });
  discardArea.add(outline);

  // const hintText = new Text(
  //   discardAreaPosition.clone().add(60, 120),
  //   "drag a card here to discard",
  //   {
  //     fill: COLORS[2],
  //     fontSize: 16,
  //   }
  // );
  // discardArea.add(hintText);

  return discardArea;
}

function getRandomDealPositionOffset() {
  // TODO might be better to use the scene width/height
  const X_RANGE = 300;
  const Y_RANGE = 300;
  const xOffset = Math.random() * X_RANGE - X_RANGE / 2; // center x offset
  const yOffset = Math.random() * Y_RANGE - Y_RANGE / 2; // center y offset
  return new Position(xOffset, yOffset);
}

function getRandomInitialDealPositionOffset(isLeft) {
  const X_RANGE = 50;
  const Y_RANGE = 100;
  const xOffset = Math.random() * X_RANGE * (isLeft ? -1 : 1);
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

  const discardArea = renderDiscardArea(scene);
  scene.add(discardArea);

  const card1DealPosition = scene.center
    .clone()
    .subtract(CARD_WIDTH, CARD_HEIGHT / 2)
    .add(getRandomInitialDealPositionOffset(true));
  const card1 = createRandomCard(deckPosition, card1DealPosition);

  const card2DealPosition = scene.center
    .clone()
    .subtract(0, CARD_HEIGHT / 2)
    .add(getRandomInitialDealPositionOffset(false));
  const card2 = createRandomCard(deckPosition, card2DealPosition);

  scene.add(card1, card2);

  const preloadFontText = new Text([0, 0], "", {
    font: CUSTOM_FONT_URL,
  });
  preloadFontText.on("ready", () => {
    scene.startLoop();
  });
}

main();
