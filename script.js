"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, duration, distance) {
    this.coords = coords; // [lat,lng]
    this.duration = duration; // in km
    this.distance = distance; // in min
  }
  _set_description() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}.`;
  }
  click(){
    this.clicks++;
  }
}
class Running extends Workout {
  type = "running";
  constructor(coords, duration, distance, cadence) {
    super(coords, duration, distance);
    this.cadence = cadence;
    this.cal_pace();
    this._set_description();
  }
  cal_pace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.speed;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, duration, distance, elevgain) {
    super(coords, duration, distance);
    this.elevgain = elevgain;
    this.cal_elegain();
    this._set_description();
  }
  cal_elegain() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////
//Application Architecture
class App {
  #map;
  #map_zoom = 13
  #map_event;
  #workout = [];

  constructor() {
    
    //Get User position
    this._get_position();

    // Get local Storage
    this._get_Local_storage();

    // Attact event handlers
    form.addEventListener("submit", this._new_Workout.bind(this));
    inputType.addEventListener("change", this._toggle_elevation_field);
    containerWorkouts.addEventListener('click',this._move_to_popup.bind(this))
  }

  _get_position() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(  
        this._load_map.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
    }
  }

  _load_map(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#map_zoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._show_form.bind(this));
    this.#workout.forEach(work =>{
      this._render_workout_marker(work)
      
    })
  }

  _show_form(map_e) {
    // Handling clicks on map

    this.#map_event = map_e;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _toggle_elevation_field() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  _new_Workout(e) {
    e.preventDefault();

    // Get the data
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDistance.value;
    const coords = Object.values(this.#map_event.latlng);
    let workout;

    // Check if data is valid:
    function check_data(temp) {
      if (
        // !Number.isFinite(distance)||
        // !Number.isFinite(duration)||
        // !Number.isFinite(temp)
        // above in better way
        ![distance, duration, temp].every((inp) => Number.isFinite(inp)) ||
        ![distance, duration, temp].every((inp) => inp > 0)
      )
        return alert("Input have to be positive number");
    }
    // If workout is runing create runinng object
    if (type === "running") {
      const cadence = +inputCadence.value;
      check_data(cadence);
      workout = new Running(coords, duration, distance, cadence);
    }

    // If workout cycling, create cycling object
    else {
      const elevgain = +inputElevation.value;
      check_data(elevgain < 0 ? elevgain * -1 : elevgain);
      workout = new Cycling(coords, duration, distance, elevgain);
    }

    // Add new object to workout array
    this.#workout.push(workout);

    // Render Workout on map as marker
    this._render_workout_marker(workout);

    // Render workout on list
    this._render_workout_onlist(workout);

    // Hide form + clear input fields
    this._hide_form();

    // Set local storage to all workouts
    this._set_local_storage();
  }

  _render_workout_marker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}` )
      .openPopup(); 
  }
  _render_workout_onlist(workout) {
  
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
      <span class="workout__value"> ${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;
    if (workout.type === "running") {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)} </span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span> 
      </div>
    </li>`;
    }
    else{
      html += `<div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevgain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`
    }
    form.insertAdjacentHTML('afterend',html);  
  }
  _hide_form(){

    form.computedStyleMap.display = 'none';
    form.classList.add("hidden"); 
    setTimeout(( )=>(form.computedStyleMap.display='grid'),1000);
    
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
  };
  _move_to_popup(e){
    const workout_ele = e.target.closest('.workout')
    if(!workout_ele)return;

    const workout = this.#workout.find(
      work => workout_ele.dataset.id === work.id
      );
    const coords = Object.values(workout.coords)
    this.#map.setView(coords,this.#map_zoom,{
      animate :true,
      pan:{
        duration:1
      }
    });

    // using the publick interface
    workout.click(); 
  }

  _set_local_storage(){
    localStorage.setItem('workout',JSON.stringify(this.#workout));
  }

  _get_Local_storage(){
    const data =JSON.parse( localStorage.getItem('workout'));
    if(!data) return;
    this.#workout = data
    this.#workout.forEach(work =>{
      this._render_workout_onlist(work)

    })
  }
  reset(){
    localStorage.removeItem('workout')
    location.reload();
  }
}

const app = new App();
