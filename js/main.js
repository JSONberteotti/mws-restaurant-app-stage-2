let restaurants,
  neighborhoods,
  cuisines;
var map,
    markers = [];

/**
 * Initialize map upon page load. Set up IDB.
 */

window.onload = function(){
  initMap();
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false,
  });
  
/**
 * Make changes to map once it is loaded.
 */

  editMap = () => {
    const mapElement = document.getElementById('map');
    const frame = mapElement.getElementsByTagName('iframe')[0];
    frame.setAttribute('title', 'Map of Restaurants');
  };

  this.map.addListener('tilesloaded', editMap);
    
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');  
  li.setAttribute('tabindex', 0);
  
  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);
  
  const imgUrl = DBHelper.imageUrlForRestaurant(restaurant);
  
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = imgUrl + "-500-medium.jpg";
  image.setAttribute('alt', restaurant.description);
  li.append(image);
  
  const street = restaurant.address.split(/,(.+)/)

  const address = document.createElement('p');
  address.innerHTML = restaurant.neighborhood + '<br>' + street[0] + '<br>' + street[1];
  /*address.innerHTML = restaurant.address;*/
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

// Check for, and register service worker.

if (navigator.serviceWorker) {
  console.log('Registering service worker');
  navigator.serviceWorker.register('./sw.js').then(function() {
    console.log('Registration complete');
  }, function() {
    console.log('Registration failed');
  });
} else {
  console.log('Service worker not supported');
}

// Setup and upgrade DB.

const request = window.indexedDB.open("Restaurants", 1);

request.onupgradeneeded = function(){
	const db = request.result,
		store = db.createObjectStore('restStore', {keyPath: "id"});
}

let restaurantData = [];
fetch('http://localhost:1337/restaurants')
	.then(response => response.json())
	.then(response => {
		const data = response;
	data.forEach((restaurant) => {
		restaurantData.push(restaurant);
	});
}).then(() => {
	const request = window.indexedDB.open("Restaurants", 1);
	request.onsuccess = function(){
		const db = request.result,
				transaction = db.transaction('restStore', 'readwrite'),
				store = transaction.objectStore('restStore');
		restaurantData.forEach((restaurant) => {
			store.put(restaurant);
		});		
	};
	request.onerror = function(event){
		console.log(event);
	}
});