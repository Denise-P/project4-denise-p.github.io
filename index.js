async function initMap() {
  await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  const mapElement = document.querySelector("gmp-map");
  const map = mapElement.innerMap; // <- get the real google.maps.Map :contentReference[oaicite:1]{index=1}

  map.addListener("click", (e) => {
    new AdvancedMarkerElement({
      position: e.latLng,
      map,
    });
    map.panTo(e.latLng);
  });
}

initMap();

var centerLatLng = map.getCenter();

console.log("Center Latitude: " + centerLatLng.lat());
