// TapAPI Namespace Initialization //
if (typeof TapAPI === 'undefined'){TapAPI = {};}
if (typeof TapAPI.models === 'undefined'){TapAPI.models = {};}
// TapAPI Namespace Initialization //

// define asset model
TapAPI.models.Content = Backbone.Model.extend({
	initialize: function() {
		//parse never gets called due to this not being in localstorage as its own record
		this.set('propertySet', new TapAPI.collections.PropertySet(
			this.get('propertySet'),
			this.id
		));

		if (this.get('data').value) {
			this.set('data', this.get('data').value);
		}
	},
	defaults: {
		'lang': undefined,
		'propertySet': undefined,
		'data': undefined,
		'format': undefined,
		'lastModified': undefined,
		'part': undefined
	}
});