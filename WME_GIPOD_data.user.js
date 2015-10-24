// ==UserScript==
// @name        WME GIPOD data
// @namespace   http://www.tomputtemans.com/
// @description Retrieve and show all work assignments and manifestations published by municipalities.
// @include     https://www.waze.com/*/editor/*
// @include     https://www.waze.com/editor/*
// @include     https://editor-beta.waze.com/*
// @downloadURL   https://tomputtemans.com/waze-scripts/WME_GIPOD_data.user.js
// @version     0.5
// @grant       none
// ==/UserScript==

(function() {
	var selectFeature;
	var GIPOD = {
		'url': 'https://tomputtemans.com/waze-scripts/gipod-data.php',
		'projection': new OL.Projection("EPSG:4326"),
		'update': function(callback) {
			// Obtain the bounds and transform them to the projection used by GIPOD
			var bounds = Waze.map.calculateBounds().transform(Waze.map.getProjectionObject(), GIPOD.projection);
			// bounding box: left bottom coordinate | right top coordinate
			var bbox = bounds.left + "," + bounds.bottom + "|" + bounds.right + "," + bounds.top;

			// Clear out the results
			UI.ResultList.clear();
			UI.ResultList.addResult('Loading...', 'Retrieving information from GIPOD');
			$.ajax({
				url: GIPOD.url + '?bbox=' + bbox
			}).done(function(response) {
				callback(JSON.parse(response));
			});
		},
		'getItem': function() {
			var cache = [];

			return function(gipodId, callback) {
				if (cache[gipodId]) {
					callback(cache[gipodId]);
				} else {
					$.ajax({
						url: GIPOD.url + '?id=' + gipodId
					}).done(function(response) {
						var data = JSON.parse(response);
						cache[data.gipodId] = data;
						callback(data);
					});
				}
			}
		}(),
		// Transform the raw data to an object that can be used by UI.ItemDetail.fill()
		'transformData': function(data) {
			var cleanDateTime = function(datetime) {
				var cleanedUp = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.exec(datetime);
				if (cleanedUp == null) {
					return datetime;
				}
				return cleanedUp[0];
			}
			if (data.hindrance == null) {
				data.hindrance = {
					'description': 'No hindrance'
				};
			}
			if (data.contactDetails == null) {
				data.contactDetails = {
					'organisation': 'No organisation specified'
				};
			}
			return [
				{
					'name': 'Info',
					'items': [
						['Description', data.description],
						['Period', cleanDateTime(data.startDateTime) + ' to ' + cleanDateTime(data.endDateTime) + (data.type ? ' (' + data.type + ')' : '')],
						[(data.location.cities.length > 1 ? 'Cities' : 'City'), data.location.cities.join(', ')],
						['Status', data.state],
						['Latest update', cleanDateTime(data.latestUpdate)],
						['GIPOD ID', data.gipodId]
					]
				},
				{
					'name': 'Hindrance',
					'items': [
						['Important hindrance', (data.hindrance.important ? 'Yes' : 'No')],
						['Direction', data.hindrance.direction],
						['Description', data.hindrance.description],
						[(data.hindrance.locations.length > 1 ? 'Locations' : 'Location'), data.hindrance.locations.join(', ')],
						[(data.hindrance.effects.length > 1 ? 'Effects' : 'Effect'), data.hindrance.effects.join(' • ')]
					]
				},
				{
					'name': 'Contact',
					'items': [
						['URL', data.url],
						['Owner', data.owner],
						['Contractor', data.contractor],
						['Organisation', data.contactDetails.organisation],
						['E-mail', data.contactDetails.email],
						['Phone number', data.contactDetails.phoneNumber1],
					]
				}
			];
		},
		'hasArea': function(data) {
			return (data.location.geometry.type == 'Polygon' && data.location.geometry.coordinates && data.location.geometry.coordinates[0]) ||
					(data.location.geometry.type == 'MultiPolygon' && data.location.geometry.coordinates && data.location.geometry.coordinates[0] && data.location.geometry.coordinates[0][0] !== null);
		},
		'getAreaCoords': function(data) {
			var rings = [];
			if (data.location.geometry.type == 'Polygon') {
				var ring = [];
				data.location.geometry.coordinates[0].map(function(coord) {
					ring.push({x: coord[0], y: coord[1]});
				});
				rings.push(ring);
			} else if (data.location.geometry.type == 'MultiPolygon') {
				data.location.geometry.coordinates[0].map(function(coords) {
					var ring = [];
					coords.map(function(coord) {
						ring.push({x: coord[0], y: coord[1]});
					});
					rings.push(ring);
				});
			}
			return rings;
		}
	};
	var UI = {
		'ResultList': function() {
			// List to contain results encapsulated in this object
			var ul = document.createElement('ul');
			ul.className = 'result-list';

			return {
				'addResult': function(title, additionalInfo, eventHandler) {
					var li = document.createElement('li');
					li.className = (eventHandler ? 'result session-available' : 'result');
					li.innerHTML = '<p class="title">' + title + '</p><p class="additional-info">' + additionalInfo + '</p>';
					if (typeof eventHandler === 'function') {
						li.addEventListener('click', eventHandler);
					}
					ul.appendChild(li);
					return li;
				},
				'clear': function() {
					while (ul.firstChild) {
						ul.removeChild(ul.firstChild);
					}
				},
				'show': function() {
					if (ul.parentNode == null) {
						document.getElementById('sidepanel-gipod').appendChild(ul);
					}
					ul.style.display = 'block';
				},
				'hide': function() {
					ul.style.display = 'none';
				}
			};
		}(),
		'ItemDetail': function() {
			var pane = document.createElement('div');
			pane.style.display = 'none';
			var title = document.createElement('h4');
			var details = document.createElement('div');
			var backButton = document.createElement('button');
			var listeners = [];
			backButton.type = 'button';
			backButton.className = 'btn btn-default';
			backButton.innerHTML = 'Back to results';
			backButton.addEventListener('click', function() {
				this.parentNode.style.display = 'none';
				document.querySelector('#sidepanel-gipod .result-list').style.display = 'block';
				listeners.map(function(listener) {
					listener.eventFired('hidden');
				});
			});
			pane.appendChild(title);
			pane.appendChild(details);
			pane.appendChild(backButton);

			return {
				'fill': function(data) {
					while (details.firstChild) {
						details.removeChild(details.firstChild);
					}
					data.map(function(group) {
						var sectionHeader = document.createElement('legend');
						sectionHeader.appendChild(document.createTextNode(group.name));
						var sectionData = document.createElement('fieldset');
						sectionData.appendChild(sectionHeader);
						var p = document.createElement('p');
						group.items.map(function(item) {
							if (item[1] != null && item[1] !== '' && item[1] !== ' ') {
								var strong = document.createElement('strong');
								strong.appendChild(document.createTextNode(item[0] + ": "));
								p.appendChild(strong);
								if (typeof item[1] == 'string') {
									p.appendChild(document.createTextNode(item[1]));
								} else {
									p.appendChild(document.createTextNode(JSON.stringify(item[1], null, '\t')));
								}
								p.appendChild(document.createElement('br'));
							}
						});
						sectionData.appendChild(p);
						details.appendChild(sectionData);
					});
				},
				'show': function() {
					if (pane.parentNode == null) {
						document.getElementById('sidepanel-gipod').appendChild(pane);
					}
					pane.style.display = 'block';
					listeners.map(function(listener) {
						listener.eventFired('shown');
					});
				},
				'hide': function() {
					pane.style.display = 'none';
					listeners.map(function(listener) {
						listener.eventFired('hidden');
					});
				},
				'addEventListener': function(listener) {
					listeners.push(listener);
				},
			}
		}()
	}

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

		// Initialise layer and event handlers
		GIPOD.layer = new OL.Layer.Vector("GIPOD");
		Waze.map.addLayer(GIPOD.layer);
		selectFeature = new OpenLayers.Control.SelectFeature(GIPOD.layer, {onSelect: log});
		Waze.map.addControl(selectFeature);
		selectFeature.activate();

		// Create GIPOD tab
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
		searchButton.addEventListener('click', function() {
			GIPOD.update(processGIPODData);
			return false;
		}, true);
		searchButton.value = 'Search';
		gipodContent.appendChild(searchButton);

		navTabs.appendChild(gipodTab);
		tabContent.appendChild(gipodContent);
		UI.ResultList.show();
		log('Added GIPOD tab');

		UI.ItemDetail.addEventListener({
			'eventFired': function(state) {
				if (state == 'hidden') {
					GIPOD.layer.removeFeatures(GIPOD.layer.getFeaturesByAttribute('type', 'workArea'));
				}
			}
		});
	}

	function processGIPODData(data) {
		// Clear out the previous results or loading text
		UI.ResultList.clear();
		data.map(addGIPODItem);
		if (data.length == 0) {
			addResult('No results found', 'Please zoom out or pan to another area');
		}
	}

	function addGIPODItem(data) {
		var lonlat = new OL.LonLat(data.coordinate.coordinates[0], data.coordinate.coordinates[1]).transform(GIPOD.projection, Waze.map.getProjectionObject());

		// Add as a list item
		var gipodItem = UI.ResultList.addResult(
			(data.importantHindrance ? '(!) ' : '') + data.description,
			data.startDateTime + ' - ' + data.endDateTime + '<br />(' + data.owner + ')',
			function() {
				Waze.map.panTo(lonlat);
				GIPOD.getItem(this.dataset.id, showItem);
			});
		gipodItem.dataset.id = data.gipodId;

		// Add as point on the map
		var point = new OL.Geometry.Point(lonlat.lon, lonlat.lat);
		var featurePoint = new OpenLayers.Feature.Vector(point, { type: 'workPoint', description: data.description, id: data.gipodId }, { fillOpacity: 0.8, pointRadius: 10, fillColor: '#f66f1e', strokeColor: '#eeeeee' });
		GIPOD.layer.addFeatures([featurePoint]);
	}

	function showItem(data) {
		// Show in sidepanel
		UI.ItemDetail.fill(GIPOD.transformData(data));
		UI.ResultList.hide();
		UI.ItemDetail.show();

		// Add geometry on map
		if (GIPOD.hasArea(data)) {
			var vectors = [];
			GIPOD.getAreaCoords(data).map(function(ring) {
				var areaCoords = [];
				ring.map(function(coord) {
					areaCoords.push(new OL.Geometry.Point(coord.x, coord.y).transform(GIPOD.projection, Waze.map.getProjectionObject()));
				});
				var poly = new OL.Geometry.Polygon([ new OL.Geometry.LinearRing(areaCoords) ]);
				vectors.push(new OL.Feature.Vector(poly, { type: 'workArea' }, { fillOpacity: 0.6, fillColor: '#f66f1e', strokeColor: '#eeeeee'}));
			});
			GIPOD.layer.addFeatures(vectors);
		}
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