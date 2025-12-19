let map; //create map

let guessMarker = null; // marker for user's guess
let lastGuessLatLng = null; // last guessed location
let hoverMarker = null; // marker for hover

let correctRects = []; // ALL green rectangles
let wrongRects = []; // ALL red rectangles

let locked = false;  //Prevent game from starting
let gameStarted = false;//game does not start until this boolean is true
let gameStartTime = null;//Used to calculate total elapsed time
let timerInterval = null;  // Hold the time interval

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
      west: -118.52985,
    },
  },
  {
    id: "NA",
    label: "Charles H. Noski Auditorium",
    bounds: {
      north: 34.24241, // highest lat
      south: 34.24212, // lowest lat
      east: -118.53111, // largest lng
      west: -118.53144, // smallest lng
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
      north: 34.24198,
      south: 34.24163,
      east: -118.52608,
      west: -118.52647,
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
      north: 34.24214869,
      south: 34.24104569,
      east: -118.52775205,
      west: -118.52945205,
    },
  },
];

//  Questions array
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
  // retrives time div
  const timeEl = document.getElementById("time-value");

  //
  timerInterval = setInterval(() => {
    //check if game started
    if (!gameStartTime) return;
    //Runs timer
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    //Displays time
    timeEl.textContent = formatTime(elapsed);
  }, 100);
}

//Stop timer
function stopElapsedTimer() {
  // Clears time intervals
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

// Listen for a click on the "Start" button to begin the game
document.getElementById("start-btn").addEventListener("click", () => {
  if (gameStarted) return;

  gameStarted = true; //starts game
  locked = false; // allow map interaction
  currentQuestionIndex = 0; // counts the number of correct answers

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
  //calculate mintues
  const minutes = Math.floor(totalSeconds / 60);
  //calculate seconds
  const seconds = Math.floor(totalSeconds % 60);
  //Format time 00:00
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ---------- Display Questions helpers ----------
function showQuestion(index) {
  QUESTIONS.forEach((q, i) => {
    //Select questions from p
    const el = document.querySelector(q.selector);
    if (!el) return;
    //show questions
    el.style.display = i <= index ? "block" : "none";
  });
}

//  ---------- Response helpers ----------
function writeResponse(index, text) {
  //Access question array
  const qEl = document.querySelector(QUESTIONS[index].selector);
  if (!qEl) return; // Questions are not visible

  // your HTML uses ".hidden-response"
  const out = qEl.querySelector(".hidden-response");
  if (!out) return;
  //make question visible
  out.classList.remove("hidden");
  //Insert response
  out.textContent = text;
}

// ---------- Map helpers ----------
function expandBounds(bounds, amount = HITBOX_EXPAND) {
  //expand the bounds of boxes
  return {
    north: bounds.north + amount,
    south: bounds.south - amount,
    east: bounds.east + amount,
    west: bounds.west - amount,
  };
}

// ---------- Check Bounds helper ------------
function isLatLngInBounds(latLng, bounds, expand = HITBOX_EXPAND) {
  const b = expandBounds(bounds, expand);
  // Extract latitude and longitude values from the LatLng object
  const lat = latLng.lat();
  const lng = latLng.lng();
  //Return bounds
  return lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;
}

// ---------- Create Red Rectangle --------------
function boundsAroundLatLng(latLng, amount = 0.00018) {
  // Get the latitude and longitude of the point
  const lat = latLng.lat();
  const lng = latLng.lng();
  return {
    north: lat + amount,
    south: lat - amount,
    east: lng + amount,
    west: lng - amount,
  };
}

// ------- Draw Rectangle helper --------
function drawCorrect(bounds) {
  const rect = new google.maps.Rectangle({
    map, // Map instance to draw on
    bounds, // Geographic bounds of the correct area
    strokeColor: "#00AA00",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#00AA00",
    fillOpacity: 0.25,
    clickable: false, // Prevent interaction with the rectangle
  });
  correctRects.push(rect); // Store the rectangle
}

// ------- Draw Rectangle helper --------
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
  wrongRects.push(rect); // Store the rectangle
}

// ----------- Clear Rectangle helper ---------
function clearAllRects() {
  // Remove each rectangle from the map
  correctRects.forEach((r) => r.setMap(null));
  wrongRects.forEach((r) => r.setMap(null));
  correctRects = [];
  wrongRects = [];
}

// ---------------Next Question helper-----------------
function unlockForNextQuestion() {
  //Enable map interation
  locked = false;
  // clear pervious locations
  lastGuessLatLng = null;
  //hide users guess marker
  if (guessMarker) guessMarker.setVisible(false);
  // show the hover preview marker 
  if (hoverMarker) hoverMarker.setVisible(true);
}
// ---------bounce animation helper----------
function bounceMarkerOnce(marker, duration = 700) {
  // Checks if marker exists
  if (!marker) return;
  // use maps bounce animations
  marker.setAnimation(google.maps.Animation.BOUNCE);
// timer durations
  setTimeout(() => {
    marker.setAnimation(null);
  }, duration);
}

// ---------- Main ----------
async function initMap() {
  // Load the Google Maps library 
  const { Map } = await google.maps.importLibrary("maps");
  //Create map in html
  map = new Map(document.getElementById("map"), {
    //Center map
    center: { lat: 34.240167982948606, lng: -118.5291831979989 },
    zoom: 3, //zoom level for map
    mapId: "6769293756103cdbba70d2a3", //map id
    restriction: { latLngBounds: CSUN_BOUNDS, strictBounds: true }, // boundry restriction
    disableDefaultUI: true, //disable UI features
    streetViewControl: false, // disable view control
    mapTypeControl: false, //disable type control
    fullscreenControl: false, // disable screen control
    zoomControl: false, //disable zoom control
    gestureHandling: "none", // disable gesture handling
    draggable: false, // disable drag
    scrollwheel: false, //disable scroll wheel
    disableDoubleClickZoom: true, //disable double click zoom
    keyboardShortcuts: false, //disable keybaord shortcuts
    clickableIcons: false, // disable clickable icons
  });

  // Start on question 1
  showQuestion(currentQuestionIndex);
//
  google.maps.Animation.BOUNCE;

  // --- GUESS MARKER ---
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
    opacity: 0.5,
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
    // If the game isn't running or the question is locked, ignore submissions
    if (!gameStarted || locked) return;
    // If the user never placed a marker, remind them and stop
    if (!lastGuessLatLng) {
      writeResponse(
        currentQuestionIndex,
        "Click to place your marker first, then double-click to submit!"
      );
      return;
    }

    locked = true;
    // bounce the placed marker briefly
    bounceMarkerOnce(guessMarker);

    // Get the target building ID for the current question
    const targetId = QUESTIONS[currentQuestionIndex].targetId;
    // Find the building zone object that matches the target ID
    const targetZone = BUILDING_ZONES.find((z) => z.id === targetId);

    if (!targetZone) {
      writeResponse(currentQuestionIndex, "Error: target location not found.");
      locked = false;
      return;
    }

    const isCorrect = isLatLngInBounds(lastGuessLatLng, targetZone.bounds);

    // Always show correct location in GREEN
    drawCorrect(targetZone.bounds);
    // Safety check: if target zone is missing
    if (isCorrect) {
      writeResponse(currentQuestionIndex, "✅ That's correct!");
    } else {
      // Wrong: red box around the marker
      drawWrong(boundsAroundLatLng(lastGuessLatLng));
      writeResponse(
        currentQuestionIndex,
        `❌ Incorrect. The correct location is highlighted in green: ${targetZone.label}`
      );
    }

    // go to next question
    currentQuestionIndex++;
    // If there are more questions, unlock and show the next question after a short delay
    if (currentQuestionIndex < QUESTIONS.length) {
      setTimeout(() => {
        unlockForNextQuestion();
        showQuestion(currentQuestionIndex);
      }, 600);
    } else {
      // Game finished: stop timer and record score
      const gameEndTime = Date.now();
      stopElapsedTimer();
      // Compute total time in seconds
      const totalSeconds = Math.floor((gameEndTime - gameStartTime) / 1000);
      // Save this attempt and update scoreboard
      addAttempt(totalSeconds);
      showScoreboard();
      // Hide hover marker since the game is over
      if (hoverMarker) hoverMarker.setVisible(false);
      // Reveal scoreboard + try again button
      document.getElementById("scoreboard").classList.remove("hidden");
      document.getElementById("try-again-btn").classList.remove("hidden");
      // Show final completion message
      writeResponse(QUESTIONS.length - 1, "🎉 Finished all questions!");
    }
  });
}

