const floorData = {
  ground: {
    label: "Ground Floor",
    rooms: {
      library: room("Library", "Room 101", "Library Wing", 95, "Excellent", "24.3C", "58%", "Good", "Low (32 dB)", "23 / 60", "Best for studying", 38, 42, "excellent"),
      study: room("Study Area 1", "Room 102", "Study Wing", 92, "Excellent", "24.5C", "60%", "Good", "Low (34 dB)", "18 / 42", "Quiet collaborative work", 20, 54, "excellent"),
      admin: room("Admin Office", "Room 103", "Admin Core", 70, "Good", "25.8C", "64%", "Good", "Medium (41 dB)", "11 / 20", "Staff operations", 35, 64, "good"),
      hallway: room("Hallway", "Hallway A", "Main Circulation", 58, "Moderate", "26.1C", "68%", "Fair", "Medium (47 dB)", "31 / 80", "Route connector", 51, 62, "moderate"),
      storage: room("Storage", "Room 104", "Service Zone", 40, "Poor", "28.7C", "72%", "Low", "Low (30 dB)", "2 / 12", "Maintenance access", 24, 78, "poor"),
      lobby: room("Entrance Lobby", "Front Lobby", "Lobby Wing", 50, "Moderate", "27.5C", "70%", "Fair", "Medium (49 dB)", "39 / 90", "Visitor entry point", 68, 78, "moderate"),
      cafeteria: room("Cafeteria", "Dining Zone", "Dining Wing", 64, "Moderate", "26.8C", "70%", "Fair", "Medium (48 dB)", "41 / 70", "Good for eating", 79, 66, "moderate"),
      lounge: room("Lounge", "Relaxation Area", "Lounge Wing", 82, "Excellent", "23.8C", "62%", "Good", "Low (35 dB)", "16 / 32", "Good for relaxation", 88, 47, "excellent"),
      lecture: room("Lecture Room 1", "Room 105", "Learning Wing", 75, "Good", "24.9C", "63%", "Good", "Medium (39 dB)", "34 / 55", "Lecture-ready seating", 69, 31, "good")
    }
  },
  second: {
    label: "Second Floor",
    rooms: {
      reading: room("Reading Nook", "Room 203", "Library Wing", 91, "Excellent", "24.1C", "58%", "Good", "Low (29 dB)", "9 / 18", "Quiet reading", 16, 36, "excellent"),
      lab: room("Computer Lab", "Room 201", "Learning Wing", 88, "Good", "23.9C", "56%", "Good", "Low (33 dB)", "28 / 40", "Best for computing", 45, 26, "good"),
      seminar: room("Seminar Hall", "Room 204", "Learning Wing", 67, "Moderate", "26.4C", "66%", "Fair", "Medium (43 dB)", "36 / 52", "Group sessions", 78, 30, "moderate"),
      faculty: room("Faculty Room", "Room 202", "Admin Core", 79, "Good", "24.8C", "61%", "Good", "Low (34 dB)", "13 / 25", "Staff work area", 74, 62, "good")
    }
  }
};

function room(name, roomNo, zone, score, status, temperature, humidity, airflow, noise, occupancy, note, x, y, level) {
  return {
    name,
    room: roomNo,
    zone,
    score,
    status,
    temperature,
    humidity,
    airflow,
    noise,
    occupancy,
    note,
    x,
    y,
    level,
    devices: [`ALVIN Sensor ${roomNo.replace(/[^0-9]/g, "") || "A"}`, "ALVIN Airflow Node", "ALVIN Occupancy Cam"]
  };
}

let currentFloor = "ground";
let selectedRoom = "library";

