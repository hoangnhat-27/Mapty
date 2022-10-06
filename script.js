'use strict';


function iconColor(color) {
    let icon = new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [20, 31],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    return icon;
}

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }
    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type;
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration)
        this.cadence = cadence;
        this.type = 'running';
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}
class Cycling extends Workout {
    type;
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration)
        this.elevationGain = elevationGain;
        this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.pace;
    }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnClear = document.querySelector('.clear__btn');
class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 14;
    #workouts = [];
    constructor() {
        //Get user's position
        this._getPosition();
        //Get data from local storage
        this._getLocalStorage();
        //Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        const thisK = this;
        containerWorkouts.addEventListener('click', function (e) {
            if (e.target.className.includes('workout__close')) {
            } else {
                thisK._moveToPopup(e);
            }
        });
    }
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get current position');
            });
        }
    }
    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        const map = this.#map;
        const thisK = this;
        L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }).addTo(this.#map);

        L.marker(coords, { icon: iconColor('red') })
            .addTo(this.#map)
            .bindPopup(L.popup({ maxWidth: 250, minWidth: 100, autoClose: false, closeOnClick: false, className: `running - popup` })).setPopupContent('You are here !').openPopup().on('click', () => map.setView(coords));
        this.#map.on('click', this._showForm.bind(this));
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });

        //Attach close btn
        document.querySelectorAll('.workout__close').forEach(btn => btn.addEventListener('click', function (e) {
            thisK._deleteWorkout(e);
            thisK._setLocalStorage();
        }));

        //Hide form when click outside form
        containerWorkouts.addEventListener('click', function (e) {
            if (form.classList.contains('hidden')) {
            } else {
                if (e.target.className.includes('form')) {
                } else {
                    thisK._hideForm();
                }
            }
        });
    }
    _showForm(mapE) {
        //Handling clicks on map
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _hideForm() {
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }
    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }
    _newWorkout(e) {
        const validInput = (...inputs) => inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every(input => input > 0);
        e.preventDefault();

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        const thisK = this;
        let workout;

        //If acctivity running, create running object
        if (type === 'running') {
            const cadence = + inputCadence.value;
            //Check if data is valid
            if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert('Input have to be positive number');
            workout = new Running([lat, lng], distance, duration, cadence);
            this.#workouts.push(workout);
        }
        //If activity cycling, create cycling object
        if (type === 'cycling') {
            const elevation = + inputElevation.value;
            if (!validInput(distance, duration, elevation) || !allPositive(distance, duration)) return alert('Input have to be positive number');

            workout = new Cycling([lat, lng], distance, duration, elevation);
            this.#workouts.push(workout);
        }
        //Render workout on map as a marker
        this._renderWorkoutMarker(workout);
        //Render workout on list
        this._renderWorkout(workout);
        //Hide form + clear input fields
        this._hideForm();
        //Attach delete event
        document.querySelector('.workout__close').addEventListener('click', function (e) {
            thisK._deleteWorkout(e);
            thisK._setLocalStorage();
        });
        //Set local storage to all workouts
        this._setLocalStorage();
    }
    _renderWorkoutMarker(workout) {
        const map = this.#map;
        L.marker(workout.coords, { icon: iconColor('blue') })
            .addTo(this.#map)
            .bindPopup(L.popup({ maxWidth: 250, minWidth: 100, autoClose: false, closeOnClick: false, className: `${workout.type}-popup` })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`)
            .openPopup().on('click', function () {
                const selectedElID = workout.id;
                const workoutListEl = document.querySelector(`[data-id="${selectedElID}"]`);
                workoutListEl.style.backgroundColor = '#2F5D62';
                setTimeout(() => workoutListEl.style.backgroundColor = '#42484d', 1200);
                map.setView(workout.coords);
            });
    }
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <span class="workout__close">&times;</span>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `
        if (workout.type === 'running') {
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
        </li>`
        }
        if (workout.type === 'cycling') {
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`
        }
        form.insertAdjacentHTML('afterend', html);
        if (document.querySelectorAll('.workout').length >= 2) {
            btnClear.style.display = 'block';
            btnClear.addEventListener('click', this._deleteAllWorkouts.bind(this));
        };
    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            }
        });
    }
    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach(workout => {
            workout =
                workout.type === 'running'
                    ? Object.setPrototypeOf(workout, Running.prototype)
                    : Object.setPrototypeOf(workout, Cycling.prototype);
            this._renderWorkout(workout);
        });
    }
    _deleteWorkout(e) {
        if (window.confirm('Are you sure you want to delete this workout?')) {
            const workoutEl = e.target.closest('.workout');
            if (!workoutEl) return;
            const data = JSON.parse(localStorage.getItem('workouts'));
            if (!data) return;
            this.#workouts = data;
            for (let i = 0; i < this.#workouts.length; i++) {
                if (this.#workouts[i].id === workoutEl.dataset.id) {
                    //remove workout
                    this.#workouts.splice(i, 1);
                    document.querySelector(`[data-id="${workoutEl.dataset.id}"]`).remove();
                }
            }
            localStorage.setItem('workouts', JSON.stringify(this.#workouts));
        }
    }
    _deleteAllWorkouts() {
        if (window.confirm('Are you sure you want to delete all workout?')) {
            this.#workouts = [];
            localStorage.setItem('workouts', JSON.stringify(this.#workouts));
            btnClear.style.display = 'none';
            document.querySelectorAll('.workout').forEach(work => work.remove());
        }
    }
}
const app = new App();



