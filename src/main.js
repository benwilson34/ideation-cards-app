import * as fabric from "https://cdn.jsdelivr.net/npm/fabric@6.9.0/+esm";

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

function createRandomCard(id) {
  const el = document.querySelector(id);
  const cardContents = getRandomCardContents();
  let isCardOnSideA = true;

  el.innerHTML = cardContents.sideA;
  el.addEventListener("click", () => {
    const nextCardSide = isCardOnSideA
      ? cardContents.sideB
      : cardContents.sideA;
    el.innerHTML = nextCardSide;
    isCardOnSideA = !isCardOnSideA;
  });

  const rect = new fabric.Rect({
    controls: false,
    fill: "coral",
    borderScaleFactor: 4,
    width: 50,
    height: 50,
  });
  const text = new fabric.FabricText(cardContents.sideA, {
    fill: "brown",
    fontSize: 16,
    width: 50,
    height: 50,
    textAlign: "center",
  });
  const group = new fabric.Group([rect, text], {
    controls: false,
  });

  return group;
}

async function main() {
  allCardContents = await loadCardContentsCsv();

  const card1Rect = createRandomCard("#card1");
  const card2Rect = createRandomCard("#card2");

  const canvasEl = document.querySelector("canvas");
  const canvas = new fabric.Canvas(canvasEl);

  const text = new fabric.FabricText("Fabric.JS");
  text.hasControls = false;
  canvas.add(text);
  canvas.centerObject(text);

  canvas.add(card1Rect);
  canvas.add(card2Rect);
}

main();
