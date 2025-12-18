let map;

let guessMarker = null; // marker for user's guess
let lastGuessLatLng = null; // last guessed location
let hoverMarker = null; // marker for hover

let correctRects = []; // ALL green rectangles
let wrongRects = []; // ALL red rectangles

let locked = false;
let gameStarted = false;
let gameStartTime = null;
let timerInterval = null;

const HITBOX_EXPAND = 0.00025; // “close enough” padding

//limits my map to CSUN area
const CSUN_BOUNDS = {
  north: 34.2442,
  south: 34.2355,
  east: -118.52,
  west: -118.55,
};

//  Areas I can hover over CSUN (coordinates)
const BUILDING_ZONES = [
  {
    id: "UL",
    label: "The University Library ",
    bounds: {
      north: 34.24055,
      south: 34.23985,
      east: -118.5287,
      west: -118.52955,
    },
  },
  {
    id: "NA",
    label: "Charles H. Noski Auditorium",
    bounds: {
      north: 34.24261512,
      south: 34.24221512,
      east: -118.53080062,
      west: -118.53120062,
    },
  },
  {
    id: "USU",
    label: "University Student Union",
    bounds: {
  north: 34.24055,
  south: 34.23985,
  east: -118.52870,
  west: -118.52955,
}
  },
  {
    id: "BK",
    label: "The Bookstore / Campus Store",
    bounds: {
      north: 34.23773955,
      south: 34.23743955,
      east: -118.52801969,
      west: -118.52831969,
    },
  },
  {
    id: "SOR",
    label: "The Soraya",
    bounds: {
      north: 34.23640116,
      south: 34.23610116,
      east: -118.52848728,
      west: -118.52878728,
    },
  },
  {
    id: "SRC",
    label: "The Student Recreation Center",
    bounds: {
      north: 34.24014852,
      south: 34.23984852,
      east: -118.52488957,
      west: -118.52518957,
    },
  },
  {
    id: "SHC",
    label: "The Student Health Center",
    bounds: {
      north: 34.23847224,
      south: 34.23817224,
      east: -118.52623068,
      west: -118.52653068,
    },
  },
  {
    id: "MAT",
    label: "The Matador Statue",
    bounds: {
      north: 34.24024698,
      south: 34.23994698,
      east: -118.5278219,
      west: -118.5281219,
    },
  },
  {
    id: "RE",
    label: "Redwood Hall",
    bounds: {
      north: 34.24214407,
      south: 34.24184407,
      east: -118.52627934,
      west: -118.52657934,
    },
  },
  {
    id: "BH",
    label: "Bayramian Hall",
    bounds: {
      north: 34.24061981,
      south: 34.24031981,
      east: -118.53095386,
      west: -118.53125386,
    },
  },
  {
    id: "JD",
    label: "Jacaranda Hall",
    bounds: {
      north: 34.24134569,
      south: 34.24104569,
      east: -118.52875205,
      west: -118.52905205,
    },
  },
];

//  Questions (match your HTML: .question1, .question2, ...)
let currentQuestionIndex = 0;
const QUESTIONS = [
  { selector: ".question1", targetId: "NA" },
  { selector: ".question2", targetId: "USU" },
  { selector: ".question3", targetId: "UL" },
  { selector: ".question4", targetId: "JD" },
  { selector: ".question5", targetId: "RE" },
];

//---------- Timer helpers ----------
function startElapsedTimer() {
  const timeEl = document.getElementById("time-value");

  timerInterval = setInterval(() => {
    if (!gameStartTime) return;
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    timeEl.textContent = formatTime(elapsed);
  }, 100);
}

function stopElapsedTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

document.getElementById("start-btn").addEventListener("click", () => {
  if (gameStarted) return;

  gameStarted = true;
  locked = false; // allow map interaction
  currentQuestionIndex = 0;

  // hide questions
  document.getElementById("question-container").style.display = "block";

  // start timer
  gameStartTime = Date.now();
  startElapsedTimer();

  // show first question
  showQuestion(currentQuestionIndex);
});

//---------- Time Format helper ----------
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ---------- UI helpers ----------
function showQuestion(index) {
  QUESTIONS.forEach((q, i) => {
    const el = document.querySelector(q.selector);
    if (!el) return;
    el.style.display = i <= index ? "block" : "none";
  });
}

