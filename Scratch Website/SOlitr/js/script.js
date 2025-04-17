const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let tableau = [[], [], [], [], [], [], []];
let waste = [];
let stock = [];
let foundations = [[], [], [], []];
let dragData = null;
let timerInterval = null;
let secondsElapsed = 0;

function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const deck = [];
  for (let suit of suits) {
    for (let rank of RANKS) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealTableau(deck) {
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop();
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }
  stock = deck;
}

function drawFromStock() {
  if (stock.length === 0 && waste.length > 0) {
    stock = waste.reverse().map(c => ({ ...c, faceUp: false }));
    waste = [];
  } else if (stock.length > 0) {
    const card = stock.pop();
    card.faceUp = true;
    waste.push(card);
  }
  render();
}

function isRed(suit) {
  return suit === '♥' || suit === '♦';
}

function canMoveTo(card, targetCard) {
  if (!targetCard) return card.rank === 'K';
  const cardIndex = RANKS.indexOf(card.rank);
  const targetIndex = RANKS.indexOf(targetCard.rank);
  return isRed(card.suit) !== isRed(targetCard.suit) && cardIndex === targetIndex - 1;
}

function canMoveToFoundation(card, pile) {
  if (pile.length === 0) return card.rank === 'A';
  const top = pile[pile.length - 1];
  return card.suit === top.suit && RANKS.indexOf(card.rank) === RANKS.indexOf(top.rank) + 1;
}

function createCardDiv(card, topOffset = 0) {
  const cardDiv = document.createElement('div');
  cardDiv.className = 'card';
  if (isRed(card.suit)) cardDiv.classList.add('red');
  cardDiv.style.top = `${topOffset}px`;

  const content = document.createElement('div');
  content.className = 'card-content';

  const corner = document.createElement('div');
  corner.className = 'corner';
  corner.textContent = `${card.rank}${card.suit}`;
  content.appendChild(corner);

  const img = document.createElement('img');
  img.className = 'card-image';
  const isRoyal = ['J', 'Q', 'K'].includes(card.rank);
  img.src = isRoyal ? 'images/royalty.jpg' : 'images/cosmo.jpg';
  img.alt = isRoyal ? 'royalty' : 'cosmo';
  content.appendChild(img);

  cardDiv.appendChild(content);
  return cardDiv;
}

function enableDragging(cardDiv, cards, from) {
  cardDiv.draggable = true;
  cardDiv.addEventListener("dragstart", (e) => {
    dragData = { cards, from };
    e.dataTransfer.setData("text/plain", "");
    cardDiv.classList.add("dragging");
  });

  cardDiv.addEventListener("dragend", () => {
    cardDiv.classList.remove("dragging");
    dragData = null;
    document.querySelectorAll(".pile, .foundation").forEach(p => p.classList.remove("drop-target"));
  });
}

function enableDropTargets() {
  document.querySelectorAll(".pile").forEach((pileDiv, i) => {
    pileDiv.addEventListener("dragover", (e) => {
      e.preventDefault();
      pileDiv.classList.add("drop-target");
    });

    pileDiv.addEventListener("dragleave", () => {
      pileDiv.classList.remove("drop-target");
    });

    pileDiv.addEventListener("drop", () => {
      if (!dragData) return;
      const fromPile = dragData.from === "waste" ? waste : tableau[dragData.from];
      const toPile = tableau[i];
      const topCard = toPile[toPile.length - 1];

      const isEmptyDrop = toPile.length === 0 && dragData.cards[0].rank === 'K';
      const validMatch = canMoveTo(dragData.cards[0], topCard);

      if (isEmptyDrop || validMatch) {
        const startIndex = fromPile.indexOf(dragData.cards[0]);
        const movedCards = fromPile.splice(startIndex);
        tableau[i].push(...movedCards);
        render();
      }
    });
  });

  document.querySelectorAll(".foundation").forEach((div, i) => {
    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      div.classList.add("drop-target");
    });

    div.addEventListener("dragleave", () => {
      div.classList.remove("drop-target");
    });

    div.addEventListener("drop", () => {
      if (!dragData) return;
      const fromPile = dragData.from === "waste" ? waste : tableau[dragData.from];
      const card = dragData.cards[0];
      if (dragData.cards.length > 1) return;
      if (canMoveToFoundation(card, foundations[i])) {
        fromPile.pop();
        foundations[i].push(card);
        render();
      }
    });
  });
}

