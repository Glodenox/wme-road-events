// ==UserScript==
// @name        WME GIPOD data
// @namespace   http://www.tomputtemans.com/
// @description Retrieve and show all work assignments and manifestations published by municipalities.
// @include     https://www.waze.com/*/editor/*
// @include     https://www.waze.com/editor/*
// @include     https://editor-beta.waze.com/*
// @version     0.7
// @grant       none
// ==/UserScript==

(function() {
	var UI = {
		ResultList: function() {
			// List to contain results encapsulated in this object
			var ul = document.createElement('ul');
			ul.className = 'result-list';
			ul.style.paddingLeft = '10px';

			return {
				addResult: function(title, additionalInfo, eventHandler, barColor) {
					ul.style.listStyleType = 'numeric';
					ul.style.marginTop = '5px';
					var li = document.createElement('li');
					li.className = (eventHandler ? 'result session-available' : 'result');
					li.style.fontWeight = 'bold';
					li.style.paddingLeft = '0';
					var head = document.createElement('p');
					head.className = 'title';
					if (barColor) {
						head.style.paddingLeft = '5px';
						head.style.borderLeft = '3px solid ' + barColor;
					}
					head.appendChild(document.createTextNode(title));
					li.appendChild(head);
					var subhead = document.createElement('p');
					subhead.className = 'additional-info';
					subhead.style.fontWeight = 'normal';
					if (barColor) {
						subhead.style.paddingLeft = '8px';
					}
					subhead.appendChild(document.createTextNode(additionalInfo));
					li.appendChild(subhead);
					if (typeof eventHandler === 'function') {
						li.addEventListener('click', eventHandler);
					}
					ul.appendChild(li);
					return li;
				},
				clear: function() {
					while (ul.firstChild) {
						ul.removeChild(ul.firstChild);
					}
				},
				setStatus: function(status) {
					this.clear();
					if (status === 'noResult') {
						this.addResult('No results found', 'Please zoom out or pan to another area')
					} else if (status === 'loading') {
						this.addResult('Loading...', 'Retrieving information from GIPOD');
					} else {
						log('Invalid status received: ' + status);
					}
					ul.style.listStyleType = 'none';
				},
				show: function() {
					if (ul.parentNode === null) {
						document.getElementById('sidepanel-gipod').appendChild(ul);
					}
					ul.style.display = 'block';
				},
				hide: function() {
					ul.style.display = 'none';
				}
			};
		}(),
		ItemDetail: function() {
			var pane = document.createElement('div');
			pane.style.display = 'none';
			pane.style.marginTop = '8px';
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
					listener('hidden');
				});
			});
			pane.appendChild(title);
			pane.appendChild(details);
			pane.appendChild(backButton);

			return {
				fill: function(data) {
					var formatDataField = function(field) {
						if (typeof field == 'string') {
							if (/^https?:\/\//.test(field)) { // Website
								var a = document.createElement('a');
								a.target = '_blank';
								a.href = encodeURI(field);
								a.appendChild(document.createTextNode(field));
								return a;
							} else if (/^[^ ]+@[^ ]+\.[a-zA-Z0-9]+$/.test(field)) { // E-mail
								var a = document.createElement('a');
								a.target = '_blank';
								a.href = encodeURI('mailto:' + field);
								a.appendChild(document.createTextNode(field));
								return a;
							} else {
								return document.createTextNode(field);
							}
						} else {
							return document.createTextNode(JSON.stringify(field, null, '\t'));
						}
					};

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
							if (item[1] !== null && typeof item[1] !== 'undefined' && item[1] !== '' && item[1] !== ' ') {
								var strong = document.createElement('strong');
								strong.appendChild(document.createTextNode(item[0] + ": "));
								p.appendChild(strong);
								p.appendChild(formatDataField(item[1]));
								p.appendChild(document.createElement('br'));
							}
						});
						sectionData.appendChild(p);
						details.appendChild(sectionData);
					});
				},
				show: function() {
					if (pane.parentNode === null) {
						document.getElementById('sidepanel-gipod').appendChild(pane);
					}
					pane.style.display = 'block';
				},
				hide: function() {
					if (pane.style.display == 'block') {
						listeners.map(function(listener) {
							listener('hidden');
						});
					}
					pane.style.display = 'none';
				},
				addEventListener: function(listener) {
					listeners.push(listener);
				},
			};
		}()
	};
	var GIPOD = {
		url: 'https://tomputtemans.com/waze-scripts/gipod-data.php',
		projection: new OL.Projection("EPSG:4326"),
		parseDatetime: function(datetime, longFormat) {
			// Input: 2014-12-22T00:00:00 - Output: 2014-12-22 00:00
			return datetime.replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})(\.\d+)?/, (longFormat ? "$1 $2$3$4" : "$1 $2"));
		},
		update: function(callback) {
			// Obtain the bounds and transform them to the projection used by GIPOD
			var bounds = Waze.map.calculateBounds().transform(Waze.map.getProjectionObject(), GIPOD.projection);
			// bounding box: left bottom coordinate | right top coordinate
			var bbox = bounds.left + "," + bounds.bottom + "|" + bounds.right + "," + bounds.top;

			UI.ResultList.setStatus('loading');
			$.ajax({
				url: GIPOD.url + '?bbox=' + bbox
			}).done(function(response) {
				callback(JSON.parse(response));
			});
		},
		getItem: function() {
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
			};
		}(),
		// Transform the raw data to an object that can be used by UI.ItemDetail.fill()
		transformData: function(data) {
			if (data.hindrance === null) {
				data.hindrance = {
					description: 'No hindrance',
					locations: [],
					effects: []
				};
			}
			if (data.contactDetails === null) {
				data.contactDetails = {
					organisation: 'No organisation specified'
				};
			}
			return [
				{
					name: 'Info',
					items: [
						['Description', data.description],
						['Period', this.parseDatetime(data.startDateTime) + ' - ' + this.parseDatetime(data.endDateTime) + (data.type ? ' (' + data.type + ')' : '')],
						[(data.location.cities.length > 1 ? 'Cities' : 'City'), data.location.cities.join(', ')],
						['Status', data.state],
						['Latest update', this.parseDatetime(data.latestUpdate, true)],
						['GIPOD ID', data.gipodId]
					]
				},
				{
					name: 'Hindrance',
					items: [
						['Important hindrance', (data.hindrance.important ? 'Yes' : 'No')],
						['Direction', data.hindrance.direction],
						['Description', data.hindrance.description],
						[(data.hindrance.locations.length > 1 ? 'Locations' : 'Location'), data.hindrance.locations.join(', ')],
						[(data.hindrance.effects.length > 1 ? 'Effects' : 'Effect'), data.hindrance.effects.join(' • ')]
					]
				},
				{
					name: 'Contact',
					items: [
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
		hasArea: function(data) {
			return (data.location.geometry.type == 'Polygon' && data.location.geometry.coordinates && data.location.geometry.coordinates[0]) ||
					(data.location.geometry.type == 'MultiPolygon' && data.location.geometry.coordinates && data.location.geometry.coordinates[0] && data.location.geometry.coordinates[0][0]);
		},
		getAreaCoords: function(data) {
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

	function gipodInit() {
		var userInfo, navTabs, tabContent, gipodTab, gipodContent, searchButton;

		// Check initialisation
		if (typeof Waze == 'undefined') {
			setTimeout(gipodInit, 660);
			log('Waze object unavailable, map still loading');
			return;
		}
		userInfo = document.getElementById('user-info');
		if (userInfo === null) {
			setTimeout(gipodInit, 660);
			log('User info unavailable, map still loading');
			return;
		}
		navTabs = userInfo.querySelector('.nav-tabs');
		if (navTabs === null) {
			setTimeout(gipodInit, 660);
			log('Nav tabs unavailable, map still loading');
			return;
		}
		log('GIPOD initated');

		// Initialise layer and event handlers
		GIPOD.layer = new OL.Layer.Vector("GIPOD", {
			styleMap: new OL.StyleMap({
				'default': new OL.Style(OL.Util.applyDefaults({
					pointRadius: 10,
					strokeColor: '#eee',
					fontColor: '#fff',
					fontWeight: 'bold'
				}, OL.Feature.Vector.style["default"])),
				'select': new OL.Style(OL.Util.applyDefaults({
					pointRadius: 10,
					strokeColor: '#aaa',
					fontColor: '#fff',
					fontWeight: 'bold'
				}, OL.Feature.Vector.style["select"]))
			})
		});
		Waze.map.addLayer(GIPOD.layer);
		// TODO: doesn't work yet, missing something apparently
		var selectFeature = new OL.Control.SelectFeature(GIPOD.layer);
		Waze.map.addControl(selectFeature);
		GIPOD.layer.events.on({
			'featureselected': function(e) {
				log(e);
				if (e.feature.attributes.type == 'workPoint') {
					GIPOD.getItem(e.feature.attributes.id, showItem);
				}
			}
		});

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

		UI.ItemDetail.addEventListener(function(state) {
			if (state == 'hidden') {
				GIPOD.layer.removeFeatures(GIPOD.layer.getFeaturesByAttribute('type', 'workArea'));
			}
		});
	}

	function processGIPODData(data) {
		// Perform sorting based first on hindrance and then on date
		data.sort(function(a, b) {
			if (a.importantHindrance && b.importantHindrance || !a.importantHindrance && !b.importantHindrance) {
				return Date.parse(a.startDateTime) - Date.parse(b.startDateTime);
			} else {
				return !a.importantHindrance;
			}
		});
		// Clear out the previous results or loading text
		UI.ResultList.clear();
		// Remove all existing features from the map
		GIPOD.layer.removeAllFeatures();
		data.map(addGIPODItem);
		if (data.length === 0) {
			UI.ResultList.setStatus('noResult');
		}
		UI.ItemDetail.hide();
		UI.ResultList.show();
	}

	function addGIPODItem(data, index) {
		var lonlat = new OL.LonLat(data.coordinate.coordinates[0], data.coordinate.coordinates[1]).transform(GIPOD.projection, Waze.map.getProjectionObject());

		// Add as a list item
		var gipodItem = UI.ResultList.addResult(
			data.description,
			GIPOD.parseDatetime(data.startDateTime) + ' - ' + GIPOD.parseDatetime(data.endDateTime),
			function() {
				Waze.map.panTo(lonlat);
				GIPOD.getItem(this.dataset.id, showItem);
			},
			(data.importantHindrance ? '#ff3333' : '#ff8c00'));
		gipodItem.dataset.id = data.gipodId;

		// Add as point on the map
		var featurePoint = new OpenLayers.Feature.Vector(
			new OL.Geometry.Point(lonlat.lon, lonlat.lat),
			{ type: 'workPoint', description: data.description, id: data.gipodId },
			{ pointRadius: 10, fillColor: (data.importantHindrance ? '#ff3333' : '#ff8c00'), strokeColor: '#eee', label: (index+1).toString(), fontColor: '#fff', fontWeight: 'bold' });
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
				vectors.push(new OL.Feature.Vector(poly, { type: 'workArea' }, { fillOpacity: 0.6, fillColor: '#ff8c00', strokeColor: '#eeeeee'}));
			});
			GIPOD.layer.addFeatures(vectors);
			Waze.map.zoomToExtent(vectors[0].geometry.getBounds());
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