function writeResponse(index, text) {
  const qEl = document.querySelector(QUESTIONS[index].selector);
  if (!qEl) return;

  // your HTML uses ".hidden-response"
  const out = qEl.querySelector(".hidden-response");
  if (!out) return;

  out.classList.remove("hidden");
  out.textContent = text;
}

// ---------- Map helpers ----------
function expandBounds(bounds, amount = HITBOX_EXPAND) {
  return {
    north: bounds.north + amount,
    south: bounds.south - amount,
    east: bounds.east + amount,
    west: bounds.west - amount,
  };
}

function isLatLngInBounds(latLng, bounds, expand = HITBOX_EXPAND) {
  const b = expandBounds(bounds, expand);
  const lat = latLng.lat();
  const lng = latLng.lng();
  return lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;
}

function boundsAroundLatLng(latLng, amount = 0.00018) {
  const lat = latLng.lat();
  const lng = latLng.lng();
  return {
    north: lat + amount,
    south: lat - amount,
    east: lng + amount,
    west: lng - amount,
  };
}

function drawCorrect(bounds) {
  const rect = new google.maps.Rectangle({
    map,
    bounds,
    strokeColor: "#00AA00",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#00AA00",
    fillOpacity: 0.25,
    clickable: false,
  });
  correctRects.push(rect);
}

function drawWrong(bounds) {
  const rect = new google.maps.Rectangle({
    map,
    bounds,
    strokeColor: "#FF0000",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.25,
    clickable: false,
  });
  wrongRects.push(rect);
}

function clearAllRects() {
  correctRects.forEach((r) => r.setMap(null));
  wrongRects.forEach((r) => r.setMap(null));
  correctRects = [];
  wrongRects = [];
}

// Optional: reset between questions
function unlockForNextQuestion() {
  locked = false;
  lastGuessLatLng = null;
  if (guessMarker) guessMarker.setVisible(false);
  if (hoverMarker) hoverMarker.setVisible(true);
}
//bounce animation for marker
function bounceMarkerOnce(marker, duration = 700) {
  if (!marker) return;

  marker.setAnimation(google.maps.Animation.BOUNCE);

  setTimeout(() => {
    marker.setAnimation(null);
  }, duration);
}



// ---------- Main ----------
async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 34.240167982948606, lng: -118.5291831979989 },
    zoom: 3,
    mapId: "2b8d6acafe8e057c94f2de19",
    restriction: { latLngBounds: CSUN_BOUNDS, strictBounds: true },
    disableDefaultUI: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: false,
    gestureHandling: "none",
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    clickableIcons: false,
  });

  // Start on question 1
  showQuestion(currentQuestionIndex);

  // --- GUESS MARKER ---

  google.maps.Animation.BOUNCE;

  guessMarker = new google.maps.Marker({
    map,
    position: map.getCenter(),
    draggable: true, // optional
    visible: false,
  });

  guessMarker.addListener("dragend", (e) => {
    lastGuessLatLng = e.latLng;
  });

  hoverMarker = new google.maps.Marker({
    map,
    position: map.getCenter(),
    opacity: 0.5, // ghost look
    clickable: false,
    zIndex: 999,
  });
  map.addListener("mousemove", (e) => {
    if (!gameStarted || locked) return;

    hoverMarker.setPosition(e.latLng);
  });

  map.addListener("click", (e) => {
    if (!gameStarted || locked) return;

    lastGuessLatLng = e.latLng;

    // place real marker
    guessMarker.setPosition(e.latLng);
    guessMarker.setVisible(true);

    // hide hover preview
    hoverMarker.setVisible(false);
  });

  // Click = place/move marker
  map.addListener("click", (e) => {
    if (!gameStarted || locked) return;

    lastGuessLatLng = e.latLng;
    guessMarker.setPosition(e.latLng);
    guessMarker.setVisible(true);
  });

  // Double click = submit guess
  map.addListener("dblclick", () => {
    if (!gameStarted || locked) return;

    if (!lastGuessLatLng) {
      writeResponse(
        currentQuestionIndex,
        "Click to place your marker first, then double-click to submit!"
      );
      return;
    }

    locked = true;

    bounceMarkerOnce(guessMarker);

    const targetId = QUESTIONS[currentQuestionIndex].targetId;
    const targetZone = BUILDING_ZONES.find((z) => z.id === targetId);

    if (!targetZone) {
      writeResponse(currentQuestionIndex, "Error: target location not found.");
      locked = false;
      return;
    }

    const isCorrect = isLatLngInBounds(lastGuessLatLng, targetZone.bounds);

    // Always show correct location in GREEN
    drawCorrect(targetZone.bounds);

    if (isCorrect) {
      writeResponse(currentQuestionIndex, "✅ That's correct!");
    } else {
      // Wrong: red box around the marker (persists)
      drawWrong(boundsAroundLatLng(lastGuessLatLng));
      writeResponse(
        currentQuestionIndex,
        `❌ Incorrect. The correct location is highlighted in green: ${targetZone.label}`
      );
    }

    // go to next question
    currentQuestionIndex++;

    if (currentQuestionIndex < QUESTIONS.length) {
      setTimeout(() => {
        unlockForNextQuestion();
        showQuestion(currentQuestionIndex);
      }, 600);
    } else {
      const gameEndTime = Date.now();
      stopElapsedTimer();

      const totalSeconds = Math.floor((gameEndTime - gameStartTime) / 1000);
      addAttempt(totalSeconds);
      showScoreboard();
      if (hoverMarker) hoverMarker.setVisible(false);

      document.getElementById("scoreboard").classList.remove("hidden");
      document.getElementById("try-again-btn").classList.remove("hidden");

      writeResponse(QUESTIONS.length - 1, "🎉 Finished all questions!");
    }
  });
}

