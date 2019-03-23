// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    // TODO init the app.selectedCities array here
    app.getForecast(key, label);
    // TODO push the selected city to the array and save here
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    var dataLastUpdated = new Date(data.created);
    var sunrise = data.current_observation.astronomy.sunrise; //data.channel.astronomy.sunrise;
    var sunset = data.current_observation.astronomy.sunset; //data.channel.astronomy.sunset;
    var current = data.current_observation.condition;//data.channel.item.condition;
    var humidity = data.current_observation.atmosphere.humidity;//data.channel.atmosphere.humidity;
    var wind = data.current_observation.wind;//data.channel.wind;

    var card = app.visibleCards[data.location.woeid];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.location.city;//data.label
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.location.woeid] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;

    card.querySelector('.description').textContent = current.text;
    cardLastUpdatedElem.textContent = data.current_observation.pubDate//data.created;
    card.querySelector('.current .icon').classList.add(app.getIconClass(current.code));
    card.querySelector('.current .temperature .value').textContent =
    Math.round(current.temperature);
    card.querySelector('.current .sunrise').textContent = sunrise;
    card.querySelector('.current .sunset').textContent = sunset;
    card.querySelector('.current .humidity').textContent =
      Math.round(humidity) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(wind.speed);
    card.querySelector('.current .wind .direction').textContent = wind.direction;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.forecasts[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.code));
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.high);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.low);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getForecast() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getForecast() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getForecast = function(key, label) {
    var url = 'https://weather-ydn-yql.media.yahoo.com/forecastrss?' + key;
    // TODO add cache logic here

    // Fetch the latest data.
    var header = getOAuthHeader();
    var request = new XMLHttpRequest();
    request.setRequestHeader('Authorization', header.AuthHeader);
    request.setRequestHeader('X-Yahoo-App-Id', header.AppId);
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          var results = response.query.results;
          results.key = key;
          results.label = label;
          results.created = response.query.current_observation.pubDate;
          app.updateForecastCard(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateForecastCard(initialWeatherForecast_new);
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // TODO add saveSelectedCities function here

  app.getIconClass = function(weatherCode) {
    // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
    weatherCode = parseInt(weatherCode);
    switch (weatherCode) {
      case 25: // cold
      case 32: // sunny
      case 33: // fair (night)
      case 34: // fair (day)
      case 36: // hot
      case 3200: // not available
        return 'clear-day';
      case 0: // tornado
      case 1: // tropical storm
      case 2: // hurricane
      case 6: // mixed rain and sleet
      case 8: // freezing drizzle
      case 9: // drizzle
      case 10: // freezing rain
      case 11: // showers
      case 12: // showers
      case 17: // hail
      case 35: // mixed rain and hail
      case 40: // scattered showers
        return 'rain';
      case 3: // severe thunderstorms
      case 4: // thunderstorms
      case 37: // isolated thunderstorms
      case 38: // scattered thunderstorms
      case 39: // scattered thunderstorms (not a typo)
      case 45: // thundershowers
      case 47: // isolated thundershowers
        return 'thunderstorms';
      case 5: // mixed rain and snow
      case 7: // mixed snow and sleet
      case 13: // snow flurries
      case 14: // light snow showers
      case 16: // snow
      case 18: // sleet
      case 41: // heavy snow
      case 42: // scattered snow showers
      case 43: // heavy snow
      case 46: // snow showers
        return 'snow';
      case 15: // blowing snow
      case 19: // dust
      case 20: // foggy
      case 21: // haze
      case 22: // smoky
        return 'fog';
      case 24: // windy
      case 23: // blustery
        return 'windy';
      case 26: // cloudy
      case 27: // mostly cloudy (night)
      case 28: // mostly cloudy (day)
      case 31: // clear (night)
        return 'cloudy';
      case 29: // partly cloudy (night)
      case 30: // partly cloudy (day)
      case 44: // partly cloudy
        return 'partly-cloudy-day';
    }
  };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialWeatherForecast_new = {
    "location":{
       "woeid":2502265,
       "city":"Sunnyvale",
       "region":" CA",
       "country":"United States",
       "lat":37.371609,
       "long":-122.038254,
       "timezone_id":"America/Los_Angeles"
    },
    "current_observation":{
       "wind":{
          "chill":52,
          "direction":270,
          "speed":0.62
       },
       "atmosphere":{
          "humidity":72,
          "visibility":10.0,
          "pressure":29.71,
          "rising":0
       },
       "astronomy":{
          "sunrise":"7:15 am",
          "sunset":"7:18 pm"
       },
       "condition":{
          "text":"Partly Cloudy",
          "code":29,
          "temperature":52
       },
       "pubDate":1552914000
    },
    "forecasts":[
       {
          "low":51,
          "high":74,
          "code":34
       },
       {
          "low":51,
          "high":68,
          "code":39
       },
       {
          "day":"Wed",
          "date":1553065200,
          "low":53,
          "high":59,
          "text":"Rain",
          "code":12
       },
       {
          "day":"Thu",
          "date":1553151600,
          "low":50,
          "high":61,
          "text":"Rain",
          "code":12
       },
       {
          "day":"Fri",
          "date":1553238000,
          "low":46,
          "high":62,
          "text":"Rain",
          "code":12
       },
       {
          "day":"Sat",
          "date":1553324400,
          "low":48,
          "high":62,
          "text":"Rain",
          "code":12
       },
       {
          "day":"Sun",
          "date":1553410800,
          "low":48,
          "high":66,
          "text":"Partly Cloudy",
          "code":30
       },
       {
          "day":"Mon",
          "date":1553497200,
          "low":47,
          "high":65,
          "text":"Mostly Cloudy",
          "code":28
       },
       {
          "day":"Tue",
          "date":1553583600,
          "low":47,
          "high":62,
          "text":"Rain",
          "code":12
       },
       {
          "day":"Wed",
          "date":1553670000,
          "low":49,
          "high":61,
          "text":"Scattered Showers",
          "code":39
       }
    ]
 };
  // TODO uncomment line below to test app with fake data
  // app.updateForecastCard(initialWeatherForecast_new);

  // TODO add startup code here

  // TODO add service worker code here
})();
