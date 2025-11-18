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
}

async function main() {
  allCardContents = await loadCardContentsCsv();
  console.log({ cardContents: allCardContents });

  createRandomCard("#card1");
  createRandomCard("#card2");
}

main();
