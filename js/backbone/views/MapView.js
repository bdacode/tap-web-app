// TapAPI Namespace Initialization //
if (typeof TapAPI === 'undefined'){TapAPI = {};}
if (typeof TapAPI.views === 'undefined'){TapAPI.views = {};}
if (typeof TapAPI.views.registry === 'undefined'){TapAPI.views.registry = {};}
// TapAPI Namespace Initialization //


/**
 * The MapView supports the display of multiple tours or a single tour
 */

jQuery(function() {

	// Define the Map View
	TapAPI.views.Map = Backbone.View.extend({

		el: $('#tour-map-page').find(":jqmData(role='content')"),
		template: TapAPI.templateManager.get('tour-map'),
		options: {
			'init-lat': 39.829104,
			'init-lon': -86.189504,
			'init-zoom': 2
		},
		map: null,
		tile_layer: null,
		view_initialized: false,
		latest_location: null,

		render: function() {

			$('#tour-map-page').live('pageshow', {map_view: this}, function(e) {
				e.data.map_view.resizeContentArea();
				if (e.data.map_view.map === null) {
					e.data.map_view.initMap();
				}
			});

			$(window).bind('orientationchange resize', this.resizeContentArea);

		},

		initMap: function() {

			$(this.el).html(this.template());
			this.map = new L.Map('tour-map');

			this.tile_layer = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>',
				maxZoom: 18
			});
			this.map.addLayer(this.tile_layer);

			// Set up location event callbacks
			this.map.addEventListener('locationfound', this.onLocationFound, this);
			this.map.addEventListener('locationerror', this.onLocationError, this);

			// First, try to set the view by locating the device
			this.map.locateAndSetView(this.options['init-zoom']);

			// Find stops with geo coordinate assets
			for (var i = 0; i<this.options.stops.size(); i++) {

				var tour_stop = this.options.stops.at(i);
				var asset_refs = tour_stop.get('assetRef');
				var result = _.each(asset_refs, function(asset_ref) {

					// Make sure this is a geo asset reference
					if ((asset_ref === undefined) || (asset_ref.usage != 'geo')) return;

					asset = tap.tourAssets.get(asset_ref.id);
					var data = $.parseJSON(asset.get('content')[0].data.value);

					if (data.type == 'Point') {
						var marker_location = new L.LatLng(data.coordinates[1], data.coordinates[0]);
						var marker = new L.Marker(marker_location);
						var template = TapAPI.templateManager.get('tour-map-marker-bubble');

						marker.bindPopup(template({
							'title': tour_stop.get('title')[0].value,
							'tour_id': tap.currentTour,
							'stop_id': tour_stop.id
						})).openPopup();

						this.map.addLayer(marker);

					}

				}, this);

			}

			return this;
		},

		onLocationFound: function(e) {

			console.log('onLocationFound', e);
			var radius = e.accuracy / 2;

			var marker = new L.Marker(e.latlng);
			this.map.addLayer(marker);
			marker.bindPopup("You are within " + radius + " meters from this point").openPopup();

			var circle = new L.Circle(e.latlng, radius);
			this.map.addLayer(circle);

			this.latest_location = e.latlng;
			this.view_initialized = true;

		},

		onLocationError: function(e) {

			console.log('onLocationError', e);

			// If the map view has not been initialized,
			// set the view to the initial center and zoom
			if (!this.view_initialized) {
				this.map.setView(
					new L.LatLng(this.options['init-lat'], this.options['init-lon']),
					this.options['init-zoom']
				);
				this.view_initialized = true;
			}

		},

		resizeContentArea: function() {
			var content, contentHeight, footer, header, viewportHeight;
			window.scroll(0, 0);
			var tour_map_page = $('#tour-map-page');
			header = tour_map_page.find(":jqmData(role='header'):visible");
			footer = tour_map_page.find(":jqmData(role='footer'):visible");
			content = tour_map_page.find(":jqmData(role='content'):visible");
			viewportHeight = $(window).height();
			contentHeight = viewportHeight - header.outerHeight() - footer.outerHeight();
			tour_map_page.find(":jqmData(role='content')").first().height(contentHeight);
		},

		close: function() {
			$(window).unbind('orientationchange pageshow resize', this.resizeContentArea);
		}

	});

});