const root = document.documentElement;
const navItems = document.querySelectorAll(".nav-item");
const roomTags = document.querySelector(".room-tags");
const roomPanel = document.querySelector(".room-panel");
const gauge = document.querySelector(".big-gauge");
const timeSlider = document.querySelector(".time-control input");
const recList = document.querySelector("#recommendationList");
const buildingLabel = document.querySelector("#buildingLabel");
const floorLabel = document.querySelector("#floorLabel");
const mapCanvas = document.querySelector("#mapCanvas");
const mapContent = document.querySelector("#mapContent");

const mapState = {
  scale: 1,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  baseX: 0,
  baseY: 0
};

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");
  });
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-menu]");
  if (trigger) {
    event.stopPropagation();
    toggleMenu(trigger.dataset.menu);
    return;
  }

  if (!event.target.closest(".dropdown")) {
    closeMenus();
  }
});

document.querySelectorAll("[data-building]").forEach((button) => {
  button.addEventListener("click", () => {
    closeMenus();
    const label = button.textContent.trim();
    buildingLabel.textContent = label;
    const match = Object.entries(activeRooms()).find(([, item]) => item.zone === label || item.name.includes(label.replace(" Wing", "")));
    if (match) selectRoom(match[0]);
  });
});

document.querySelectorAll("[data-floor]").forEach((button) => {
  button.addEventListener("click", () => {
    closeMenus();
    currentFloor = button.dataset.floor;
    selectedRoom = Object.keys(activeRooms())[0];
    floorLabel.textContent = floorData[currentFloor].label;
    buildingLabel.textContent = "Main Building";
    updateFloorImages(currentFloor);
    renderFloor();
  });
});

function updateFloorImages(floor) {
  const dayImg = document.querySelector("#mapImgDay");
  const nightImg = document.querySelector("#mapImgNight");
  if (floor === "second") {
    dayImg.src = "assets/2ndfloor.png";
    nightImg.src = "assets/2ndfloor.png";
  } else {
    dayImg.src = "assets/map-day.png";
    nightImg.src = "assets/map-night.png";
  }
}

function toggleMenu(id) {
  const menu = document.getElementById(id);
  document.querySelectorAll(".dropdown.open").forEach((item) => {
    if (item !== menu) item.classList.remove("open");
  });
  menu?.classList.toggle("open");
}

function closeMenus() {
  document.querySelectorAll(".dropdown.open").forEach((item) => item.classList.remove("open"));
}

function activeRooms() {
  return floorData[currentFloor].rooms;
}

function renderFloor() {
  const rooms = activeRooms();
  roomTags.innerHTML = Object.entries(rooms)
    .map(([key, item], index) => `
      <button class="room-tag ${item.level} ${key === selectedRoom ? "active" : ""}" data-room="${key}" style="--x:${item.x}%;--y:${item.y}%;--d:${index * 0.07}s">
        <strong>${item.name}</strong>
        <span><i></i>${item.score}%</span>
      </button>
    `)
    .join("");

  roomTags.querySelectorAll(".room-tag").forEach((tag) => {
    tag.addEventListener("click", () => selectRoom(tag.dataset.room));
  });

  renderRecommendations();
  setPanel(selectedRoom);
}

function renderRecommendations() {
  const recommended = Object.entries(activeRooms())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3);

  recList.innerHTML = recommended
    .map(([key, item]) => `
      <button class="rec-card ${key === selectedRoom ? "selected" : ""}" data-room="${key}">
        <span>${item.name}</span>
        <small>${item.note}</small>
        <b class="mini-gauge ${item.score < 70 ? "amber" : item.score < 90 ? "lime" : ""}" style="--score:${item.score}">${item.score}%</b>
      </button>
    `)
    .join("");

  recList.querySelectorAll(".rec-card").forEach((card) => {
    card.addEventListener("click", () => selectRoom(card.dataset.room));
  });
}

function selectRoom(roomKey) {
  selectedRoom = roomKey;
  setPanel(roomKey);
  document.querySelectorAll(".room-tag").forEach((tag) => {
    tag.classList.toggle("active", tag.dataset.room === roomKey);
  });
  document.querySelectorAll(".rec-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.room === roomKey);
  });
  roomPanel.classList.remove("collapsed");
}

