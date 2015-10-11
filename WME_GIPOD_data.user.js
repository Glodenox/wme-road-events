// ==UserScript==
// @name        WME GIPOD data
// @namespace   http://www.tomputtemans.com/
// @description Retrieve and show all work assignments and manifestations published by municipalities.
// @include     https://www.waze.com/*/editor/*
// @include     https://www.waze.com/editor/*
// @include     https://editor-beta.waze.com/*
// @downloadURL   https://tomputtemans.com/waze-scripts/WME_GIPOD_data.user.js
// @version     0.3
// @grant       none
// ==/UserScript==

(function() {
	var gipodResults = document.createElement('ul');
	var gipodUrl = 'https://tomputtemans.com/waze-scripts/gipod-data.php';
	var gipodProjection, gipodMarkers, gipodIcon;

	function gipodInit() {
		var userInfo, navTabs, tabContent, gipodTab, gipodContent, searchButton;

		// Check initialisation
		if (typeof Waze == 'undefined') {
			setTimeout(gipodInit, 660);
			log('Waze object unavailable, map still loading');
			return;
		}
		userInfo = document.getElementById('user-info');
		if (userInfo == null) {
			setTimeout(gipodInit, 660);
			log('User info unavailable, map still loading');
			return;
		}
		navTabs = userInfo.querySelector('.nav-tabs');
		if (navTabs == null) {
			setTimeout(gipodInit, 660);
			log('Nav tabs unavailable, map still loading');
			return;
		}
		log('GIPOD initated');
		gipodProjection = new OL.Projection("EPSG:4326");

		gipodVectors = new OL.Layer.Vector("GIPOD");
		Waze.map.addLayer(gipodVectors);

		tabContent = userInfo.querySelector('.tab-content');
		gipodTab = document.createElement('li');
		gipodContent = document.createElement('div');
		searchButton = document.createElement('button');

		gipodTab.innerHTML = '<a href="#sidepanel-gipod" data-toggle="tab">GIPOD</a>';
		gipodContent.id = 'sidepanel-gipod';
		gipodContent.className = 'tab-pane';
		searchButton.type = 'button';
		searchButton.className = 'btn btn-default';
		searchButton.innerHTML = 'Search current location';
		searchButton.addEventListener('click', requestGIPODData, true);
		searchButton.value = 'Search';
		gipodContent.appendChild(searchButton);

		gipodResults.setAttribute('hidden', '');
		gipodResults.className = 'result-list';
		gipodContent.appendChild(gipodResults);
		navTabs.appendChild(gipodTab);
		tabContent.appendChild(gipodContent);
		log('Added GIPOD tab');
	}

	function requestGIPODData() {
		// Obtain the bounds and transform them to the projection used by GIPOD
		var bounds = Waze.map.calculateBounds().transform(Waze.map.getProjectionObject(), gipodProjection);
		// bounding box: left bottom coordinate | right top coordinate
		var bbox = bounds.left + "," + bounds.bottom + "|" + bounds.right + "," + bounds.top;
		var loading = document.createElement('li');

		// Clear out the results
		while(gipodResults.firstChild) {
			gipodResults.removeChild(gipodResults.firstChild);
		}
		loading.className = 'result';
		loading.innerHTML = '<p class="title">Loading...</p><p class="additional-info">Retrieving information from GIPOD</p>';
		gipodResults.appendChild(loading);
		$.ajax({
			url: gipodUrl + '?bbox=' + bbox
		}).done(processGIPODData);
		// TODO: deal with negative response or network failures
		return false;
	}

	function processGIPODData(response) {
		var data = JSON.parse(response);
		// TODO: properly deal with empty responses (no data found)
		// Clear out the results (normally just the loading element)
		while (gipodResults.firstChild) {
			gipodResults.removeChild(gipodResults.firstChild);
		}
		data.map(addGIPODItem);
		gipodResults.removeAttribute('hidden');
	}

	function addGIPODItem(data) {
		var lonlat = new OL.LonLat(data.coordinate.coordinates[0], data.coordinate.coordinates[1]).transform(gipodProjection, Waze.map.getProjectionObject());

		// Add as a list item
		var gipodItem = document.createElement('li');
		gipodItem.className = 'result session-available';
		gipodItem.dataset.id = data.gipodId;
		gipodItem.innerHTML = '<p class="title">' + data.description + '</p><p class="additional-info">' + data.startDateTime + ' - ' + data.endDateTime + ' (' + data.owner + ')</p>';
		gipodItem.addEventListener('click', function() {
			Waze.map.setCenter(lonlat);
		});
		gipodItem.addEventListener('click', showItemDetail);
		gipodResults.appendChild(gipodItem);

		// Add as a polygon
		var point = new OL.Geometry.Point(lonlat.lon, lonlat.lat);
		var featurePoint = new OpenLayers.Feature.Vector(point, { description: 'test' }, { pointRadius: 10, fillColor: '#dd0000', strokeColor: '#ff0000' });
		gipodVectors.addFeatures([featurePoint]);
	}

	function showItemDetail() {
		$.ajax({
			url: gipodUrl + '?id=' + this.dataset.id
		}).done(processGIPODDetail);
	}

	function processGIPODDetail(response) {
		var data = JSON.parse(response);
		alert(response);
		console.log(data);
	}

	// TODO: further implement this without using the console
	function showError(error) {
		log(error);
	}

	function log(message) {
		if (typeof message === 'string') {
			console.log('GIPOD: ' + message);
		} else {
			console.log('GIPOD', message);
		}
	}

	// attempt to bootstrap after about a second
	log('GIPOD bootstrap set');
	setTimeout(gipodInit, 1010);
})();