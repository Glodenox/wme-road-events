// ==UserScript==
// @name        WME Road Events Data
// @namespace   http://www.tomputtemans.com/
// @description Retrieve and show road events
// @include     https://www.waze.com/*/editor/*
// @include     https://www.waze.com/editor/*
// @include     https://editor-beta.waze.com/*
// @version     1.2
// @grant       none
// ==/UserScript==

(function() {
	var UI = {},
		RoadEvents;

	function roadEventsInit() {
		var userInfo = document.getElementById('user-info'),
			navTabs = userInfo.querySelector('.nav-tabs');

		// Check initialisation
		if (typeof Waze == 'undefined' || typeof I18n == 'undefined') {
			setTimeout(roadEventsInit, 660);
			log('Waze object unavailable, map still loading');
			return;
		}
		if (userInfo === null) {
			setTimeout(roadEventsInit, 660);
			log('User info unavailable, map still loading');
			return;
		}
		if (navTabs === null) {
			setTimeout(roadEventsInit, 660);
			log('Nav tabs unavailable, map still loading');
			return;
		}
		log('Road Events initated');

		// Set translation strings
		addTranslations();

		UI.Tab = function() {
			log("Configuring UI");
			var tabContent = userInfo.querySelector('.tab-content'),
					roadEventsTab = document.createElement('li'),
					roadEventsContent = document.createElement('div'),
					roadEventsTitle = document.createElement('h4');

			roadEventsTab.innerHTML = '<a href="#sidepanel-roadEvents" data-toggle="tab">' + I18n.t('road_events.tab_name') + '</a>';
			roadEventsContent.id = 'sidepanel-roadEvents';
			roadEventsContent.className = 'tab-pane';
			roadEventsTitle.appendChild(document.createTextNode(I18n.t('road_events.tab_title')));
			roadEventsTitle.style.marginBottom = '5px';
			roadEventsContent.appendChild(roadEventsTitle);
			navTabs.appendChild(roadEventsTab);
			tabContent.appendChild(roadEventsContent);

			return {
				add: function(element) {
					roadEventsContent.appendChild(element);
				}
			};
		}();
		UI.ResultList = function() {
			function parseDate(date) {
				return date.getFullYear() + '/' + zeroPad(date.getMonth()+1) + '/' + zeroPad(date.getDate()) + ' ' + zeroPad(date.getHours()) + ':' + zeroPad(date.getMinutes());
			}
			function createButton(text, handler) {
				var button = document.createElement('button');
				button.type = 'button';
				button.className = 'btn btn-default';
				button.innerHTML = text;
				button.addEventListener('click', handler, true);
				return button;
			}

			// Add search button
			var searchButton = createButton(I18n.t('road_events.search.button_label'), function() {
				RoadEvents.update();
				return false;
			});
			UI.Tab.add(searchButton);

			// List to contain results encapsulated in this object
			var ul = document.createElement('ul');
			ul.className = 'result-list';
			ul.style.marginTop = '5px';
			ul.style.paddingLeft = '10px';
			UI.Tab.add(ul);

			return {
				// Populate the result list with an array of events
				fill: function(events) {
					this.clear();
					ul.style.listStyleType = 'decimal';
					events.forEach(function(event) {
						var li = document.createElement('li');
						li.className = 'result session-available';
						li.style.fontWeight = 'bold';
						li.style.paddingLeft = '0';
						var head = document.createElement('p');
						head.className = 'title';
						if (event.color) {
							head.style.paddingLeft = '5px';
							head.style.borderLeft = '3px solid ' + event.color;
						}
						head.innerHTML = event.description;
						li.appendChild(head);
						var subhead = document.createElement('p');
						subhead.className = 'additional-info';
						subhead.style.fontWeight = 'normal';
						if (event.color) {
							subhead.style.paddingLeft = '8px';
						}
						subhead.innerHTML = parseDate(event.start) + ' - ' + parseDate(event.end);
						li.appendChild(subhead);
						li.addEventListener('click', function() {
							RoadEvents.show(event);
						});
						ul.appendChild(li);
					});
					UI.ItemDetail.hide();
					UI.ResultList.show();
				},
				clear: function() {
					while (ul.firstChild) {
						ul.removeChild(ul.firstChild);
					}
				},
				setStatus: function(status, count) {
					var title, info;

					this.clear();
					ul.style.listStyleType = 'none';
					if (status == 'loading') {
						title = I18n.t('road_events.search.loading_header');
						info = I18n.t('road_events.search.loading_subheader', {count: count});
					} else if (status == 'noResult') {
						title = I18n.t('road_events.results.empty_header');
						info = I18n.t('road_events.results.empty_subheader');
					} else if (status == 'noSources') {
						title = I18n.t('road_events.results.no_sources_header');
						info = I18n.t('road_events.results.no_sources_subheader');
					} else {
						log('Invalid status received: ' + status);
						throw new Error('Invalid status received: ' + status);
					}
					var li = document.createElement('li');
					li.className = 'result';
					li.style.fontWeight = 'bold';
					li.style.paddingLeft = '0';
					var head = document.createElement('p');
					head.className = 'title';
					head.appendChild(document.createTextNode(title));
					li.appendChild(head);
					var subhead = document.createElement('p');
					subhead.className = 'additional-info';
					subhead.style.fontWeight = 'normal';
					subhead.appendChild(document.createTextNode(info));
					li.appendChild(subhead);
					ul.appendChild(li);
					UI.ItemDetail.hide();
					UI.ResultList.show();
				},
				show: function() {
					ul.style.display = 'block';
				},
				hide: function() {
					ul.style.display = 'none';
				}
			};
		}();
		UI.ItemDetail = function() {
			var pane = document.createElement('div');
			pane.style.display = 'none';
			pane.style.marginTop = '8px';
			var title = document.createElement('h4');
			var details = document.createElement('div');
			var backButton = document.createElement('button');
			var listeners = [];
			backButton.type = 'button';
			backButton.className = 'btn btn-default';
			backButton.innerHTML = I18n.t('road_events.detail.back_to_list');
			backButton.addEventListener('click', function() {
				activeEvent = null;
				UI.Layer.removeType("area");
				UI.ItemDetail.hide();
				UI.ResultList.show();
			});
			pane.appendChild(title);
			pane.appendChild(details);
			pane.appendChild(backButton);
			UI.Tab.add(pane);

			return {
				set: function(event) {
					this.clear();
					for (var group in event.detail) {
						var sectionHeader = document.createElement('legend');
						sectionHeader.appendChild(document.createTextNode(I18n.t('road_events.detail.' + group)));
						var sectionData = document.createElement('fieldset');
						sectionData.appendChild(sectionHeader);
						var p = document.createElement('p');
						var pContent = '';
						for (var name in event.detail[group]) {
							var item = event.detail[group][name];
							if (item !== null && item.length !== 0) {
								if (Array.isArray(item)) {
									pContent += '<strong>' + I18n.t('road_events.detail.' + name, {count: item.length}) + ":</strong> ";
									pContent += item.join(', ');
								} else {
									pContent += '<strong>' + I18n.t('road_events.detail.' + name) + ":</strong> ";
									if (typeof item === 'boolean') {
										pContent += I18n.t('road_events.detail.' + (item ? 'yes' : 'no'));
									} else {
										pContent += item;
									}
								}
								pContent += '<br/>';
							}
						}
						p.innerHTML = pContent;
						sectionData.appendChild(p);
						details.appendChild(sectionData);
					}
					UI.ResultList.hide();
					UI.ItemDetail.show();
				},
				clear: function() {
					while (details.firstChild) {
						details.removeChild(details.firstChild);
					}
				},
				show: function() {
					pane.style.display = 'block';
				},
				hide: function() {
					pane.style.display = 'none';
				}
			};
		}();
		UI.Layer = function() {
			var layer = new OL.Layer.Vector(I18n.t('road_events.layer_label'), {
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
			Waze.map.addLayer(layer);
			// TODO: selecting features doesn't work yet, missing something apparently?
			var selectFeature = new OL.Control.SelectFeature(layer);
			Waze.map.addControl(selectFeature);
			layer.events.on({
				'featureselected': function(e) {
					log(e);
				}
			});

			function makeVector(event) {
				return new OL.Feature.Vector(
					event.coordinate,
					{ type: 'marker', description: event.description, id: event.id },
					{ pointRadius: 10, fillColor: event.color, strokeColor: '#eee', label: event.index.toString(), fontColor: '#fff', fontWeight: 'bold' }
				);
			}

			return {
				// Add a vector
				add: function(vector) {
					layer.addFeatures([ vector ]);
				},
				// Add a set of road events to the map at once
				fill: function(events) {
					this.clear();
					var vectors = events.map(makeVector);
					layer.addFeatures(vectors);
				},
				// Remove all features for which a certain attribute is set
				removeType: function(type) {
					layer.removeFeatures(layer.getFeaturesByAttribute('type', type));
				},
				// Clear the layer by removing all features
				clear: function() {
					layer.removeAllFeatures();
				}
			};
		}();

		RoadEvents = function() {
			var activeEvent = null,
				sources = {};
		
			// Hook into dialog-container for closure addition prefilling
			var observer = new MutationObserver(function(mutations) {
				if (activeEvent !== null) {
					mutations.forEach(function(mutation) {
						for (var i = 0; i < mutation.addedNodes.length; i++) {
							var node = mutation.addedNodes[i];
							if (node !== Node.ELEMENT_NODE) {
								continue;
							}
							if (node.querySelector('.edit-closure.new')) {
								node.querySelector("input.form-control[name='closure_reason']").value = activeEvent.detail.identification.description;
								if (activeEvent.start) {
									node.querySelector("input[name='closure_hasStartDate']").checked = true;
									node.querySelector("input.form-control[name='closure_startDate']").value = activeEvent.start.getFullYear() + '-' + zeroPad(activeEvent.start.getMonth()+1) + '-' + zeroPad(activeEvent.start.getDate());
									node.querySelector("input.form-control[name='closure_startTime']").value = zeroPad(activeEvent.start.getHours()) + ':' + zeroPad(activeEvent.start.getMinutes());
								}
								if (activeEvent.end) {
									node.querySelector("input.form-control[name='closure_endDate']").value = activeEvent.end.getFullYear() + '-' + zeroPad(activeEvent.end.getMonth()+1) + '-' + zeroPad(activeEvent.end.getDate());
									node.querySelector("input.form-control[name='closure_endTime']").value = zeroPad(activeEvent.end.getHours()) + ':' + zeroPad(activeEvent.end.getMinutes());
								}
							}
						}
					});
				}
			});
			observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });

			return {
				// Retrieve one specific event from a source
				show: function(event) {
					sources[event.source].get(event.id, function(detail) {
						UI.ItemDetail.set(detail);
						activeEvent = detail;
						if (detail.vector) {
							UI.Layer.add(detail.vector);
							Waze.map.zoomToExtent(detail.vector.geometry.getBounds());
						}
					});
				},
				// Update all sources for the current location
				update: function() {
					var promises = [];
					var viewBounds = Waze.map.getExtent();
					activeEvent = null;
					for (var source in sources) {
						if (sources[source].intersects(viewBounds)) {
							promises.push(sources[source].update());
						}
					}
					if (promises.length === 0) {
						UI.ResultList.setStatus('noSources');
						return;
					}
					UI.ResultList.setStatus('loading', promises.length);
					Promise.all(promises).then(function(results) {
						var roadEvents = results.reduce(function(prev, curr) {
							return prev.concat(curr);
						}).sort(function(a, b) {
							if (a.hindrance == b.hindrance) {
								return a.start.getTime() - b.start.getTime();
							} else {
								return (a.hindrance ? -1 : 1);
							}
						}).map(function(roadEvent, index) {
							roadEvent.index = index + 1;
							return roadEvent;
						});
						if (roadEvents.length > 0) {
							UI.ResultList.fill(roadEvents);
							UI.Layer.fill(roadEvents);
						} else {
							UI.ResultList.setStatus('noResult');
						}
					});
				},
				// Add a new source of road events
				addSource: function(source) {
					sources[source.id] = source;
				}
			};
		}();

		// Data source: GIPOD Work Assignments (Flanders, Belgium)
		RoadEvents.addSource(function() {
			// Proxy necessary as this API is not available via a secure connection
			var url = 'https://tomputtemans.com/waze-scripts/road-events.php?source=gipod-workassignment',
				projection = new OL.Projection("EPSG:4326"),
				cache = [], // cached event details,
				bounds = new OL.Bounds(280525, 6557859, 661237, 6712007);

			// Input: 2014-12-22T00:00:00.000 - Output: 2014-12-22 00:00
			function parseDateTime(datetime) {
				return datetime.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})(:\d{2})(\.\d+)?/, "$1/$2/$3 $4");
			}

			return {
				id: 'gipod_work',
				intersects: function(view) {
					return bounds.intersectsBounds(view);
				},
				update: function() {
					return new Promise(function(resolve, reject) {
						// Obtain the bounds and transform them to the projection used by GIPOD
						var bounds = Waze.map.calculateBounds().transform(Waze.map.getProjectionObject(), projection);
						// bounding box: left bottom coordinate | right top coordinate
						var bbox = bounds.left + "," + bounds.bottom + "|" + bounds.right + "," + bounds.top;
						$.ajax({
							url: url + '&bbox=' + bbox
						}).done(function(response) {
							var rawData = JSON.parse(response);
							var roadEvents = rawData.map(function(data) {
								return {
									id: escapeString(data.gipodId),
									source: 'gipod_work',
									description: escapeString(data.description),
									start: new Date(data.startDateTime),
									end: new Date(data.endDateTime),
									hindrance: data.importantHindrance,
									color: (data.importantHindrance ? '#ff3333' : '#ff8c00'),
									coordinate: new OL.Geometry.Point(data.coordinate.coordinates[0], data.coordinate.coordinates[1]).transform(projection, Waze.map.getProjectionObject())
								};
							});
							resolve(roadEvents);
						}).fail(function(xhr, text) {
							resolve([]);
						});
					});
				},
				get: function(gipodId, callback) {
					if (cache[gipodId]) {
						callback(cache[gipodId]);
					} else {
						$.ajax({
							url: url + '&id=' + gipodId
						}).done(function(response) {
							var data = JSON.parse(response);
							if (data.hindrance === null) {
								data.hindrance = {
									description: I18n.t('road_events.detail.no_hindrance'),
									locations: [],
									effects: []
								};
							}
							if (data.contactDetails === null) {
								data.contactDetails = {
									organisation: I18n.t('road_events.detail.no_organisation')
								};
							}
							var vector = null;
							if (data.location.geometry !== null) {
								var poly = null;
								if (data.location.geometry.type == 'Polygon') {
									var ring = new OL.Geometry.LinearRing(data.location.geometry.coordinates[0].map(function(coord) {
										return new OL.Geometry.Point(coord[0], coord[1]).transform(projection, Waze.map.getProjectionObject());
									}));
									poly = new OL.Geometry.Polygon([ ring ]);
								} else if (data.location.geometry.type == 'MultiPolygon') {
									rings = data.location.geometry.coordinates[0].map(function(coords) {
										return new OL.Geometry.LinearRing(coords.map(function(coord) {
											return new OL.Geometry.Point(coord[0], coord[1]).transform(projection, Waze.map.getProjectionObject());
										}));
									});
									poly = new OL.Geometry.Polygon(rings);
								}
								if (poly !== null) {
									vector = new OL.Feature.Vector(poly, { type: 'area' }, { fillOpacity: 0.6, fillColor: '#ff8c00', strokeColor: '#eeeeee'});
								}
							}
							var roadEvent = {
								detail: {
									identification: {
										description: escapeString(data.description),
										periods: [ parseDateTime(escapeString(data.startDateTime)) + ' - ' + parseDateTime(escapeString(data.endDateTime)) + (data.type ? ' (' + data.type + ')' : '') ],
										cities: data.location.cities.map(escapeString),
										comment: escapeString(data.comment),
										last_update: escapeString(parseDateTime(data.latestUpdate)),
										id: escapeString(data.gipodId),
										source: 'GIPOD Work Assignments'
									},
									hindrance: {
										important_hindrance: data.hindrance.important === true,
										description: escapeString(data.hindrance.description),
										direction: escapeString(data.direction),
										locations: data.hindrance.locations.map(escapeString),
										effects: data.hindrance.effects.map(escapeString)
									},
									contact: {
										owner: escapeString(data.owner),
										contractor: escapeString(data.contactor),
										organisation: escapeString(data.contactDetails.organisation),
										email: formatDataField(escapeString(data.contactDetails.email)),
										phone: escapeString(data.contactDetails.phoneNumber1)
									}
								},
								start: new Date(data.startDateTime),
								end: new Date(data.endDateTime),
								id: escapeString(data.gipodId),
								vector: vector,
								rawData: data
							};
							cache[roadEvent.detail.identification.id] = roadEvent;
							callback(roadEvent);
						});
					}
				}
			};
		}());

		// Data source: GIPOD Manifestations (Flanders, Belgium)
		RoadEvents.addSource(function() {
			// Proxy necessary as this API is not available via a secure connection
			var url = 'https://tomputtemans.com/waze-scripts/road-events.php?source=gipod-manifestation',
				projection = new OL.Projection("EPSG:4326"),
				cache = [], // cached event details
				bounds = new OL.Bounds(280525, 6557859, 661237, 6712007);

			// Input: 2014-12-22T00:00:00.000 - Output: 2014-12-22 00:00
			function parseDateTime(datetime) {
				return datetime.replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})(\.\d+)?/, "$1 $2");
			}

			return {
				id: 'gipod_manifestation',
				intersects: function(view) {
					return bounds.intersectsBounds(view);
				},
				update: function() {
					return new Promise(function(resolve, reject) {
						// Obtain the bounds and transform them to the projection used by GIPOD
						var bounds = Waze.map.calculateBounds().transform(Waze.map.getProjectionObject(), projection);
						// bounding box: left bottom coordinate | right top coordinate
						var bbox = bounds.left + "," + bounds.bottom + "|" + bounds.right + "," + bounds.top;
						$.ajax({
							url: url + '&bbox=' + bbox,
							dataType: 'json'
						}).done(function(rawData) {
							var roadEvents = rawData.map(function(data) {
								return {
									id: escapeString(data.gipodId),
									source: 'gipod_manifestation',
									description: escapeString(data.description),
									start: new Date(data.startDateTime),
									end: new Date(data.endDateTime),
									hindrance: data.importantHindrance,
									color: (data.importantHindrance ? '#3333ff' : '#008cff'),
									coordinate: new OL.Geometry.Point(data.coordinate.coordinates[0], data.coordinate.coordinates[1]).transform(projection, Waze.map.getProjectionObject())
								};
							});
							resolve(roadEvents);
						}).fail(function(xhr, text) {
							resolve([]);
						});
					});
				},
				get: function(gipodId, callback) {
					if (cache[gipodId]) {
						callback(cache[gipodId]);
					} else {
						$.ajax({
							url: url + '&id=' + gipodId,
							dataType: 'json'
						}).done(function(data) {
							if (data.hindrance === null) {
								data.hindrance = {
									description: I18n.t('road_events.detail.no_hindrance'),
									locations: [],
									effects: []
								};
							}
							if (data.contactDetails === null) {
								data.contactDetails = {
									organisation: I18n.t('road_events.detail.no_organisation')
								};
							}
							var vector = null;
							if (data.location.geometry !== null) {
								var poly = null;
								if (data.location.geometry.type == 'Polygon') {
									var ring = new OL.Geometry.LinearRing(data.location.geometry.coordinates[0].map(function(coord) {
										return new OL.Geometry.Point(coord[0], coord[1]).transform(projection, Waze.map.getProjectionObject());
									}));
									poly = new OL.Geometry.Polygon([ ring ]);
								} else if (data.location.geometry.type == 'MultiPolygon') {
									rings = data.location.geometry.coordinates[0].map(function(coords) {
										return new OL.Geometry.LinearRing(coords.map(function(coord) {
											return new OL.Geometry.Point(coord[0], coord[1]).transform(projection, Waze.map.getProjectionObject());
										}));
									});
									poly = new OL.Geometry.Polygon(rings);
								}
								if (poly != null) {
									vector = new OL.Feature.Vector(poly, { type: 'area' }, { fillOpacity: 0.6, fillColor: '#ff8c00', strokeColor: '#eeeeee'});
								}
							}
							var roadEvent = {
								detail: {
									identification: {
										description: escapeString(data.description),
										periods: data.periods.map(function(period) {return parseDateTime(escapeString(period.startDateTime)) + ' - ' + parseDateTime(escapeString(period.endDateTime));}),
										cities: data.location.cities.map(escapeString),
										event_type: escapeString(data.eventType),
										comment: escapeString(data.comment),
										id: escapeString(data.gipodId),
										source: 'GIPOD Manifestations'
									},
									hindrance: {
										important_hindrance: data.hindrance.important == true,
										description: escapeString(data.hindrance.description),
										direction: escapeString(data.direction),
										recurrence: escapeString(data.recurrencePattern),
										locations: escapeString(data.hindrance.locations),
										effects: escapeString(data.hindrance.effects)
									},
									contact: {
										owner: escapeString(data.owner),
										initiator: escapeString((data.initiator ? data.initiator.organisation : null)),
										organisation: escapeString(data.contactDetails.organisation),
										email: formatDataField(escapeString(data.contactDetails.email)),
										phone: escapeString(data.contactDetails.phoneNumber1)
									}
								},
								start: new Date(data.periods ? data.periods[0].startDateTime : null),
								end: new Date(data.periods ? data.periods[0].endDateTime : null),
								id: escapeString(data.gipodId),
								vector: vector,
								rawData: data
							};
							cache[roadEvent.detail.identification.id] = roadEvent;
							callback(roadEvent);
						});
					}
				}
			};
		}());
		
		// Data source: Waze alerts by Wazers
		RoadEvents.addSource(function() {
			var projection = new OL.Projection("EPSG:4326");
			var url = 'https://www.waze.com';
			switch (Waze.location.code) {
				case 'row':
					url += '/row-rtserver/web/GeoRSS'; 
					break;
				case 'il':
					url += '/il-rtserver/web/GeoRSS'; 
					break;
				default: 
					url += '/rtserver/web/GeoRSS';
			}
			var projection = new OL.Projection("EPSG:4326");
			var cache = {};
			
			return {
				id: 'waze_alerts',
				intersects: function(view) {
					return true; // Available worldwide
				},
				update: function() {
					return new Promise(function(resolve, reject) {
						var extent = Waze.map.getExtent().transform(Waze.map.getProjectionObject(), projection);
						var data = {
							format: "JSON",
							types: "alerts",
							left: extent.left,
							right: extent.right,
							bottom: extent.bottom,
							top: extent.top
						};
						$.ajax({
							url: url,
							data: data,
							dataType: 'json'
						}).done(function(response) {
							var roadEvents = [];
							if (response.alerts) {
								response.alerts.forEach(function(alert) {
									roadEvents.push({
										id: alert.id,
										source: 'waze_alerts',
										description: escapeString(alert.type),
										start: new Date(alert.pubMillis),
										end: new Date(),
										hindrance: false,
										color: '#614051',
										coordinate: new OL.Geometry.Point(alert.location.x, alert.location.y).transform(projection, Waze.map.getProjectionObject())
									});
									cache[alert.id] = alert;
								});
							}
							resolve(roadEvents);
						}).fail(function(xhr, text) {
							resolve([]);
						});;
					});
				},
				get: function(id, callback) {
					var alert = cache[id];
					callback({
						detail: {
							identification: {
								description: alert.type + ': ' + escapeString(alert.reportDescription),
								periods: [ new Date(alert.pubMillis).toISOString().substring(0, 10) ],
								id: alert.id
							},
							contact: {
								owner: 'Waze',
								initiator: escapeString(alert.reportBy)
							}
						}
					});
				}				
			};
		}());
		
		// Data source: Brussels Mobility (Brussels, Belgium)
		/*RoadEvents.addSource(function() {
			// Proxy necessary as this API is not available via a secure connection
			var url = 'https://tomputtemans.com/waze-scripts/road-events.php?source=mobiris',
				projection = new OL.Projection("EPSG:31370"),
				cache = [], // cached events
				bounds = new OL.Bounds(472208, 6579412, 499191, 6606318);
			// http://www.bruxellesmobilite.irisnet.be/static/mobiris_files/nl/alerts.json*/
		
	}

	function addTranslations() {
		var strings = {
			en: {
				layer_label: "Road Events",
				tab_name: "RED",
				tab_title: "Road Events Data",
				search: {
					button_label: "Search current location",
					loading_header: "Loading...",
					loading_subheader: {
						one: "Retrieving information from 1 service",
						other: "Retrieving information from %{count} services"
					}
				},
				results: {
					empty_header: "No results found",
					empty_subheader: "Please zoom out or pan to another area",
					limit_reached_header: "Some results may have been omitted",
					limit_reached_header: "A service limits the amount of results and this limit has been reached. Zoom in to see all results",
					no_sources_header: "No data sources for this area",
					no_sources_subheader: "There are no data sources configured for this area"
				},
				detail: {
					back_to_list: "Back to results",
					cities: {
						one: "City",
						other: "Cities"
					},
					comment: "Comment",
					contact: "Contact",
					contractor: "Contractor",
					description: "Description",
					direction: "Direction",
					effects: {
						one: "Effect",
						other: "Effects"
					},
					email: "E-mail",
					event_type: "Event type",
					hindrance: "Hindrance",
					id: "ID",
					identification: "Identification",
					important_hindrance: "Important hindrance",
					initiator: "Initiator",
					last_update: "Last update",
					locations: {
						one: "Location",
						other: "Locations"
					},
					no: "no",
					no_hindrance: "no hindrance specified",
					no_organisation: "no organisation specified",
					organisation: "Organisation",
					owner: "Owner",
					periods: {
						one: "Period",
						other: "Periods"
					}, 
					phone: "Phone number",
					recurrence: "Recurrences",
					source: "Source",
					state: "State",
					url: "URL",
					yes: "yes"
				}
			},
			nl: {
				layer_label: "Weggebeurtenissen",
				tab_name: "RED",
				tab_title: "Weggebeurtenissen (Road Events Data)",
				search: {
					button_label: "Zoek op huidige locatie",
					loading_header: "Aan het laden...",
					loading_subheader: {
						one: "Informatie aan het opvragen bij 1 dienst",
						other: "Informatie aan het opvragen bij %{count} diensten"
					}
				},
				results: {
					empty_header: "Geen resultaten gevonden",
					empty_subheader: "Zoom uit of ga naar een andere locatie",
					limit_reached_header: "Mogelijk ontbreken sommige resultaten",
					limit_reached_header: "Een dienst beperkt het aantal resultaten en deze limiet werd bereikt. Zoom in om het alle resultaten te zien",
					no_sources_header: "Geen databronnen voor dit gebied",
					no_sources_subheader: "Er zijn geen databronnen ingesteld voor dit gebied"
				},
				detail: {
					back_to_list: "Terug naar resultaten",
					cities: {
						one: "Grondgebied",
						other: "Grondgebied"
					},
					comment: "Commentaar",
					contact: "Contact",
					contractor: "Aannemer",
					description: "Omschrijving",
					direction: "Richting",
					effects: {
						one: "Impact",
						other: "Impact"
					},
					email: "E-mail",
					event_type: "Evenementtype",
					hindrance: "Hinder",
					id: "ID",
					identification: "Identificatie",
					important_hindrance: "Ernstige hinder",
					initiator: "Initiatiefnemer",
					last_update: "Laatst bijgewerkt",
					locations: {
						one: "Plaats",
						other: "Plaatsen"
					},
					no: "nee",
					no_hindrance: "geen hinder vermeld",
					no_organisation: "geen organisatie vermeld",
					organisation: "Organisatie",
					owner: "Beheerder",
					periods: {
						one: "Periode",
						other: "Periodes"
					}, 
					phone: "Telefoonnummer",
					recurrence: "Herhalingspatroon",
					source: "Bron",
					state: "Status",
					url: "URL",
					yes: "ja"
				}
			},
			fr: {
				layer_label: "Evénements routiers",
				tab_name: "RED",
				tab_title: "Evénements routiers (Road Events Data)",
				search: {
					button_label: "Cherchez ici",
					loading_header: "Chargement en cours...",
					loading_subheader: {
						one: "En train de obtenir de l'information chez 1 service",
						other: "En train de obtenir de l'information chez %{count} services"
					}
				},
				results: {
					empty_header: "Aucun résultat trouvé",
					empty_subheader: "Dézoome ou déplace la carte",
					limit_reached_header: "Quelques résultats peuvent manquer",
					limit_reached_header: "Une service limite la quantité de résultats et on a attaint cette limite. Agrandis la carte pour voir tout les résultats",
					no_sources_header: "Aucun source pour cette région",
					no_sources_subheader: "Aucun source de données spécifié pour cette région"
				},
				detail: {
					back_to_list: "Retour aux résultats",
					cities: {
						one: "Commune",
						other: "Communes"
					},
					comment: "Commentaire",
					contact: "Contact",
					contractor: "Contractant",
					description: "Description",
					direction: "Direction",
					effects: {
						one: "Impact",
						other: "Impact"
					},
					email: "Email",
					event_type: "Type d'événement",
					hindrance: "Obstacles",
					id: "ID",
					identification: "Identification",
					important_hindrance: "Obstacle majeur",
					initiator: "Initiateur",
					last_update: "Dernier mise à jour",
					locations: {
						one: "Endroit",
						other: "Endroits"
					},
					no: "non",
					no_hindrance: "aucun obstacle spécifié",
					no_organisation: "aucun organisation spécifié",
					organisation: "Organisation",
					owner: "Administrateur",
					periods: {
						one: "Période",
						other: "Périodes"
					},
					phone: "Numéro telephone",
					recurrence: "Récurrences",
					source: "Source",
					state: "Etat",
					url: "URL",
					yes: "oui"
				}
			}
		};
		strings['en_GB'] = strings.en;
		I18n.availableLocales.forEach(function(locale) {
			if (I18n.translations[locale]) {
				I18n.translations[locale]['road_events'] = strings[locale];
			}
		});
	}

	function escapeString(text) {
		if (Array.isArray(text)) {
			if (text.length > 0) {
				return text.map(escapeString);
			} else {
				return null;
			}
		}
		if (typeof text === 'undefined' || text === null || text === '' || text === ' ') {
			return null;
		}
		if (typeof text !== 'string') {
			text = JSON.stringify(text);
		}
		return text.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#x27;');
	}

	function zeroPad(number) {
		return ("0" + number).slice(-2);
	}

	function formatDataField(field) {
		if (typeof field === 'string') {
			if (/^https?:\/\//.test(field)) { // Website
				return '<a href="' + encodeURI(field) + '" target="_blank">' + field + '</a>';
			} else if (/^[^ ]+@[^ ]+\.[a-zA-Z0-9]+$/.test(field)) { // E-mail
				return '<a href="mailto:' + encodeURI(field) + '" target="_blank">' + field + '</a>';
			} else {
				return field;
			}
		}
		return null;
	}

	// TODO: further implement this without using the console
	function showError(error) {
		log(error);
	}

	function log(message) {
		if (typeof message === 'string') {
			console.log('Road Events: ' + message);
		} else {
			console.log('Road Events', message);
		}
	}

	// attempt to bootstrap after about a second
	log('Road Events bootstrap set');
	setTimeout(roadEventsInit, 1010);
})();