function setPanel(roomKey) {
  const item = activeRooms()[roomKey];
  if (!item) return;

  document.querySelector("#panelZone").textContent = item.zone;
  document.querySelector("#panelName").textContent = item.name;
  document.querySelector("#panelRoom").textContent = item.room;
  gauge.style.setProperty("--score", item.score);
  gauge.querySelector("span").innerHTML = `${item.score}<small>%</small>`;
  document.querySelector("#panelStatus").textContent = item.status;
  document.querySelector("#panelTemp").textContent = item.temperature;
  document.querySelector("#panelHumidity").textContent = item.humidity;
  document.querySelector("#panelAirflow").textContent = item.airflow;
  document.querySelector("#panelNoise").textContent = item.noise;
  document.querySelector("#panelOccupancy").textContent = item.occupancy;
  document.querySelector("#panelAmenities").textContent = amenitiesFor(item);
  document.querySelector("#deviceCount").textContent = `${item.devices.length} Active`;
  document.querySelector("#deviceList").innerHTML = item.devices.map((device) => `<li>${device}<span>Online</span></li>`).join("");
  document.querySelector("#routeSubtitle").textContent = item.name === "Storage" ? "via Service Hall" : "via Hallway A";
  document.querySelector("#routeTime").textContent = item.name === "Lounge" ? "4 min walk" : item.name === "Storage" ? "7 min walk" : "5 min walk";

  roomPanel.animate(
    [
      { transform: "translateX(12px)", opacity: 0.72 },
      { transform: "translateX(0)", opacity: 1 }
    ],
    { duration: 260, easing: "ease-out" }
  );
}

function amenitiesFor(item) {
  const base = ["covered waiting area"];
  if (item.score >= 85) base.unshift("water station");
  if (item.zone.includes("Library") || item.name.includes("Study")) base.push("quiet zone");
  if (item.name.includes("Cafeteria")) base.push("food service");
  if (item.name.includes("Lobby")) base.push("nearest exit");
  return base.join(", ");
}

timeSlider.addEventListener("input", () => updateTimeLighting(Number(timeSlider.value)));

function updateTimeLighting(hour) {
  const dayPeak = 1 - Math.min(Math.abs(hour - 13) / 8, 1);
  const night = hour < 7 || hour > 18 ? 1 : Math.max(0, Math.abs(hour - 13) / 7 - 0.25);
  const warm = hour >= 6 && hour <= 9 ? 0.22 : hour >= 16 && hour <= 18 ? 0.28 : 0.08;
  const shadowX = 18 + ((hour - 6) / 16) * 68;
  const nightOpacity = Math.max(0, Math.min(1, (hour - 17) / 4));

  root.style.setProperty("--stage-brightness", (0.62 + dayPeak * 0.32 - night * 0.16).toFixed(2));
  root.style.setProperty("--stage-saturation", (0.86 + dayPeak * 0.16).toFixed(2));
  root.style.setProperty("--shadow-alpha", (0.58 - dayPeak * 0.22 + night * 0.22).toFixed(2));
  root.style.setProperty("--warm-alpha", warm.toFixed(2));
  root.style.setProperty("--shadow-x", `${shadowX.toFixed(1)}%`);
  root.style.setProperty("--night-opacity", nightOpacity.toFixed(2));
  document.querySelector("#timeValue").textContent = formatHour(hour);
}

