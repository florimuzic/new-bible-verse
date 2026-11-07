const SOURCES = [
  "https://raw.githubusercontent.com/jplehmann/textbites/master/textbites/data/NKJV.bible.json",
  "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json"
];

const $ = id => document.getElementById(id);
const bookSel = $("booklist"), chapSel = $("chapterlist"), verseSel = $("verselist");
const verseBg = $("verse-bg"), verseEl = $("verse"), infoEl = $("verse-info");

let books = [];
let queue = [];

// Convert either data format into: [{name, chapters: [[{num, text}, ...], ...]}]
function normalize(json) {
  if (json && json.books) {
    return json.books.map(b => ({
      name: b.name,
      chapters: b.chapters.map(c => c.verses.map(v => ({ num: v.num, text: v.text })))
    }));
  }
  if (Array.isArray(json)) {
    return json.map(b => ({
      name: b.name,
      chapters: b.chapters.map(c => c.map((t, i) => ({ num: i + 1, text: t })))
    }));
  }
  return [];
}

async function loadBible() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const text = (await res.text()).replace(/^\uFEFF/, ""); // strip BOM
      const data = normalize(JSON.parse(text));
      if (data.length) return data;
    } catch (e) {
      console.warn("Failed source:", url, e);
    }
  }
  throw new Error("No Bible source could be loaded");
}

function fillSelect(sel, items) {
  sel.innerHTML = "";
  items.forEach((label, i) => sel.add(new Option(label, i)));
}

function populateChapters(b) {
  fillSelect(chapSel, books[b].chapters.map((_, i) => i + 1));
}

function populateVerses(b, c) {
  fillSelect(verseSel, books[b].chapters[c].map(v => v.num));
}

const cur = () => ({ b: +bookSel.value, c: +chapSel.value, v: +verseSel.value });

function fitText() {
  let size = window.innerHeight * 0.2;
  verseEl.style.fontSize = size + "px";
  while (verseBg.scrollHeight > verseBg.clientHeight && size > 12) {
    size *= 0.95;
    verseEl.style.fontSize = size + "px";
  }
}

function showVerse() {
  const { b, c, v } = cur();
  const verse = books[b].chapters[c][v];
  verseBg.style.opacity = 0;
  infoEl.style.opacity = 0;
  setTimeout(() => {
    verseEl.textContent = verse.text;
    infoEl.textContent = `— ${books[b].name} ${c + 1} : ${verse.num}`;
    fitText();
    verseBg.style.opacity = 1;
    infoEl.style.opacity = 1;
  }, 300);
}

function goPrevious() {
  if (verseSel.selectedIndex > 0) {
    verseSel.selectedIndex--;
    showVerse();
  }
}

function goNext() {
  if (queue.length) {
    const q = queue.shift();
    bookSel.value = q.b;
    populateChapters(q.b);
    chapSel.value = q.c;
    populateVerses(q.b, q.c);
    verseSel.value = q.v;
    showVerse();
    return;
  }
  if (verseSel.selectedIndex < verseSel.options.length - 1) {
    verseSel.selectedIndex++;
    showVerse();
  }
}

bookSel.addEventListener("change", () => {
  populateChapters(+bookSel.value);
  populateVerses(+bookSel.value, 0);
  bookSel.blur();
});
chapSel.addEventListener("change", () => {
  populateVerses(+bookSel.value, +chapSel.value);
  chapSel.blur();
});
verseSel.addEventListener("change", () => verseSel.blur());

$("go-to-verse").addEventListener("click", showVerse);
$("add-to-queue").addEventListener("click", () => queue.push(cur()));
$("next-verse").addEventListener("click", goNext);
$("previous-verse").addEventListener("click", goPrevious);

document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") goPrevious();
  if (e.key === "ArrowRight") goNext();
});

loadBible()
  .then(data => {
    books = data;
    fillSelect(bookSel, books.map(b => b.name));
    populateChapters(0);
    populateVerses(0, 0);
    verseEl.textContent = "Please select a verse.";
  })
  .catch(err => {
    verseEl.textContent = "Could not load the Bible data. Check your internet connection.";
    console.error(err);
  });