const ATTEMPTS_KEY = "csunQuizAttempts"; // stores array of attempts
const MAX_ATTEMPTS = 5; // max attempts to keep
// Load attempts from localStorage
function loadAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) ?? [];
  } catch {
    return [];
  }
}
// Save attempts back into localStorage as a JSON string
function saveAttempts(attempts) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}
// Add a new attempt to the front of the list
function addAttempt(seconds) {
  const attempts = loadAttempts();
  attempts.unshift({
    seconds,
    when: Date.now(),
  });
  saveAttempts(attempts.slice(0, MAX_ATTEMPTS));
}
// Return the best (fastest) attempt time in seconds
function getBestSeconds() {
  const attempts = loadAttempts();
  if (attempts.length === 0) return null;
  return Math.min(...attempts.map((a) => a.seconds));
}

// Updates the scoreboard UI with best time and list of recent attempts
function showScoreboard() {
  // Update best time display
  const bestEl = document.getElementById("best-time");
  const best = getBestSeconds();
  if (bestEl)
    bestEl.textContent =
      best == null ? "Best: --:--" : `Best: ${formatTime(best)}`;

  // Attempts list
  const attemptsEl = document.getElementById("attempts");
  if (!attemptsEl) return;
  // Update the attempts list display
  const attempts = loadAttempts();
  if (attempts.length === 0) {
    attemptsEl.textContent = "Attempts: none yet";
    return;
  }
  // Build HTML list of attempts
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
  //get hidden response class
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