function formatHour(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:00 ${suffix}`;
}

document.querySelector(".close").addEventListener("click", () => {
  roomPanel.classList.add("collapsed");
});

function applyMapTransform() {
  mapContent.style.setProperty("--map-scale", mapState.scale.toFixed(2));
  mapContent.style.setProperty("--pan-x", `${mapState.x}px`);
  mapContent.style.setProperty("--pan-y", `${mapState.y}px`);
}

function zoomMap(delta) {
  mapState.scale = Math.max(1, Math.min(2.4, mapState.scale + delta));
  applyMapTransform();
}

document.querySelector("#zoomIn").addEventListener("click", () => zoomMap(0.18));
document.querySelector("#zoomOut").addEventListener("click", () => zoomMap(-0.18));
document.querySelector("#resetMap").addEventListener("click", () => {
  mapState.scale = 1;
  mapState.x = 0;
  mapState.y = 0;
  applyMapTransform();
});

mapCanvas.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, .room-panel, .legend, .time-control, .map-tools")) return;
  mapState.dragging = true;
  mapState.startX = event.clientX;
  mapState.startY = event.clientY;
  mapState.baseX = mapState.x;
  mapState.baseY = mapState.y;
  mapCanvas.classList.add("dragging");
  mapCanvas.setPointerCapture(event.pointerId);
});

mapCanvas.addEventListener("pointermove", (event) => {
  if (!mapState.dragging) return;
  mapState.x = mapState.baseX + event.clientX - mapState.startX;
  mapState.y = mapState.baseY + event.clientY - mapState.startY;
  applyMapTransform();
});

mapCanvas.addEventListener("pointerup", (event) => {
  mapState.dragging = false;
  mapCanvas.classList.remove("dragging");
  mapCanvas.releasePointerCapture(event.pointerId);
});

mapCanvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.12 : 0.12;
  const prevScale = mapState.scale;
  mapState.scale = Math.max(1, Math.min(2.4, mapState.scale + delta));
  // zoom toward cursor
  const rect = mapCanvas.getBoundingClientRect();
  const mx = event.clientX - rect.left - rect.width / 2;
  const my = event.clientY - rect.top - rect.height / 2;
  const scaleDiff = mapState.scale / prevScale;
  mapState.x = mx - scaleDiff * (mx - mapState.x);
  mapState.y = my - scaleDiff * (my - mapState.y);
  applyMapTransform();
}, { passive: false });

async function loadOpenMeteoWeather() {
  const fallback = {
    temperature_2m: 28,
    relative_humidity_2m: 78,
    rain: 0,
    wind_speed_10m: 10,
    apparent_temperature: 31,
    weather_code: 3,
    time: new Date().toISOString()
  };

  let timeout;
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=14.5995&longitude=120.9842&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,apparent_temperature,weather_code&timezone=Asia%2FSingapore";
    const controller = new AbortController();
    timeout = window.setTimeout(() => controller.abort(), 3500);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Weather unavailable");
    const data = await response.json();
    updateWeather(data.current || fallback, "Live Open-Meteo");
  } catch (error) {
    updateWeather(fallback, "Open-Meteo fallback");
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

function updateWeather(current, source) {
  document.querySelector("#weatherTemp").innerHTML = `${Math.round(current.temperature_2m)}<span>C</span>`;
  document.querySelector("#weatherCondition").textContent = weatherCodeLabel(current.weather_code, current.rain);
  document.querySelector("#weatherHumidity").textContent = `${Math.round(current.relative_humidity_2m)}%`;
  document.querySelector("#weatherRain").textContent = `${Number(current.rain || 0).toFixed(1)} mm/h`;
  document.querySelector("#weatherWind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.querySelector("#weatherHeat").textContent = `${Math.round(current.apparent_temperature)} C`;
  const updated = current.time ? new Date(current.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "now";
  document.querySelector("#weatherSource").innerHTML = `Source: ${source}<br />Updated: ${updated}`;
}

function weatherCodeLabel(code, rain) {
  if (rain > 0) return "Rain detected";
  if ([0, 1].includes(code)) return "Clear";
  if ([2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if (code >= 51 && code <= 67) return "Drizzle";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 95) return "Thunderstorm";
  return "Current weather";
}

renderFloor();
updateTimeLighting(Number(timeSlider.value));
applyMapTransform();
loadOpenMeteoWeather();
