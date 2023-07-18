"use strict";

// Mapty App: OOP, Geolocation, External libraries etc.

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-12); // ids are usually created by 3rd party libraries, NEVER DO BY OURSELVES
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDEscription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
    'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  // CONSTRUCTOR: needs to take in same data as parent class + additional properties
  type = "running"; // same as this.type = 'running'
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration); // SUPER: common data like in the parent
    this.cadence = cadence;
    this.calcPace();
    this._setDEscription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  // CONSTRUCTOR: needs to take in same data as parent class + additional properties
  type = "cycling"; // same as this.type = 'cycling
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration); // SUPER: common data like in the parent
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDEscription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }

  //   fakeFunction() { // everything that we have after the constructor function
  //   return null; // goes in the prototype of the class, even this fakeFunction()
  // }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

///////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  // Private instance properties
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user position
    this._getPosition();
    // form.addEventListener("submit", this._newWorkout); // inside this method, this key is pointing to form
    // and not to the App object
    // we need bind to manually set the this keyword

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this)); // this points to the current object (App)
    inputType.addEventListener("change", this._toggleElevetionField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }
  _getPosition() {
    // Geolocation
    if (navigator.geolocation) {
      // navigator.geolocation.getCurrentPosition(this._loadMap, function () { // here the this is undefined
      // because it sits on a regular function call, since the function getCurrentPosition is the one calling it
      // getCurrentPosition calls this._loadMap AFTER it gets the current position of the user
      // this._loadMap is a callback function
      // therefore, we must manually set the this keyword with bind
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // (this) points to the current object (App)
        function () {
          console.log(`Could not get your position`);
        }
      );
    }
  }

  _loadMap(position) {
    // we call this function with a position parameter
    const { latitude } = position.coords; // take coordinates out of object
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // Display map using Leaflet
    // console.log(this); // the App object
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel); // the 'map' comes from the html div with the same id name
    // console.log(map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      // tileLayer selects the tile layer
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map); // we add tilelayer to the map with addTo

    // Handling clicks on map
    // this.#map.on("click", this._showForm); // incorrectly set this keyword
    // the this keyword in this function is set to the object the event handler is attached
    // in this case it is the map itself
    this.#map.on("click", this._showForm.bind(this));

    // on() method comes from leaflet library, NOT JS
    // we get access in the function to an event created by leaflet called mapEvent);

    this.#workouts.forEach((work) => {
      // for each workout we loop the array
      // we show each workout (be it cycling or running) on the map
      this._renderWorkoutMarker(work); // now we can show the markers on the map
    });
  }
  _showForm(mapE) {
    // we define mapEvent outside of the function because we need it later
    // so we do this:
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevetionField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  _newWorkout(e) {
    // Helper function to check inputs
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();
    // console.log(this);

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // here we use the mapEvent variable that we globally defined
    // it is used to get the latitude and longitude in this function
    // or as we defined them, coords
    // Check if data is valid

    // If workout running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert(`Inputs have to be positive numbers`);
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling , create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert(`Inputs have to be positive numbers`);
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render new workout on map as a marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // Display marker
    L.marker(workout.coords) // .marker creates the marker
      .addTo(this.#map) // .addTo adds marker to the map
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      ) // create a pop up and binds it to the marker
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      ) // Sets the content of the popup bound to this layer
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
         <span class="workout__icon">${
           workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
         }</span>
         <span class="workout__value">${workout.distance}</span>
         <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
         </div>`;
    if (workout.type === "running") {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }
    if (workout.type === "cycling") {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🚵‍♂️</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
    }
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    // console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    // console.log(workout);
    this.#map.setView(workout.coords, this.mapZoomLevel, {
      // method comes from lifleat
      // uses coordinates and zoom as arguments + optional arguments for animation
      animate: true,
      pan: { duration: 1 },
    });
    // using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    // JSON.stringify() - convert object to string
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts")); // parses a JSON string
    // constructing the JavaScript value or object described by the string
    // console.log(data);

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // OBJECTS COMING FROM THE LOCAL STORAGE WILL NOT INHERIT ALL THE METHODS THAT THEY DID BEFORE
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    if (!data) return;

    this.#workouts = data; // restore our workouts array using the data from localStorage
    this.#workouts.forEach((work) => {
      // for each workout we loop the array
      // we show each workout (be it cycling or running) inside the form BUT not on the map
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work); - this does NOT work
      // first the user position (geolocation) needs to be established
      // only after that the map is loaded
      // because the map is not created when the app is first loaded
      // we therefore get undefined
      // instead of rendering the markers at the beginning, we should do it once the map is loaded
      // the logic for this is in the _loadMap
    });
  }

  reset() {
    // remove the workouts item from localStorage
    localStorage.removeItem("workouts"); // remove items based on key (in this case, workouts key)
    location.reload(); // reload the page to look empty
    // location is an object that contains plenty of methods & properties in the browser

    // to use this method, go into browser console
    // type app.reset() in console
  }
}

const app = new App(); // no parameters in the constructor = does not need any arguments