function displayStock() {
  const stockDiv = document.getElementById("stock");
  stockDiv.innerHTML = "";

  if (stock.length > 0) {
    const cardBack = document.createElement("div");
    cardBack.className = "card face-down";
    stockDiv.appendChild(cardBack);
    stockDiv.classList.remove("resettable");
  } else if (waste.length > 0) {
    stockDiv.classList.add("resettable");
  } else {
    stockDiv.classList.remove("resettable");
  }
}

function displayWaste() {
  const wasteDiv = document.getElementById("waste");
  wasteDiv.innerHTML = "";
  if (waste.length > 0) {
    const card = waste[waste.length - 1];
    const cardDiv = createCardDiv(card);
    enableDragging(cardDiv, [card], "waste");
    wasteDiv.appendChild(cardDiv);
  }
}

function displayTableau() {
  const tableauDiv = document.getElementById('tableau');
  tableauDiv.innerHTML = '';

  tableau.forEach((pile, pileIndex) => {
    const pileDiv = document.createElement('div');
    pileDiv.className = 'pile';

    pile.forEach((card, i) => {
      let cardDiv;
      if (card.faceUp) {
        const stack = pile.slice(i);
        cardDiv = createCardDiv(card, i * 20);
        enableDragging(cardDiv, stack, pileIndex);
      } else {
        cardDiv = document.createElement('div');
        cardDiv.className = 'card face-down';
        cardDiv.style.top = `${i * 20}px`;
        cardDiv.addEventListener('click', () => {
          if (i === pile.length - 1) {
            card.faceUp = true;
            render();
          }
        });
      }
      pileDiv.appendChild(cardDiv);
    });

    tableauDiv.appendChild(pileDiv);
  });

  enableDropTargets();
}

function displayFoundations() {
  foundations.forEach((pile, i) => {
    const div = document.getElementById(`foundation-${i}`);
    div.innerHTML = "";
    if (pile.length > 0) {
      const card = pile[pile.length - 1];
      const cardDiv = createCardDiv(card);
      div.appendChild(cardDiv);
    }
  });
}

function render() {
  displayStock();
  displayWaste();
  displayTableau();
  displayFoundations();
  checkWinCondition();
}

function checkWinCondition() {
  const total = foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (total === 52) {
    stopTimer();
    launchConfetti();
    setTimeout(() => {
      alert(`🎉 You win in ${secondsElapsed} seconds!`);
      saveTimeToLeaderboard(secondsElapsed);
    }, 300);
  }
}

// Timer + Leaderboard
function startTimer() {
  secondsElapsed = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsElapsed++;
    document.getElementById("timer").textContent = `⏱️ Time: ${secondsElapsed}s`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function saveTimeToLeaderboard(time) {
  const name = prompt("🎉 You won! Enter your name:");
  if (!name) return;
  const scores = JSON.parse(localStorage.getItem("solitaire-leaderboard")) || [];
  scores.push({ name, time });
  scores.sort((a, b) => a.time - b.time);
  const top5 = scores.slice(0, 5);
  localStorage.setItem("solitaire-leaderboard", JSON.stringify(top5));
  renderLeaderboard();
}

function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";
  const scores = JSON.parse(localStorage.getItem("solitaire-leaderboard")) || [];
  scores.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} - ${entry.time}s`;
    list.appendChild(li);
  });
}



document.getElementById("leaderboard-button").addEventListener("click", () => {
  const board = document.getElementById("leaderboard");
  board.style.display = board.style.display === "none" ? "block" : "none";
});

// 🎉 Confetti
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  const pieces = [];
  const colors = ["#f00", "#0f0", "#00f", "#ff0", "#f0f", "#0ff"];
  const W = canvas.width = window.innerWidth;
  const H = canvas.height = window.innerHeight;

  for (let i = 0; i < 100; i++) {
    pieces.push({
      x: Math.random() * W,
      y: Math.random() * H - H,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 5 + 2,
      angle: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let p of pieces) {
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.fill();
      p.y += p.speed;
      p.x += Math.sin(p.angle);
      if (p.y > H) p.y = 0;
    }
    requestAnimationFrame(draw);
  }

  draw();

  setTimeout(() => {
    ctx.clearRect(0, 0, W, H);
  }, 5000);
}

document.getElementById("restart-button").addEventListener("click", restartGame);

function restartGame() {
  tableau = [[], [], [], [], [], [], []];
  foundations = [[], [], [], []];
  waste = [];
  stock = shuffle(createDeck());
  dealTableau(stock);
  render();
  startTimer();
}

restartGame();








