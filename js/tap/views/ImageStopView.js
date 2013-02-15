define([
    'jquery',
    'underscore',
    'backbone',
    'tap/TapAPI',
    'tap/TemplateManager',
    'tap/views/StopView'
], function($, _, Backbone, TapAPI, TemplateManager, StopView) {
	var imageStopView = StopView.extend({
		template: TemplateManager.get('image-stop'),
		initialize: function() {
			this.title = this.model.get('title');
		},
		render: function() {
			var asset_refs = TapAPI.currentStop.get('assetRef');
			var content_template = TapAPI.templateManager.get('image-stop');
			var imageTemplate = TapAPI.templateManager.get('image-stop-item');

			if (asset_refs) {
				this.$el.find(':jqmData(role="content")').append(content_template());

				var gallery = this.$el.find('#Gallery');

				$.each(asset_refs, function(assetRef) {
					var asset = TapAPI.tourAssets.get(this.id);

					if (this.usage === 'image_asset') {
						var templateData = {};
						var sources = asset.get('source');
						var content = asset.get('content');
						sources.each(function(source) {
							switch (source.get('part')) {
								case 'image_asset_image':
									templateData.fullImageUri = source.get('uri') ? source.get('uri') : '';
									break;
								case 'thumbnail':
									templateData.thumbUri = source.get('uri') ? source.get('uri') : '';
									break;
							}
						});
						content.each(function(contentItem) {
							switch(contentItem.get('part')) {
								case 'title':
									templateData.title = contentItem.get('data');
									break;
								case 'caption':
									templateData.caption = contentItem.get('caption');
									break;
							}
						});

						gallery.append(imageTemplate(templateData));
					}
				});

				var photoSwipe = this.$el.find('#gallery a').photoSwipe({
					enableMouseWheel: false,
					enableKeyboard: true,
					doubleTapZoomLevel : 0,
					captionAndToolbarOpacity : 0.8,
					minUserZoom : 0.0,
					preventSlideshow : true,
					jQueryMobile : true
				});
			}
			return this;
		}
	});
	return imageStopView;
});