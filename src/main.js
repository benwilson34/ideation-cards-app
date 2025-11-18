let cardContents = [];

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

async function main() {
  cardContents = await loadCardContentsCsv();
  console.log({ cardContents });

  const card1 = document.querySelector("#card1");
  card1.innerHTML = "foo";
  const card2 = document.querySelector("#card2");
  card2.innerHTML = "bar";
}

main();
