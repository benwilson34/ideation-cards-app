import Pencil, {
  Button,
  Component,
  LinearGradient,
  Rectangle,
  Scene,
  Text,
} from "https://unpkg.com/pencil.js@3.2.0/dist/pencil.esm.js";

// palette: https://coolors.co/palette/0081a7-00afb9-fdfcdc-fed9b7-f07167
const COLORS = ["#0081a7", "#00afb9", "#fdfcdc", "#fed9b7", "#f07167"];

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

  const WIDTH = 300;
  const HEIGHT = 200;
  const ROTATION_RANGE = 0.005;
  const rotation = Math.random() * ROTATION_RANGE * 2 - ROTATION_RANGE;
  const rect = new Rectangle([0, 0], WIDTH, HEIGHT, {
    fill: COLORS[4],
    rounded: 4,
    shadow: {
      blur: 40,
      position: [0, 20],
      color: "#33333380",
    },
    cursor: Component.cursors.pointer,
    rotationCenter: [WIDTH / 2, HEIGHT / 2],
    rotation,
  });
  rect.draggable();

  const fontSize = 28;
  const text = new Text(
    [fontSize, HEIGHT / 2 - fontSize / 2],
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

  const flipButton = new Button([0, 0], {
    value: "flip",
    foreground: COLORS[2],
    fontSize: 14,
    fill: "transparent",
    stroke: "transparent",
    background: "#222",
    hover: "#ffffff11",
  });
  let isCardOnSideA = true;
  flipButton.on(Pencil.MouseEvent.events.down, () => {
    const nextCardSide = isCardOnSideA
      ? cardContents.sideB
      : cardContents.sideA;
    text.text = nextCardSide;
    isCardOnSideA = !isCardOnSideA;
  });
  rect.add(flipButton);

  return rect;
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
  card1.position.set([width / 4, height / 2]);
  const card2 = createRandomCard();
  card2.position.set([(width * 3) / 4, height / 2]);

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