const ATTEMPTS_KEY = "csunQuizAttempts"; // stores array of attempts
const MAX_ATTEMPTS = 5; // max attempts to keep

function loadAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveAttempts(attempts) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

function addAttempt(seconds) {
  const attempts = loadAttempts();
  attempts.unshift({
    seconds,
    when: Date.now(),
  });
  saveAttempts(attempts.slice(0, MAX_ATTEMPTS));
}

function getBestSeconds() {
  const attempts = loadAttempts();
  if (attempts.length === 0) return null;
  return Math.min(...attempts.map((a) => a.seconds));
}

function showScoreboard() {
  // Best
  const bestEl = document.getElementById("best-time");
  const best = getBestSeconds();
  if (bestEl)
    bestEl.textContent =
      best == null ? "Best: --:--" : `Best: ${formatTime(best)}`;

  // Attempts list
  const attemptsEl = document.getElementById("attempts");
  if (!attemptsEl) return;

  const attempts = loadAttempts();
  if (attempts.length === 0) {
    attemptsEl.textContent = "Attempts: none yet";
    return;
  }

  attemptsEl.innerHTML = `
    <h4>Attempts (latest first)</h4>
      ${attempts
        .map((a) => {
          const d = new Date(a.when);
          return `<li>${formatTime(
            a.seconds
          )} <small>(${d.toLocaleString()})</small></li>`;
        })
        .join("")}

  `;
}
//---------- Reset responses helper ----------
function resetResponses() {
  document.querySelectorAll(".hidden-response").forEach((el) => {
    el.textContent = ""; // clear old text
    el.classList.add("hidden"); // hide it again
  });
}

initMap();

//Try Again button handler
document.getElementById("try-again-btn").addEventListener("click", () => {
  // Clear marker + guesses
  lastGuessLatLng = null;
  if (guessMarker) guessMarker.setVisible(false);

  // Clear ALL boxes
  clearAllRects();

  // Hide scoreboard + button
  document.getElementById("scoreboard").classList.add("hidden");
  document.getElementById("try-again-btn").classList.add("hidden");

  // Clear responses
  resetResponses();

  // Reset timer
  stopElapsedTimer();
  gameStartTime = Date.now();
  startElapsedTimer();

  // Reset game state
  currentQuestionIndex = 0;
  locked = false;

  if (hoverMarker) hoverMarker.setVisible(true);

  // Show first question again
  showQuestion(currentQuestionIndex);
});
