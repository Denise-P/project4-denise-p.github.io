let map;
let hoverRect = null; // blue hover highlight
let correctRect = null; // green correct area
let wrongRect = null; // red chosen area (only when wrong)
let hoveredZone = null; // which building we're currently over
let locked = false; // lock input after submit
let gameStarted = false; // track if the game has started
let gameStartTime = null; // timestamp when the game started
let timerInterval = null; // interval ID for the timer

//limits my map to CSUN area
const CSUN_BOUNDS = {
  north: 34.2442,
  south: 34.2355,
  east: -118.5200,
  west: -118.550,
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
      north: 34.24049024,
      south: 34.24019024,
      east: -118.52562214,
      west: -118.52592214,
    },
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

// Hover tuning + hitbox size
const HOVER_THROTTLE_MS = 30;
let lastHoverTime = 0;

const HITBOX_EXPAND = 0.00025; // make hover easier (you can increase this)

// ---------- UI helpers ----------
function showQuestion(index) {
  QUESTIONS.forEach((q, i) => {
    const el = document.querySelector(q.selector);
    if (!el) return;
    el.style.display = i === index ? "block" : "none";
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

function findZoneAtLatLng(latLng) {
  const lat = latLng.lat();
  const lng = latLng.lng();

  for (const zone of BUILDING_ZONES) {
    const b = expandBounds(zone.bounds); // <-- use expanded bounds for detection
    const inside =
      lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;
    if (inside) return zone;
  }
  return null;
}

function clearResultRects() {
  if (correctRect) correctRect.setMap(null);
  if (wrongRect) wrongRect.setMap(null);
  correctRect = null;
  wrongRect = null;
}

function drawCorrect(bounds) {
  correctRect = new google.maps.Rectangle({
    map,
    bounds,
    strokeColor: "#00AA00",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#00AA00",
    fillOpacity: 0.25,
    clickable: false,
  });
}

function drawWrong(bounds) {
  wrongRect = new google.maps.Rectangle({
    map,
    bounds,
    strokeColor: "#FF0000",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.25,
    clickable: false,
  });
}

// Optional: reset between questions
function unlockForNextQuestion() {
  locked = false;
  hoveredZone = null;
  hoverRect.setVisible(false);
  clearResultRects();
}

// ---------- Main ----------
async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 34.240167982948606, lng: -118.5291831979989 },
    zoom: 3,
    mapId: "2b8d6acafe8e057c94f2de19",
    restriction: { latLngBounds: CSUN_BOUNDS, strictBounds: true },
    disableDoubleClickZoom: true,
    disableDefaultUI: true,

    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: false,

    gestureHandling: "none", // blocks touch + mouse gestures
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,

    // Optional: keep icons from being clickable
    clickableIcons: false,
  });

  // Start on question 1
  showQuestion(currentQuestionIndex);

  // Blue hover rectangle (hidden until you hover a zone)
  hoverRect = new google.maps.Rectangle({
    map,
    bounds: expandBounds(BUILDING_ZONES[0]?.bounds ?? CSUN_BOUNDS),
    strokeColor: "#0066FF",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#0066FF",
    fillOpacity: 0.2,
    clickable: false,
    visible: false,
  });

  // Hover selection
  map.addListener("mousemove", (e) => {
    if (!gameStarted || locked) return;
    if (locked) return;

    const now = Date.now();
    if (now - lastHoverTime < HOVER_THROTTLE_MS) return;
    lastHoverTime = now;

    const zone = findZoneAtLatLng(e.latLng);
    if (!zone) {
      hoveredZone = null;
      hoverRect.setVisible(false);
      return;
    }

    if (!hoveredZone || hoveredZone.id !== zone.id) {
      hoveredZone = zone;
      hoverRect.setBounds(expandBounds(zone.bounds));
      hoverRect.setVisible(true);
    }
  });

  // Double click = submit answer
  map.addListener("dblclick", () => {
    if (!gameStarted || locked) return;
    if (locked) return;

    if (!hoveredZone) {
      writeResponse(
        currentQuestionIndex,
        "Hover over a building zone first, then double-click to check!"
      );
      return;
    }

    locked = true;
    clearResultRects();

    const targetId = QUESTIONS[currentQuestionIndex].targetId;
    const targetZone = BUILDING_ZONES.find((z) => z.id === targetId);

    if (!targetZone) {
      writeResponse(currentQuestionIndex, "Error: target location not found.");
      locked = false;
      return;
    }

    const isCorrect = hoveredZone.id === targetId;

    // Always show correct location in GREEN
    drawCorrect(targetZone.bounds);

    if (isCorrect) {
      writeResponse(currentQuestionIndex, "✅ That's correct!");
      hoverRect.setVisible(false);

      // go to next question
      currentQuestionIndex++;

      if (currentQuestionIndex < QUESTIONS.length) {
        // small pause optional (or remove this timeout)
        setTimeout(() => {
          unlockForNextQuestion();
          showQuestion(currentQuestionIndex);
        }, 6000);
      } else {
        gameEndTime = Date.now();
        stopElapsedTimer();

        const totalSeconds = Math.floor((gameEndTime - gameStartTime) / 1000);

        addAttempt(totalSeconds);
        showScoreboard();

        // show Try Again button
        document.getElementById("scoreboard").classList.remove("hidden");
        document.getElementById("try-again-btn").classList.remove("hidden");

        writeResponse(
          QUESTIONS.length - 1,
          "✅ That's correct! 🎉 You finished all questions!"
        );
      }
    } else {
      // Wrong: show chosen area in RED
      drawWrong(hoveredZone.bounds);
      writeResponse(
        currentQuestionIndex,
        `❌ You are incorrect. This is not : ${targetZone.label} . This is building is ${hoveredZone.label}. 
        Please click on the correct location, highlighted by the green square .`
      );
      hoverRect.setVisible(false);
      locked = false;
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
  // Hide scoreboard
  document.getElementById("scoreboard").classList.add("hidden");
  //Hide Try Again button
  document.getElementById("try-again-btn").classList.add("hidden");
  //Clear responses
  resetResponses();
  // Reset timer
  stopElapsedTimer();
  gameStartTime = Date.now();
  startElapsedTimer();

  // Reset game state
  currentQuestionIndex = 0;
  locked = false;
  hoveredZone = null;

  if (typeof clearResultRects === "function") {
    clearResultRects();
  }

  if (hoverRect) {
    hoverRect.setVisible(false);
  }

  // Hide Try Again button
  document.getElementById("try-again-btn").classList.add("hidden");

  // Show first question again
  showQuestion(currentQuestionIndex);
});

