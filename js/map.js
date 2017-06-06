var map = (function() {

	// Private Variables
	var infoWindow_old = null;
	var infoWindow = document.getElementById('info_window');	
	var map = null;
	var geojson = null;
	var lastFeature = null;

	function initMap() {
		// Create the Map
		infoWindow_old = new google.maps.InfoWindow({})

		map = L.map('map', {
			center: [39.7488835, -105.2167468],
			zoom: 15,
		});
		L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
	    	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
	    	maxZoom: 22,
    		id: 'mapbox.streets',
		    accessToken: 'pk.eyJ1IjoidHdhbGtlcjE0NjQiLCJhIjoiY2ozZzN0bHA2MDF4ZDJxb2lpdTc0OXBodSJ9.cRI1-1g_vdffzX2jG3aY8A'
		}).addTo(map);

		// set up geoJSON
		geojson = L.geoJson([], {
			style: 	{	"color": "#ff7800",
   						"weight": 5,
						"opacity": 0.65
					},
			onEachFeature: function popupWindow(feature, layer) {
				layer.on('click', function (e) {
					lastFeature = feature;
					infoWindow.style.display = "";
					console.log(feature.properties);
					var form = document.getElementById('iw_form_parent');
					form.innerHTML = "<div class='form-group'><div class='col-md-4 col-sm-12'><span for='osm_id' class='label label-primary'>OSM ID</span></div><div class='col-md-8 col-sm-12'><input type='text' name='osm_id' id='osm_id' class='form-control' value="
						+ feature.id + " disabled></div>";


					for (var key in feature.properties) {
						if (feature.properties.hasOwnProperty(key)) {
							form.innerHTML+="<div class='form-group'><div class='col-md-4 col-sm-12'><span for='" + key +"' class='label label-info'>" + key 
								+ "</span></div><div class='col-md-8 col-sm-12'><input type='text' class='form-control' name='" + key + "' id='" + key + "' value='" + feature.properties[key] + "'></div>";
						}
					}
				});
			}
		});
		geojson.addTo(map);
	}

	function submitPointQuery() {
		// queries a single s2cell
		var date = document.getElementById('calendar').value;
		timestamp = new Date(date);
		timestamp.setHours(document.getElementById('ts_hours').value);
		timestamp.setMinutes(document.getElementById('ts_minutes').value);
		timestamp.setSeconds(document.getElementById('ts_seconds').value);
		console.log(timestamp.getTime());

		var center = map.getCenter();
		var lat = center.lat;
		var lng = center.lng;

		var transport = new Thrift.TXHRTransport("http://localhost:8000/service");
		var protocol = new Thrift.TJSONProtocol(transport);
		var client = new GeolocationServiceClient(protocol);
		var result = client.getCell(lat, lng, Date.now() /*timestamp.getTime()*/);

		// Clear the Map
		geojson.clearLayers();
		
		// Add new GeoJSON's to Map
		for (var i = 0; i < result.length; i++) {
			json = JSON.parse(result[i].json);

			// GeoJSON Formatting Hack
			for (var j = 0; j < json.geometry.coordinates.length; j++) {
				if (json.geometry.type === 'LineString' && json.geometry.coordinates[j].length > 2)
					json.geometry.coordinates[j] = json.geometry.coordinates[j].slice(0, 2);
				for (var k = 0; k < json.geometry.coordinates[j].length; k++)
					if (json.geometry.type === 'Polygon' && json.geometry.coordinates[j][k].length > 2)
						json.geometry.coordinates[j][k] = json.geometry.coordinates[j][k].slice(0, 2);
			}

			console.log(JSON.stringify(json));
			geojson.addData(json);
		}
	}

	function submitRegionQuery() {
		// queries entire screen
		
		// checks for historical query
		if (document.getElementById('hqToggle').children[0].checked) {
			var date = document.getElementById('calendar').value;
			timestamp = new Date(date);
			timestamp.setHours(document.getElementById('ts_hours').value);
			timestamp.setMinutes(document.getElementById('ts_minutes').value);
			timestamp.setSeconds(document.getElementById('ts_seconds').value);
			time = timestamp.getTime();
		} else { time = Date.now(); }
		console.log(time);

		var bounds = map.getBounds();
		var east = bounds.getEast();
		var west = bounds.getWest();
		var north = bounds.getNorth();
		var south = bounds.getSouth();

		var transport = new Thrift.TXHRTransport("http://localhost:8000/service");
		var protocol = new Thrift.TJSONProtocol(transport);
		var client = new GeolocationServiceClient(protocol);
		var result = client.getFeatures(west, east, south, north, time);

		// Clear the Map
		geojson.clearLayers();

		// Add new GeoJSON's to Map
		for (var i = 0; i < result.length; i++) {
			json = JSON.parse(result[i].json);

			// GeoJSON Formatting Hack
			for (var j = 0; j < json.geometry.coordinates.length; j++) {
				if (json.geometry.type === 'LineString' && json.geometry.coordinates[j].length > 2)
					json.geometry.coordinates[j] = json.geometry.coordinates[j].slice(0, 2);
				for (var k = 0; k < json.geometry.coordinates[j].length; k++)
					if (json.geometry.type === 'Polygon' && json.geometry.coordinates[j][k].length > 2)
						json.geometry.coordinates[j][k] = json.geometry.coordinates[j][k].slice(0, 2);
			}
			json.id = json.id + "_" + Math.random().toString(36).substring(7);	
			geojson.addData(json);
		}
	}

	function addFeature() {
		// adds new feature from pure JSON
		// (TODO: MAKE USER FRIENDLY)
		var featureJSON = prompt("Insert the GeoJSON information below:", "Insert GeoJSON Here");
			try {
				var json = JSON.parse(featureJSON);
				L.geoJSON(json, {
					style: 	{	"color": "#ff7800",
   								"weight": 5,
								"opacity": 0.65
			   				}
				}).bindPopup(function (layer) {
				    return layer.feature.properties.description;
				}).addTo(map);
			} catch(e) {
				window.alert("Invalid GeoJSON");
			}
			console.log(featureJSON);
	}
	
	function deleteFeature() {

	}

	function editFeature() {
		// read all boxes in to new geoJSON
		var form = document.getElementById('iw_form_parent');
		var newFeatureProperties = {};
		for (var i = 0; i < form.elements.length; i++) {
			newFeatureProperties[form.elements[i].id] = form.elements[i].value;
		}

		// compare new geoJSON to lastFeature
		if (newFeatureProperties == lastFeature.properties) {
			console.log("good");
			// check if valid geoJSON
				// delete old
				// add edited
		}
	}

	// Module Exports
	return {
		initMap: initMap,
		submitRegionQuery: submitRegionQuery,
		submitPointQuery: submitPointQuery,
		addFeature: addFeature,
		deleteFeature: deleteFeature,
		editFeature: editFeature
	};
})();
