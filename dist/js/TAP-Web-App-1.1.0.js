/*
 * TAP - v1.1.0 - 2013-07-02
 * http://tapintomuseums.org/
 * Copyright (c) 2011-2013 Indianapolis Museum of Art
 * GPLv3
 */
var TapAPI = {
    classes: {
        models: {},
        views: {},
        collections: {},
        routers: {}
    },
    tours: {},
    tourAssets: {},
    tourStops: {},
    language: 'en',
    currentStop: null,
    currentTour: '',
    templates: {},
    // User Configurable
    defaultLanguage: _.isUndefined(TapConfig.defaultLanguage) ? 'en' : TapConfig.defaultLanguage,
    tourMLEndpoint: _.isUndefined(TapConfig.tourMLEndpoint) ? '' : TapConfig.tourMLEndpoint,
    tracker: null,
    trackerID: _.isUndefined(TapConfig.trackerID) ? '' : TapConfig.trackerID,
    trackerClass: _.isUndefined(TapConfig.trackerClass) ? 'GAModel' : TapConfig.trackerClass,
    navigationControllers: {
        'StopListView': {
            label: 'Stop Menu',
            filterBy: 'stopGroup',
            sortBy: 'code',
            displayCodes: true
        },
        'KeypadView': {
            label: 'Keypad'
        },
        'MapView': {
            label: 'Map',
            showDirections: false
        }
    },
    tourSettings: TapConfig.tourSettings,
    viewRegistry: {
       'audio_stop': {
            view: 'AudioStopView',
            icon: 'images/audio.png'
        },
        'image_stop': {
            view: 'ImageStopView',
            icon: 'images/photo.png'
        },
        'stop_group': {
            view: 'StopGroupView',
            icon: 'images/list.png'
        },
        'video_stop': {
            view: 'VideoStopView',
            icon: 'images/video.png'
        },
        'web_stop': {
            view: 'WebStopView',
            icon: 'images/web.png'
        }
    },
    media: {
        pluginPath: 'vendor/mediaelement/'
    },
    geo: {
        units: 'metric'
    },
    social: {
        enabled: false,
        facebook: {
            appID: ''
        }
    }
};

// attempt to get user defined media configurations
if (!_.isUndefined(TapConfig.media)) {
    _.extend(TapAPI.media, TapConfig.media);
}

// attempt to get user defined social configurations
if (!_.isUndefined(TapConfig.social)) {
    _.extend(TapAPI.social, TapConfig.social);
}

// attempt to get user defined view registry
if (!_.isUndefined(TapConfig.viewRegistry)) {
    _.extend(TapAPI.viewRegistry, TapConfig.viewRegistry);
}

// attempt to get user defiend navigation controllers
if (!_.isUndefined(TapConfig.navigationControllers)) {
    _.extend(TapAPI.navigationControllers, TapConfig.navigationControllers);
}
TapAPI.helper = {
    replaceArray: function(obj, find, replace) {
        for (var i = 0; i < find.length; i++) {
            obj = obj.replace(find[i], replace);
        }
        return obj;
    },
    toCamel: function(str) {
        return str.replace(/\s(.)/g, function($1) {
                return $1.toUpperCase();
            })
            .replace(/\s/g, '')
            .replace(/^(.)/, function($1) {
                return $1.toLowerCase();
            });
    },
    /*
     * Load xml document
     */
    loadXMLDoc: function(url) {
        xhttp = new XMLHttpRequest();
        xhttp.open('GET', url, false);
        xhttp.send();
        return xhttp.responseXML;
    },
    /*
     * Attempt to make the variable an array
     */
    objectToArray: function(obj) {
        if(obj === undefined) return;
        return Object.prototype.toString.call(obj) !== '[object Array]' ? [obj] : obj;
    },
    /*
     * Convert xml to JSON
     */
    xmlToJson: function(xml, namespace) {
        var obj = true,
            i = 0;
        // retrieve namespaces
        if(!namespace) {
            namespace = ['xml:'];
            for(i = 0; i < xml.documentElement.attributes.length; i++) {
                if(xml.documentElement.attributes.item(i).nodeName.indexOf('xmlns') != -1) {
                    namespace.push(xml.documentElement.attributes.item(i).nodeName.replace('xmlns:', '') + ':');
                }
            }
        }

        var result = true;
        if (xml.attributes && xml.attributes.length > 0) {
            var attribute, str;
            result = {};
            for (var attributeID = 0; attributeID < xml.attributes.length; attributeID++) {
                attribute = xml.attributes.item(attributeID);
                str = this.replaceArray(attribute.nodeName, namespace, '');
                str = this.toCamel(str);
                result[str] = attribute.nodeValue;
            }
        }
        if (xml.hasChildNodes()) {
            var key, value, xmlChild;
            if (result === true) { result = {}; }
            for (var child = 0; child < xml.childNodes.length; child++) {
                xmlChild = xml.childNodes.item(child);
                if ((xmlChild.nodeType & 7) === 1) {
                    key = this.replaceArray(xmlChild.nodeName, namespace, '');

                    key = this.toCamel(key);
                    value = this.xmlToJson(xmlChild, namespace);
                    if (result.hasOwnProperty(key)) {
                        if (result[key].constructor !== Array) { result[key] = [result[key]]; }
                        result[key].push(value);
                    } else { result[key] = value; }
                } else if ((xmlChild.nodeType - 1 | 1) === 3) {
                    key = 'value';
                    value = xmlChild.nodeType === 3 ? xmlChild.nodeValue.replace(/^\s+|\s+$/g, '') : xmlChild.nodeValue;
                    if (result.hasOwnProperty(key)) { result[key] += value; }
                    else if (xmlChild.nodeType === 4 || value !== '') { result[key] = value; }
                }
            }
        }
        return(result);
    }
};
/*
 * The Primary router for TAP
 */
TapAPI.classes.routers.Primary = Backbone.Router.extend({
    routes: {
        '': 'tourSelection',
        'tour/:tourID/details': 'tourDetails',
        'tour/:tourID/stop/:stopID': 'tourStop'
    },
    initialize: function() {
        _.each(TapAPI.navigationControllers, function(controller) {
            this.route('tour/:tourID/controller/:view', 'routeToController');
        }, this);
    },
    /**
     * Route to the tour listing
     */
    tourSelection: function() {
        // check to see if only one tour exists
        if (TapAPI.tours.length === 1) {
            // navigate them directly to that tours details page
            this.navigate('tour/' + TapAPI.tours.at(0).get('id') + '/details', {trigger: true});
        } else {
            this.changePage(new TapAPI.classes.views.TourListView());
        }
    },
    /**
     * Route to the tour details
     * @param id The id of the tour
     */
    tourDetails: function(tourID) {
        TapAPI.tours.selectTour(tourID);
        TapAPI.currentStop = null;

        this.changePage(new TapAPI.classes.views.TourDetailsView());
    },
    routeToController: function(tourID, view) {
        var that = this;

        TapAPI.tours.selectTour(tourID);
        TapAPI.currentStop = null;

        that.changePage(new TapAPI.classes.views[view]());
    },
    /**
     * Route to a stop
     */
    tourStop: function(tourID, stopID) {
        var that = this;

        TapAPI.tours.selectTour(tourID);
        TapAPI.currentStop = TapAPI.tourStops.get(stopID);

        var stopType = TapAPI.currentStop.get('view');
        var viewName = TapAPI.viewRegistry[stopType].view;

        that.changePage(new TapAPI.classes.views[viewName]({model: TapAPI.currentStop}));
    },
    changePage: function(view) {
        TapAPI.tracker.trackPageView('/#' + Backbone.history.getFragment());
        //_gaq.push(['_trackPageview', '/#' + Backbone.history.getFragment()]);
        Backbone.trigger('tap.router.routed', view);
        Backbone.trigger('app.widgets.refresh');
    },
    getTourDefaultRoute: function(tourId) {
        var defaultController, controller;

        // get tour specific default navigation controller
        if (!_.isUndefined(TapAPI.tourSettings[tourId]) &&
            TapAPI.tourSettings[tourId].defaultNavigationController) {
            defaultController = TapAPI.tourSettings[tourId].defaultNavigationController;
        }

        // get first controller if none were selected as a default
        if (_.isUndefined(defaultController)) {
            for (controller in TapAPI.navigationControllers) {
                defaultController = controller;
                break;
            }
        }

        return '#tour/' + tourId + '/controller/' + defaultController;
    }
});
TapAPI.templateManager = {
    get : function(templateName) {
        if (TapAPI.templates[templateName] === undefined) {
            $.ajax({
                async : false,
                dataType : 'html',
                url : 'templates/' + templateName + '.tpl.html',
                success : function(data, textStatus, jqXHR) {
                    TapAPI.templates[templateName] = _.template(data);
                }
            });
        }
        return TapAPI.templates[templateName];
    }
};
TapAPI.tourMLParser = {
    process: function(url) {
        var tours = [];
        var i, len;

        // load tourML
        var tourML = TapAPI.helper.xmlToJson(TapAPI.helper.loadXMLDoc(url));
        if(tourML.tour) { // Single tour
            tours.push(this.parseTourML(tourML.tour));
        } else if(tourML.tourSet && tourML.tourSet.tourMLRef) { // TourSet w/ external tours
            len = tourML.tourSet.tourMLRef.length;
            for(i = 0; i < len; i++) {
                var data = TapAPI.helper.xmlToJson(TapAPI.helper.loadXMLDoc(tourML.tourSet.tourMLRef[i].uri));
                tours.push(this.parseTourML(data.tour));
            }
        } else if(tourML.tourSet && tourML.tourSet.tour) { // TourSet w/ tours as children elements
            len = tourML.tourSet.tour.length;
            for(i = 0; i < len; i++) {
               tours.push(this.parseTourML(tourML.tourSet.tour[i]));
            }
        }

        return tours;
    },
    parseTourML: function(data) {
        // check to see if the tour has been updated
        var tour = TapAPI.tours.get(data.id);
        if (tour && Date.parse(data.lastModified) <= Date.parse(tour.get('lastModified'))) return tour;

        var stops = [],
            assets = [];

        // create new tour
        tour = new TapAPI.classes.models.TourModel({
            id: data.id,
            appResource: data.tourMetadata && data.tourMetadata.appResource ? TapAPI.helper.objectToArray(data.tourMetadata.appResource) : undefined,
            connection: data.connection ? TapAPI.helper.objectToArray(data.connection) : undefined,
            description: data.tourMetadata && data.tourMetadata.description ? TapAPI.helper.objectToArray(data.tourMetadata.description) : undefined,
            lastModified: data.tourMetadata && data.tourMetadata.lastModified ? data.tourMetadata.lastModified : undefined,
            propertySet: data.tourMetadata && data.tourMetadata.propertySet ? TapAPI.helper.objectToArray(data.tourMetadata.propertySet.property) : undefined,
            publishDate: data.tourMetadata && data.tourMetadata.publishDate ? TapAPI.helper.objectToArray(data.tourMetadata.publishDate) : undefined,
            rootStopRef: data.tourMetadata && data.tourMetadata.rootStopRef ? data.tourMetadata.rootStopRef : undefined,
            title: data.tourMetadata && data.tourMetadata.title ? TapAPI.helper.objectToArray(data.tourMetadata.title) : undefined
        });
        TapAPI.tours.create(tour);

        // create new instance of StopCollection
        var stopCollection = new TapAPI.classes.collections.StopCollection(null, data.id);
        // create new instance of AssetCollection
        var assetCollection = new TapAPI.classes.collections.AssetCollection(null, data.id);

        var i, j;
        // load tour models
        var connectionData = TapAPI.helper.objectToArray(data.connection);
        data.stop = TapAPI.helper.objectToArray(data.stop);
        var numStops = data.stop.length;
        for (i = 0; i < numStops; i++) {
            var stop,
                connections = [];

            if(!_.isUndefined(data.connection)) {
                for(j = 0; j < connectionData.length; j++) {
                    if(connectionData[j].srcId == data.stop[i].id) {
                        connections.push({priority: connectionData[j].priority, destId: connectionData[j].destId});
                    }
                }
            }

            stop = new TapAPI.classes.models.StopModel({
                id: data.stop[i].id,
                connection: connections,
                view: data.stop[i].view,
                description: TapAPI.helper.objectToArray(data.stop[i].description),
                propertySet: data.stop[i].propertySet ? TapAPI.helper.objectToArray(data.stop[i].propertySet.property) : undefined,
                assetRef: TapAPI.helper.objectToArray(data.stop[i].assetRef),
                title: TapAPI.helper.objectToArray(data.stop[i].title),
                tour: data.id
            });
            stopCollection.create(stop);
            stops.push(stop);
        }

        // load asset models
        data.asset = TapAPI.helper.objectToArray(data.asset);
        var numAssets = data.asset.length;
        for (i = 0; i < numAssets; i++) {
            var asset;

            // modifiy source propertySet child to match similar elements
            if(data.asset[i].source) {
                data.asset[i].source = TapAPI.helper.objectToArray(data.asset[i].source);
                var numSources = data.asset[i].source.length;
                for (j = 0; j < numSources; j++) {
                    if(data.asset[i].source[j].propertySet) {
                        data.asset[i].source[j].propertySet = TapAPI.helper.objectToArray(data.asset[i].source[j].propertySet.property);
                    }
                }
            }
            if(data.asset[i].content) {
                data.asset[i].content = TapAPI.helper.objectToArray(data.asset[i].content);
                var numContent = data.asset[i].content.length;
                for (j = 0; j < numContent; j++) {
                    if(data.asset[i].content[j].propertySet) {
                        data.asset[i].content[j].propertySet = TapAPI.helper.objectToArray(data.asset[i].content[j].propertySet.property);
                    }
                }
            }

            asset = new TapAPI.classes.models.AssetModel({
                assetRights: TapAPI.helper.objectToArray(data.asset[i].assetRights),
                content: data.asset[i].content,
                id: data.asset[i].id,
                source: data.asset[i].source,
                propertySet: data.asset[i].propertySet ? TapAPI.helper.objectToArray(data.asset[i].propertySet.property) : undefined,
                type: data.asset[i].type
            });
            assetCollection.create(asset);
            assets.push(asset);
        }

        // clear out the temporary models
        stopCollection.reset();
        assetCollection.reset();

        // attempt to fetch existing models.
        stopCollection.fetch();
        assetCollection.fetch();

        // create/update new stops and assets
        stopCollection.set(stops);
        assetCollection.set(assets);

        // clear out the temporary models
        stopCollection.reset();
        assetCollection.reset();

        return tour;
    }
};
// Check for geolocation support
if (!navigator.geolocation) return;

TapAPI.geoLocation = {
    latestLocation: null,
    watch: null,
    nearestStop: null,

    locate: function() {
        var that = this;
        navigator.geolocation.getCurrentPosition(
            function(position) {
                that.locationReceived(position);
            },
            that.locationError, {
                enableHighAccuracy: true
            }
        );
    },

    locationReceived: function(position) {
        this.latestLocation = position;
        this.computeStopDistance(position);
        Backbone.trigger('geolocation.location.recieved', position);
    },

    locationError: function(error) {
        console.log('locationError', error);
    },

    // Parse the current stop locations. Should be triggered when a new tour is selected.
    parseCurrentStopLocations: function() {
        _.each(TapAPI.tourStops.models, function(stop) {
            if (stop.get('location') === undefined) {
                var geoAssets = stop.getAssetsByUsage('geo');
                if (geoAssets) {
                    // Parse the contents of the asset
                    var content = geoAssets[0].get('content');
                    if (content === undefined) return;
                    var data = $.parseJSON(content.at(0).get('data'));

                    if (data.type == 'Point') {
                        stop.set('location', new L.LatLng(data.coordinates[1], data.coordinates[0]));
                    }
                }
            }
        });
    },

    computeStopDistance: function(position) {
        var latlong = new L.LatLng(position.coords.latitude, position.coords.longitude);
        var nearest = null;

        _.each(TapAPI.tourStops.models, function(stop) {
            var stopLocation = stop.get('location');
            if (!_.isUndefined(stopLocation)) {
                var d = latlong.distanceTo(stopLocation);
                stop.set('distance', d);
                if (_.isNull(nearest) || d < nearest.get('distance')) {
                    nearest = stop;
                }
            }
        });

        if (nearest !== null) {
            if (this.nearestStop === null) {
                this.nearestStop = nearest;
            } else if (this.nearestStop != nearest) {
                // update
                this.nearestStop.set('nearest', false);
            }
            nearest.set('nearest', true);
        }
    },

    startLocating: function(delay) {
        var that = this;
        this.watch = navigator.geolocation.watchPosition(
            function(position) {
                that.locationReceived(position);
            },
            that.locationError, {
                enableHighAccuracy: true
            }
        );
    },

    stopLocating: function() {
        navigator.geolocation.clearWatch(this.watch);

        if (this.nearestStop !== null) {
            this.nearestStop.set('nearest', false);
            this.nearestStop = null;
        }
    },

    formatDistance: function(d) {
        if (d === undefined) return '';

        if (TapAPI.geo.units == 'si') {
            if (d < 100) {
                return parseInt(d, 10) + ' m';
            } else if (d < 10000) {
                return (d / 1000).toFixed(2) + ' km';
            } else {
                return parseInt(d/1000, 10) + ' km';
            }
        } else {
            // Assume it's English
            var feet = 3.28084 * d;
            if (feet > 52800) { // > 10 miles
                return parseInt(feet / 5280, 10) + ' mi';
            } if (feet > 528) { // > .1 miles
                return (feet / 5280).toFixed(2) + ' mi';
            } else {
                return parseInt(feet, 10) + ' ft';
            }
        }
    }
};
TapAPI.templates['audio'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<h3 class="stop-title">' +
((__t = ( title )) == null ? '' : __t) +
'</h3>\n<audio id="audio-player" class="player" controls="controls">\n\t<p>Your browser does not support HTML 5 audio.</p>\n\t';
 _.each(sources, function(source) { ;
__p += '\n\t' +
((__t = ( source )) == null ? '' : __t) +
'\n\t';
 }); ;
__p += '\n</audio>\n';
 if (!_.isEmpty(imagePath)) { ;
__p += '\n\t<img class="poster-image" src="' +
((__t = ( imagePath )) == null ? '' : __t) +
'" />\n';
 } ;
__p += '\n';
 if (!_.isEmpty(description)) { ;
__p += '\n<div class="description" data-role="collapsible" data-content-theme="c">\n\t<h3>Description</h3>\n\t' +
((__t = ( description )) == null ? '' : __t) +
'\n</div>\n';
 } ;
__p += '\n';
 if (!_.isEmpty(transcription)) { ;
__p += '\n<div id="transcription" data-role="collapsible" data-content-theme="c">\n\t<h3>Transcript</h3>\n\t<p>' +
((__t = ( transcription )) == null ? '' : __t) +
'</p>\n</div>\n';
 } ;


}
return __p
};

TapAPI.templates['footer'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<div data-role="navbar" data-iconpos="top">\n\t<ul>\n        ';
 for(var view in controllers) { ;
__p += '\n\t\t<li>\n            <a href="#tour/' +
((__t = ( tourID )) == null ? '' : __t) +
'/controller/' +
((__t = ( view )) == null ? '' : __t) +
'"\n            data-icon="' +
((__t = ( view.toLowerCase() )) == null ? '' : __t) +
'"\n            data-iconshadow="true"\n            class="' +
((__t = ( view === activeToolbarButton ? 'ui-btn-active' : '' )) == null ? '' : __t) +
'">' +
((__t = ( controllers[view].label )) == null ? '' : __t) +
'</a>\n        </li>\n        ';
 }; ;
__p += '\n\t</ul>\n</div>';

}
return __p
};

TapAPI.templates['header'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {

 if (displayBackButton) { ;
__p += '\n<a href="#" id="back-button" data-role="back" data-icon="arrow-l">Back</a>\n';
 } ;
__p += '\n<h3>' +
((__t = ( title )) == null ? '' : __t) +
'</h3>\n';
 if (displaySocialButton) { ;
__p += '\n<a href="#" id="social-button" data-role="button" data-icon="social" \ndata-iconpos="notext" data-iconshadow="false" class="ui-icon-nodisc ui-btn-right">Social</a>\n';
 } ;


}
return __p
};

TapAPI.templates['image-stop'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<h3 class="stop-title">' +
((__t = ( title )) == null ? '' : __t) +
'</h3>\n';
 _.each(images, function(image) { ;
__p += '\n\t<li>\n\t\t<a href="' +
((__t = ( image.originalUri )) == null ? '' : __t) +
'" rel="external">\n\t\t\t<img src="' +
((__t = ( image.thumbnailUri )) == null ? '' : __t) +
'" data-caption="' +
((__t = ( image.caption )) == null ? '' : __t) +
'" title="' +
((__t = ( image.title )) == null ? '' : __t) +
'" />\n\t\t</a>\n\t</li>\n';
 }) ;


}
return __p
};

TapAPI.templates['keypad'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __d = obj.obj || obj;
__p += '<fieldset class="ui-grid-b">\n    <div id="code-label-wrapper" class="ui-block-a ui-block-b ui-block-c">\n        <div id="code-label-border">\n            <div id="code-label"></div>\n        </div>\n    </div>\n    <div class="ui-block-a">\n        <div data-role="button" data-theme="a" class="keypad-button">1</div>\n    </div>\n    <div class="ui-block-b">\n        <div data-role="button" data-theme="a" class="keypad-button">2</div>\n    </div>\n    <div class="ui-block-c">\n        <div data-role="button" data-theme="a" class="keypad-button">3</div>\n    </div>\n    <div class="ui-block-a">\n        <div data-role="button" data-theme="a" class="keypad-button">4</div>\n    </div>\n    <div class="ui-block-b">\n        <div data-role="button" data-theme="a" class="keypad-button">5</div>\n    </div>\n    <div class="ui-block-c">\n        <div data-role="button" data-theme="a" class="keypad-button">6</div>\n    </div>\n    <div class="ui-block-a">\n        <div data-role="button" data-theme="a" class="keypad-button">7</div>\n    </div>\n    <div class="ui-block-b">\n        <div data-role="button" data-theme="a" class="keypad-button">8</div>\n    </div>\n    <div class="ui-block-c">\n        <div data-role="button" data-theme="a" class="keypad-button">9</div>\n    </div>\n    <div class="ui-block-a" id="clear-button-wrapper">\n        <div id="clear-button" data-role="button" data-theme="b" class="action-button">Clear</div>\n    </div>\n    <div class="ui-block-b">\n        <div data-role="button" data-theme="a" class="keypad-button">0</div>\n    </div>\n    <div class="ui-block-c">\n        <div id="go-button" data-role="button" data-theme="b" class="action-button ui-disabled">Go</div>\n    </div>\n</fieldset>\n';
return __p
};

TapAPI.templates['map-distance-label'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __d = obj.obj || obj;
__p += '<div class="distance-label-container">\n    <div class="distance-label">' +
((__t = ( obj.distance )) == null ? '' : __t) +
'</div>\n</div>';
return __p
};

TapAPI.templates['map-marker-bubble'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<div class="marker-bubble-content">\n    <a href="#tour/' +
((__t = ( tourID )) == null ? '' : __t) +
'/stop/' +
((__t = ( stopID )) == null ? '' : __t) +
'" class="goto-stop ui-btn ui-shadow ui-btn-corner-all ui-btn-inline ui-btn-icon-notext ui-btn-up-c">\n        <span class="ui-btn-inner">\n            <span class="ui-btn-text">View Stop</span>\n            <span class="ui-icon ui-icon-arrow-r ui-icon-shadow">&nbsp;</span>\n        </span>\n    </a>\n\t<div class="title"><a href="#tour/' +
((__t = ( tourID )) == null ? '' : __t) +
'/stop/' +
((__t = ( stopID )) == null ? '' : __t) +
'">' +
((__t = ( title )) == null ? '' : __t) +
'</a></div>\n\t<div class="distance">\n        ' +
((__t = ( distance )) == null ? '' : __t) +
' \n        ';
 if (showDirections) { ;
__p += '\n        <a href="http://maps.google.com/maps?saddr=Current%20Location&daddr=' +
((__t = ( stopLat )) == null ? '' : __t) +
',' +
((__t = ( stopLong )) == null ? '' : __t) +
'">Get Directions</a>\n        ';
 } ;
__p += '\n    </div>\n</div>';

}
return __p
};

TapAPI.templates['page'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<div data-role="header" data-id="tap-header" data-position="fixed">\n\t<a id=\'back-button\' data-rel="back" data-mini="true">' +
((__t = ( back_label )) == null ? '' : __t) +
'</a>\n\t';
 if (header_nav) { ;
__p += '\n\t<div id=\'index-selector\' data-role="controlgroup" data-type="horizontal" data-mini="true">\n\t\t';
 _.each(nav_menu, function(item) { ;
__p += '\n\t\t<a data-role="button" ' +
((__t = ( (active_index == item.endpoint) ? 'data-theme="b"' : "" )) == null ? '' : __t) +
' href=\'#' +
((__t = ( item.endpoint )) == null ? '' : __t) +
'/' +
((__t = ( tour_id )) == null ? '' : __t) +
'\'>' +
((__t = ( item.label )) == null ? '' : __t) +
'</a>\n\t\t';
 }); ;
__p += '\n\t</div>\n\t';
 } else { ;
__p += '\n\t<h1 id="page-title">' +
((__t = ( title )) == null ? '' : __t) +
'</h1>\n\t';
 } ;
__p += '\n</div>\n<div data-role="content">\n</div>\n';
 if (footer_nav) { ;
__p += '\n<div data-role="footer" data-id="tap-footer" data-position="fixed">\n\t<div data-role="navbar">\n\t\t<ul>\n\t\t\t';
 _.each(nav_menu, function(item) { ;
__p += '\n\t\t\t<li><a ' +
((__t = ( (active_index == item.endpoint) ? 'data-theme="b"' : "" )) == null ? '' : __t) +
' href=\'#' +
((__t = ( item.endpoint )) == null ? '' : __t) +
'/' +
((__t = ( tour_id )) == null ? '' : __t) +
'\'>' +
((__t = ( item.label )) == null ? '' : __t) +
'</a></li>\n\t\t\t';
 }); ;
__p += '\n\t\t</ul>\n\t</div>\n</div>\n';
 } ;


}
return __p
};

TapAPI.templates['popup'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {

 if (!_.isEmpty(title)) { ;
__p += '\n<div data-role="header" data-theme="a" role="banner">\n\t<h1 role="heading">' +
((__t = ( title )) == null ? '' : __t) +
'</h1>\n</div>\n';
 } ;
__p += '\n<div data-role="content" data-theme="d" role="main">\n\t<p>' +
((__t = ( message )) == null ? '' : __t) +
'</p>\n\t<a href="#" id="dialog-cancel" data-role="button" data-theme="c"\n\t\tdata-corners="true" data-shadow="true" data-iconshadow="true" data-wrapperels="span">' +
((__t = ( cancelButtonTitle )) == null ? '' : __t) +
'</a>\n</div>';

}
return __p
};

TapAPI.templates['social-popup'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __d = obj.obj || obj;
__p += '<a href="#" data-rel="back" data-role="button" data-theme="a" data-icon="delete" data-iconpos="notext" class="ui-btn-right">Close</a>\n<div data-role="header" data-theme="a" class="ui-corner-top">\n    <h1>Share TAP</h1>\n</div>\n<div data-role="content" data-theme="d" role="main">\n    <div id="twitter-share-button" class="share-button">\n        <iframe allowtransparency="true" frameborder="0" scrolling="no"\n                src="http://platform.twitter.com/widgets/tweet_button.html?url=' +
((__t = ( obj.url )) == null ? '' : __t) +
'"\n                style="width:100px; height:20px;"></iframe>\n    </div>\n    <div id="facebook-share-button" class="share-button">\n        <iframe src="http://www.facebook.com/plugins/like.php?href=' +
((__t = ( obj.url )) == null ? '' : __t) +
'&amp;send=false&amp;layout=button_count&amp;width=100&amp;show_faces=false&amp;font=arial&amp;colorscheme=light&amp;action=like&amp;height=21&amp;appId=' +
((__t = ( obj.FBAppID )) == null ? '' : __t) +
'" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:100px; height:21px;" allowTransparency="true"></iframe>\n    </div>\n</div>\n';
return __p
};

TapAPI.templates['stop-group'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {

 if (!_.isUndefined(header)) { ;
__p += '\n<div id="header-wrapper">\n    <img src="' +
((__t = ( header )) == null ? '' : __t) +
'" />\n</div>\n';
 } ;
__p += '\n<h3 class="stop-title">' +
((__t = ( title )) == null ? '' : __t) +
'</h3>\n<div class=\'description\'>' +
((__t = ( description )) == null ? '' : __t) +
'</div>\n<ul id="stop-list" data-role="listview" data-inset="true">\n';
 _.each(stops, function(stop) { ;
__p += '\n    <li>\n        <a href="#tour/' +
((__t = ( tourID )) == null ? '' : __t) +
'/stop/' +
((__t = ( stop.id )) == null ? '' : __t) +
'">\n            <img src="' +
((__t = ( stop.icon )) == null ? '' : __t) +
'" class="ui-li-icon ui-li-thumb" />\n            ' +
((__t = ( stop.title )) == null ? '' : __t) +
'\n        </a>\n    </li>\n';
 }); ;
__p += '\n</ul>';

}
return __p
};

TapAPI.templates['stop-list'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<ul  data-role="listview" data-filter="true">\n    ';
 _.each(stops, function(stop) { ;
__p += '\n    <li>\n        <a href=\'#tour/' +
((__t = ( tourID )) == null ? '' : __t) +
'/stop/' +
((__t = ( stop.get('id') )) == null ? '' : __t) +
'\'>\n            ';
 if (displayCodes && stop.getProperty('code')) { ;
__p += '\n            <span class="stop-code">' +
((__t = ( stop.getProperty('code') )) == null ? '' : __t) +
'</span>\n            <span class="title-with-code">\n            ';
 } else { ;
__p += '\n            <img src="' +
((__t = ( stop.get('icon') )) == null ? '' : __t) +
'" class="ui-li-icon ui-li-thumb" />\n            <span>\n            ';
 } ;
__p += '\n                ' +
((__t = ( stop.get('title') )) == null ? '' : __t) +
'\n            </span>\n        </a>\n    </li>\n    ';
 }); ;
__p += '\n</ul>';

}
return __p
};

TapAPI.templates['tour-details'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {

 if (!_.isUndefined(header)) { ;
__p += '\n<div id="header-wrapper">\n    <img src="' +
((__t = ( header )) == null ? '' : __t) +
'" />\n</div>\n';
 } ;
__p += '\n<h3 class="tour-title">' +
((__t = ( title )) == null ? '' : __t) +
'</h3>\n<p>' +
((__t = ( description )) == null ? '' : __t) +
'</p>\n<a href="' +
((__t = ( defaultStopSelectionView )) == null ? '' : __t) +
'" id="start-tour" data-role="button" data-theme="b">Start Tour</a>';

}
return __p
};

TapAPI.templates['tour-list'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<ul id="tour-list" class="ui-listview" data-split-icon="info" data-split-theme="d" data-role="listview">\n\t';
 _.each(tours, function(tour, i) { ;
__p += '\n\t<li data-icon="false">\n\t\t<a href="#" data-tour-id="' +
((__t = ( tour.get('id') )) == null ? '' : __t) +
'" class="tour-info">\n\t\t\t<div class="tour-wrapper">\n\t\t\t\t';
 if (headers[i] !== undefined) { ;
__p += '\n\t\t\t\t<div class="tour-image"><img src="' +
((__t = ( headers[i] )) == null ? '' : __t) +
'" /></div>\n\t\t\t\t';
 } ;
__p += '\n\t\t\t\t<div class="tour-title"><span>' +
((__t = ( tour.get('title') )) == null ? '' : __t) +
'</span></div>\n\t\t\t</div>\n\t\t</a>\n\t</li>\n\t';
 }); ;
__p += '\n</ul>';

}
return __p
};

TapAPI.templates['video'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<h3 class="stop-title">' +
((__t = ( title )) == null ? '' : __t) +
'</h3>\n<video id="video-player" class="player" controls="controls" autoplay="autoplay" poster="' +
((__t = ( imagePath )) == null ? '' : __t) +
'">\n\t<p>Your browser does not support the HTML5 video</p>\n\t';
 _.each(sources, function(source) { ;
__p += '\n\t' +
((__t = ( source )) == null ? '' : __t) +
'\n\t';
 }); ;
__p += '\n</video>\n';
 if (!_.isEmpty(description)) { ;
__p += '\n<div id="description" data-role="collapsible" data-content-theme="c">\n\t<h3>Description</h3>\n\t<p>' +
((__t = ( description )) == null ? '' : __t) +
'</p>\n';
 } ;
__p += '\n';
 if (!_.isEmpty(transcription)) { ;
__p += '\n<div id="transcription" data-role="collapsible" data-content-theme="c">\n\t<h3>Transcript</h3>\n\t<p>' +
((__t = ( transcription )) == null ? '' : __t) +
'</p>\n';
 } ;


}
return __p
};

TapAPI.templates['web'] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __d = obj.obj || obj;
__p += '<h3 class="stop-title">' +
((__t = ( obj.title )) == null ? '' : __t) +
'</h3>\n<div id="html-container">' +
((__t = ( obj.html )) == null ? '' : __t) +
'</div>';
return __p
}
/*
 * Backbone Model for storing a TourML Asset
 */
TapAPI.classes.models.AssetModel = Backbone.Model.extend({
    parse: function(response) {
        response.propertySet = new TapAPI.classes.collections.PropertySetCollection(
            response.propertySet,
            {id: response.id}
        );

        if (response.source) {
            response.source = new TapAPI.classes.collections.SourceCollection(
                response.source,
                {
                    id: response.id,
                    asset: this
                }
            );
        }

        if (response.content) {
            response.content = new TapAPI.classes.collections.ContentCollection(
                response.content,
                {
                    id: response.id,
                    asset: this
                }
            );
        }

        return response;
    },
    getSourcesByPart: function(part) {
        if (_.isUndefined(this.get('source'))) return undefined;

        var sources, models;
        sources = this.get('source').where({"part": part, "lang": TapAPI.language});
        if (sources.length === 0) {
            sources = this.get('source').where({"part": part});
        }
        if (sources.length) {
            models = sources;
        }
        return models;
    },
    getContentsByPart: function(part) {
        if (_.isUndefined(this.get('content'))) return undefined;

        var contents, models;
        contents = this.get('content').where({"part": part, "lang": TapAPI.language});
        if (contents.length === 0) {
            contents = this.get('content').where({"part": part});
        }
        if (contents.length) {
            models = contents;
        }
        return models;
    },
    getSourcesByFormat: function(format) {
        if (_.isUndefined(this.get('source'))) return undefined;

        var sources, models;
        sources = this.get('source').where({"format": format, "lang": TapAPI.language});
        if (sources.length === 0) {
            sources = this.get('source').where({"format": format});
        }
        if (sources.length) {
            models = sources;
        }
        return models;
    },
    getContentsByFormat: function(format) {
        if (_.isUndefined(this.get('content'))) return undefined;

        var contents, models;
        contents = this.get('content').where({"format": format, "lang": TapAPI.language});
        if (contents.length === 0) {
            contents = this.get('content').where({"format": format});
        }
        if (contents.length) {
            models = contents;
        }
        return models;
    }
});
/*
 * Base Model Class for Analytics
 */
TapAPI.classes.models.BaseAnalyticsModel = Backbone.Model.extend({
    defaults: {
        'trackerId': null,
        'timer': {}
    },

    initialize: function() {

    },

    trackPageView: function(pagePath, pageTitle) {

    },

    trackEvent: function(category, action, label, value) {

    },

    createTimer: function(category, variable, optLabel) {
        this.set('timer', {
            category: category,
            variable: variable,
            label: optLabel ? optLabel : undefined,
            startTime: null,
            elapsed: 0,
            minThreshold: null,
            maxThreshold: null,
            minClamp: false,
            maxClamp: true
        });
        return this;
    },

    setTimerOption: function(key, value) {
        var timer = this.get('timer');
        timer[key] = value;
        this.set('timer', timer);
        return this;
    },

    startTimer: function() {
        var timer = this.get('timer');
        timer.startTime = new Date().getTime();
        this.set('timer', timer);
        return this;
    },

    stopTimer: function() {
        var timer = this.get('timer');
        if (timer.startTime !== null) {
            timer.elapsed = timer.elapsed + (new Date().getTime()) - timer.startTime;
            timer.startTime = null;
            this.set('timer', timer);
        }
        return this;
    },

    resetTimer: function() {
        var timer = this.get('timer');
        timer.elapsed = 0;
        this.set('timer', timer);
        return this;
    },

    trackTime: function() {
        this.stopTimer(); // update the timer

        var timer = this.get('timer');

        // If threshold criteria are not met, do not send
        if (((timer.minThreshold === null) || timer.minClamp || (timer.elapsed >= timer.minThreshold)) &&
        ((timer.maxThreshold === null) || timer.maxClamp || (timer.elapsed <= timer.maxThreshold))) {
            // At this point, we should clamp
            if ((timer.minThreshold !== null) && (timer.elapsed < timer.minThreshold)) timer.elapsed = timer.minThreshold;
            if ((timer.maxThreshold !== null) && (timer.elapsed > timer.maxThreshold)) timer.elapsed = timer.maxThreshold;

            if (_.isFunction(this.sendTimer)) {
                this.sendTimer();
            }
        }

        this.startTimer(); // keep the timer running

        return this;
    }
});
/*
 * Backbone Model for storing a TourML Asset content element
 */
TapAPI.classes.models.ContentModel = Backbone.Model.extend({
    initialize: function() {
        //parse never gets called due to this not being in localstorage as its own record
        this.set('propertySet', new TapAPI.classes.collections.PropertySetCollection(
            this.get('propertySet'),
            {id: this.id}
        ));

        if (this.get('data').value) {
            this.set('data', this.get('data').value);
        }
    },
    getAsset: function() {
        return this.collection.asset;
    },
    save: function() {
        this.collection.asset.save();
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
/*
 * Google Analytics Model Class
 */
TapAPI.classes.models.GAModel = TapAPI.classes.models.BaseAnalyticsModel.extend({
	initialize: function() {
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments);},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m);
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

        ga('create', this.get('trackerId'));
    },

    trackPageView: function(pagePath, pageTitle) {
        ga('send', 'pageview', pagePath, pageTitle);
    },

    trackEvent: function(category, action, label, value) {
        ga('send', 'event', category, action, label, value);
    },

    sendTimer: function() {
        var timer = this.get('timer');
        ga('send', 'timing', timer.category, timer.variable, timer.elapsed, timer.optLabel);
    }
});
/*
 * Backbone Model for storing a TourML Property
 */
TapAPI.classes.models.PropertyModel = Backbone.Model.extend({
    defaults: {
        'name': undefined,
        'value': undefined,
        'lang': undefined
    }
});
/*
 * Backbone model for storing a TourML Asset Source
 */
TapAPI.classes.models.SourceModel = Backbone.Model.extend({
    initialize: function() {
        //parse never gets called due to this not being in localstorage as its own record
        this.set('propertySet', new TapAPI.classes.collections.PropertySetCollection(
            this.get('propertySet'),
            {id: this.id}
        ));
    },
    getAsset: function() {
        return this.collection.asset;
    },
    save: function() {
        this.collection.asset.save();
    },
    defaults: {
        'lang': undefined,
        'propertySet': undefined,
        'uri': undefined,
        'format': undefined,
        'lastModified': undefined,
        'part': undefined
    }
});
/*
 * Backbone Model for storing a TourML Stop
 */
TapAPI.classes.models.StopModel = Backbone.Model.extend({
    get: function(attr) { // override get method
        if(!this.attributes[attr]) return this.attributes[attr];
        switch(attr) {  // retrieve attribute based on language
            case 'description':
            case 'title':
                if (this.attributes[attr].length === 0) return undefined;

                var value, property;

                property = _.find(this.attributes[attr], function(item) {
                    return item.lang === TapAPI.language;
                });

                if (!property && TapAPI.language !== TapAPI.defaultLanguage) {
                    property = _.find(this.attributes[attr], function(item) {
                        return item.lang === TapAPI.defaultLanguage;
                    });
                }

                if (!property) {
                    property = _.find(this.attributes[attr], function(item) {
                        return item.lang === undefined || item.lang === "";
                    });
                }

                if (property) {
                    value = property.value;
                }

                return value;
            default:
                return this.attributes[attr];
        }
    },
    parse: function(response) {
        response.propertySet = new TapAPI.classes.collections.PropertySetCollection(
            response.propertySet,
            {id: response.id}
        );

        return response;
    },
    /**
    * Retrieves all asset models for a stop
    * @return array An array of asset models
    */
    getAssets: function() {
        if(_.isUndefined(this.get('assetRef'))) return undefined;
        var assets = [];
        _.each(this.get('assetRef'), function(item) {
            assets.push(TapAPI.tourAssets.get(item.id));
        });
        return _.isEmpty(assets) ? undefined : assets;
    },
    /**
    * Retrieves an asset with a given usage
    * @param string usage The asset usage
    * @return mixed The asset model
    */
    getAssetsByUsage: function(usage) {
        if(_.isUndefined(this.get('assetRef'))) return undefined;
        var assets = [];
        _.each(this.get('assetRef'), function(item) {
            if(item['usage'] === usage) {
                assets.push(TapAPI.tourAssets.get(item.id));
            }
        });
        return _.isEmpty(assets) ? undefined : assets;
    },
    getAssetsByType: function(type) {
        if(_.isUndefined(this.get('assetRef'))) return undefined;
        if (!_.isArray(type)) {
            type = [type];
        }
        var assets = [];
        _.each(this.get('assetRef'), function(item) {
            var asset = TapAPI.tourAssets.get(item.id);
            if (_.indexOf(type, asset.get('type')) > -1) {
                assets.push(asset);
            }
        });
        return _.isEmpty(assets) ? undefined : assets;
    },
    /**
    * Retrieves a sorted array of connections
    * @return array The connection array ordered by priority in ascending order
    */
    getSortedConnections: function() {
        if(_.isUndefined(this.get('connections'))) return undefined;
        return _.sortBy(this.get('connection'), function(connection) {
            return parseInt(connection.priority, 10);
        });
    },
    getProperty: function(propertyName) {
        return this.get('propertySet').getValueByName(propertyName);
    }
});
/*
 * Backbone Model for storing a Tour
 */
TapAPI.classes.models.TourModel = Backbone.Model.extend({
    get: function(attr) { // override get method
        if(!this.attributes[attr]) return this.attributes[attr];
        switch(attr) {  // retrieve attribute based on language
            case 'description':
            case 'title':
                if (this.attributes[attr].length === 0) return undefined;

                var value, property;

                property = _.find(this.attributes[attr], function(item) {
                    return item.lang === TapAPI.language;
                });

                if (!property && TapAPI.language !== TapAPI.defaultLanguage) {
                    property = _.find(this.attributes[attr], function(item) {
                        return item.lang === TapAPI.defaultLanguage;
                    });
                }

                if (!property) {
                    property = _.find(this.attributes[attr], function(item) {
                        return item.lang === undefined || item.lang === "";
                    });
                }

                if (property) {
                    value = property.value;
                }

                return value;
            default:
                return this.attributes[attr];
        }
    },
    parse: function(response) {
        response.propertySet = new TapAPI.classes.collections.PropertySetCollection(
            response.propertySet,
            {id: response.id}
        );

        return response;
    },
    getAppResourceByUsage: function(usage) {
        var appResource;

        _.each(this.get('appResource'), function(resource) {
            if (!_.isUndefined(resource) && resource.usage === usage) {
                var asset = TapAPI.tourAssets.get(resource.id);
                var source = asset.get('source');
                if (!_.isUndefined(source)) {
                    appResource = source.at(0).get('uri');
                }
            }
        });

        return appResource;
    }
});
/*
 * Backbone Colleciton for managing assets for a tour
 */
TapAPI.classes.collections.AssetCollection = Backbone.Collection.extend({
    model: TapAPI.classes.models.AssetModel,
    initialize: function(models, id) {
        this.localStorage = new Backbone.LocalStorage(id + '-asset');
    }
});
/*
 * Backbone collection for managing TourML Asset Content
 */
TapAPI.classes.collections.ContentCollection = Backbone.Collection.extend({
    model: TapAPI.classes.models.ContentModel,
    initialize: function(models, options) {
        this.localStorage = new Backbone.LocalStorage(options.id + '-source');
        this.asset = options.asset;
    }
});
/*
 * Backbone Collection for managing TourML PropertySets
 */
TapAPI.classes.collections.PropertySetCollection = Backbone.Collection.extend({
    model: TapAPI.classes.models.PropertyModel,
    initialize: function(models, options) {
        this.localStorage = new Backbone.LocalStorage(options.id + '-propertyset');
    },
    getValueByName: function(propertyName) {
        var property, value;
        property = this.where({"name": propertyName, "lang": TapAPI.language});
        if (property.length === 0) {
            property = this.where({"name": propertyName});
        }
        if (property.length) {
            value = property[0].get('value');
        }
        return value;
    }
});
/*
 * Backbone collection for managing TourML Asset sources
 */
TapAPI.classes.collections.SourceCollection = Backbone.Collection.extend({
    model: TapAPI.classes.models.SourceModel,
    initialize: function(models, options) {
        this.localStorage = new Backbone.LocalStorage(options.id + '-source');
        this.asset = options.asset;
    }
});
/*
 * Backbone collection for managing Stops for a tour
 */
TapAPI.classes.collections.StopCollection = Backbone.Collection.extend({
    model: TapAPI.classes.models.StopModel,
    initialize: function(models, id) {
        this.localStorage = new Backbone.LocalStorage(id + '-stop');
    },
    // retrieve the stop id of a given key code
    getStopByKeycode: function(key) {
        for(var i = 0; i < this.models.length; i++) {
            var code = this.models[i].get('propertySet').where({'name':'code', 'value':key});
            if (code.length) {
                return this.models[i];
            }
        }
        return undefined;
    }
});
/*
 * Backbone colleciton for managing Tours
 */
TapAPI.classes.collections.TourCollection = Backbone.Collection.extend({
    model: TapAPI.classes.models.TourModel,
    localStorage: new Backbone.LocalStorage('tours'),
    syncTourML: function(url) {
        var tours = [],
            tourML, i, len;

        // populate the tour collection
        this.fetch();

        // load tourML
        tours = TapAPI.tourMLParser.process(url);

        this.set(tours);
    },
    selectTour: function(tourID) {
        if (TapAPI.currentTour == tourID) return;

        if (!TapAPI.tours.get(tourID)) {
            console.log('Unable to load tour.');
            return;
        }

        // set the current tour
        TapAPI.currentTour = tourID;

        // set root stop as the current stop if specified
        if(TapAPI.tours.get(tourID).get('rootStopRef')) {
            TapAPI.currentStop = TapAPI.tours.get(tourID).get('rootStopRef').id;
        }

        // create new instance of StopCollection
        TapAPI.tourStops = new TapAPI.classes.collections.StopCollection(null, tourID);
        // create new instance of AssetCollection
        TapAPI.tourAssets = new TapAPI.classes.collections.AssetCollection(null, tourID);

        // load data from local storage
        TapAPI.tourAssets.fetch();
        TapAPI.tourStops.fetch();

        Backbone.trigger('tap.tour.selected');
    }
});

/*
 * Backbone View for providing helper functions to all TAP Views
 * All STOP views in TAP should extend from this
 */
TapAPI.classes.views.BaseView = Backbone.View.extend({
	initialize: function() {
		this.title = '';
		this.displayHeader = true;
		this.displayFooter = true;
		this.displayBackButton = true;
	},
	render: function() {},
	finishedAddingContent: function() {},
	close: function() {
		this.removeAllChildViews();
		this.remove();
		this.unbind();
		this.undelegateEvents();
		if (this.onClose){
			this.onClose();
		}
	},
	removeAllChildViews : function() {
		if (this.childViews) {
			_.each(this.childViews, function(view) {
				this.childViews[i].close();
			});
		}
		return this;
	}
});
/*
 * Backbone view for Navigation Views to extend from
 * This is used to manage the state of the tab bar
 * All Navigation Views should extend from thie View
 */
TapAPI.classes.views.StopSelectionView = TapAPI.classes.views.BaseView.extend({
    initialize: function() {
        this._super('initialize');
        this.activeToolbarButton = '';
    }
});
/*
 * Backbone View for Initializing and Starting the TAP Web App
 */
TapAPI.classes.views.AppView = Backbone.View.extend({
    id: 'page-wrapper',
    initialize: function() {
        this.listenTo(Backbone, 'app.widgets.refresh', this.refreshWidgets);
    },
    render: function() {
        $(':jqmData(role="page")').append(this.el);
        // add navigation bar
        var headerView = new TapAPI.classes.views.HeaderView();
        this.$el.append(headerView.$el);

        // add content view
        var contentView = new TapAPI.classes.views.ContentView();
        this.$el.append(contentView.$el);

        // add footer bar
        var footerView = new TapAPI.classes.views.FooterView();
        this.$el.append(footerView.$el);

        // add dialog view
        var popupView = new TapAPI.classes.views.PopupView();
        this.$el.append(popupView.render().$el);

        if (TapAPI.social.enabled) {
            var socialPopupView = new TapAPI.classes.views.SocialPopupView();
            this.$el.append(socialPopupView.render().$el);
        }

        // trigger jquery mobile to initialize new widgets
        Backbone.trigger('app.widgets.refresh');
    },
    runApp: function() {
        Backbone.trigger('tap.app.loading');
        // get browser language
        var browserLanguage = (navigator.language) ? navigator.language : navigator.userLanguage;
        TapAPI.language = browserLanguage.split('-')[0];

        //Load up the Router
        TapAPI.router = new TapAPI.classes.routers.Primary();

        // initialize Analytics
        if (!_.isUndefined(TapAPI.classes.models[TapAPI.trackerClass])) {
            TapAPI.tracker = new TapAPI.classes.models[TapAPI.trackerClass]({
                trackerId: TapAPI.trackerID
            });
        }

        // create new instance of tour collection
        TapAPI.tours = new TapAPI.classes.collections.TourCollection();
        TapAPI.tours.syncTourML(TapAPI.tourMLEndpoint);

        // trigger tap init end event
        Backbone.trigger('tap.app.complete');

        this.render();

        // start backbone history collection
        Backbone.history.start();
    },
    refreshWidgets: function() {
        $(':jqmData(role="page")').page('destroy').page();
        $.mobile.resetActivePageHeight();
    }
});
/*
 * Backbone View for displaying an Audio Stop
 * Relies on the MediaElement Plugin
 */
TapAPI.classes.views.AudioStopView = TapAPI.classes.views.BaseView.extend({
    id: 'audio-stop',
    initialize: function() {
        this._super('initialize');

        TapAPI.tracker.createTimer('AudioStop', 'played_for', TapAPI.currentStop.id);
    },
    render: function() {
        // Find the transcription if one exists
        var transcription = '';
        var transcriptAsset = this.model.getAssetsByUsage('transcription');
        if (!_.isEmpty(transcriptAsset)) {
            transcription = transcriptAsset[0].get('content').at(0).get('data');
        }

        var description = this.model.get('description');

        // Find the poster image if one exists
        var posterImagePath = '';
        var posterImageAsset = this.model.getAssetsByUsage('image');
        if (!_.isEmpty(posterImageAsset)) {
            posterImagePath = posterImageAsset[0].get('source').at(0).get('uri');
        }

        var mediaAsset = this.model.getAssetsByType(['audio', 'video']);

        if (_.isEmpty(mediaAsset)) {
            console.log('No media found.');
            return this;
        }

        // Get media element sources and determine template
        var sources = [];
        var mediaTemplate = '';
        _.each(mediaAsset[0].get('source').models, function(source) {
            if (mediaTemplate === '') {
                if(source.get('format').indexOf('audio') >= 0) {
                    mediaTemplate = 'audio';
                } else {
                    mediaTemplate = 'video';
                }
            }
            sources.push('<source src="' + source.get('uri') + '" type="' + source.get('format') + '" />');
        });

        this.template = TapAPI.templateManager.get(mediaTemplate);

        // Render from the template
        this.$el.html(this.template({
            title: this.model.get('title'),
            transcription: transcription,
            imagePath: posterImagePath,
            sources: sources,
            description: description
        }));

        return this;
    },
    finishedAddingContent: function() {
        var that = this,
            mediaElement = $('.player')[0];

        // add event handlers for media player events
        mediaElement.addEventListener('loadedmetadata', function() {
            TapAPI.tracker.setTimerOption('maxThreshold', mediaElement.duration * 1000);
        });

        mediaElement.addEventListener('play', function() {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.trackEvent('AudioStop', 'media_started', label, null);
            TapAPI.tracker.startTimer();
        });

        mediaElement.addEventListener('pause', function() {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.stopTimer();
            var timer = TapAPI.tracker.get('timer');
            TapAPI.tracker.trackEvent('AudioStop', 'media_paused', label, timer.elapsed);
        });

        mediaElement.addEventListener('ended', function() {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.stopTimer();
            var timer = TapAPI.tracker.get('timer');
            TapAPI.tracker.trackEvent('AudioStop', 'media_ended', label, timer.elapsed);
        });

        // Add expand handler on the transcription toggle button
        this.$el.find('#transcription').on('expand', function(e, ui) {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.trackEvent('AudioStop', 'show_transcription', label, null);
        });

        this.player = new MediaElementPlayer('.player', {
            pluginPath: TapAPI.media.pluginPath,
            flashName: 'flashmediaelement.swf',
            silverlightName: 'silverlightmediaelement.xap'
        });
        this.player.play();
    },
    close: function() {
        // Send information about playback duration when the view closes
        TapAPI.tracker.trackTime();
    }
});
/*
 * Backbone view used to display content (stop views) between the header & footer
 */
TapAPI.classes.views.ContentView = TapAPI.classes.views.BaseView.extend({
    id: 'content-wrapper',
    attributes: {
        'data-role': 'content'
    },
    initialize: function() {
        this.currentView = undefined;
        this.listenTo(Backbone, 'tap.router.routed', this.render);
    },
    render: function(view) {
        if (view === undefined) return this;

        // cleanup previous view
        if (this.currentView !== undefined) {
            this.$el.removeClass(this.currentView.id);
            this.currentView.close();
        }
        // set current view
        this.currentView = view;
        // add the new view
        this.$el.addClass(view.id);
        this.$el.html(view.render().$el);
        view.finishedAddingContent();

        return this;
    }
});
/*
 * Backbone View for displaying the footer tab bar
 */
TapAPI.classes.views.FooterView = Backbone.View.extend({
    id: 'footer',
    attributes: {
        'data-role': 'footer',
        'data-position': 'fixed',
        'data-tap-toggle': 'false'
    },
    template: TapAPI.templateManager.get('footer'),
    events: {
        'click a': 'clickTrack'
    },
    initialize: function() {
        this.listenTo(Backbone, 'tap.router.routed', this.render);
    },
    render: function(view) {
        if (!_.isUndefined(TapAPI.currentTour) && view.displayFooter) {
            var controllers;
            if (!_.isUndefined(TapAPI.tourSettings[TapAPI.currentTour]) &&
                TapAPI.tourSettings[TapAPI.currentTour].enabledNavigationControllers) {
                controllers = _.pick(TapAPI.navigationControllers, TapAPI.tourSettings[TapAPI.currentTour].enabledNavigationControllers);
            } else {
                controllers = TapAPI.navigationControllers;
            }

            this.$el.show();
            this.$el.html(this.template({
                activeToolbarButton: view.activeToolbarButton,
                tourID: TapAPI.currentTour,
                controllers: controllers
            }));
        } else {
            this.$el.hide();
        }
        return this;
    },
    clickTrack: function(e) {
        var item = $(e.currentTarget).find("span.ui-btn-text").text();
        TapAPI.tracker.trackEvent('Navigation', 'tapped', item, null);
    }
});
/*
 * Backbone View for displaying the Header
 * Includes back navigation, title and social charing button
 */
TapAPI.classes.views.HeaderView = Backbone.View.extend({
    id: 'header',
    attributes: {
        'data-role': 'header',
        'data-position': 'fixed',
        'data-tap-toggle': 'false'
    },
    template: TapAPI.templateManager.get('header'),
    initialize: function() {
        this.listenTo(Backbone, 'tap.router.routed', this.render);
    },
    events: {
        'tap #back-button': 'navigateBack',
        'tap #social-button': 'displaySocialPopup'
    },
    render: function(view) {
        var title = view && !_.isEmpty(view.title) ? view.title : '';

        this.$el.html(this.template({
            displayBackButton: Backbone.history.getFragment() !== '' && !(view && !view.displayBackButton),
            title: title,
            displaySocialButton: TapAPI.social.enabled
        }));

        return this;
    },
    navigateBack: function(e) {
        e.preventDefault();

        TapAPI.tracker.trackEvent('Navigation', 'tapped', 'back', null);

        if (_.isNull(TapAPI.currentStop)) {
            Backbone.history.navigate('', {trigger: true});
        } else {
            window.history.back();
        }
    },
    displaySocialPopup: function(e) {
        e.preventDefault();
        Backbone.trigger('tap.socialPopup.dislay');
    }
});
/*
 * Backbone View for displaying an Image Stop
 * Relies on the PhotoSwipe jquery plugin
 */
TapAPI.classes.views.ImageStopView = TapAPI.classes.views.BaseView.extend({
    tagName: 'ul',
    id: 'gallery',
    className: 'ui-grid-b',
    template: TapAPI.templateManager.get('image-stop'),
    initialize: function() {
        this._super('initialize');
    },
    render: function() {
        var assetRefs = this.model.get('assetRef');

        if (_.isEmpty(assetRefs)) return this;

        var images = [];
        _.each(assetRefs, function(assetRef) {
            var asset = TapAPI.tourAssets.get(assetRef.id);

            if (assetRef.usage === 'image_asset') {
                var thumbnail = asset.getSourcesByPart('thumbnail');
                var image = asset.getSourcesByPart('image');
                var title = asset.getContentsByPart('title');
                var caption = asset.getContentsByPart('caption');

                var imageAsset = {
                    thumbnailUri: _.isEmpty(thumbnail) ? '' : thumbnail[0].get('uri'),
                    originalUri: _.isEmpty(image) ? '' : image[0].get('uri'),
                    title: _.isEmpty(title) ? '' : title[0].get('data'),
                    caption: _.isEmpty(caption) ? '' : caption[0].get('data')
                };
                images.push(imageAsset);
            }
        });

        this.$el.html(this.template({
            title: this.model.get('title'),
            images: images
        }));

        this.gallery = this.$el.find('a').photoSwipe({
            enableMouseWheel: false,
            enableKeyboard: true,
            doubleTapZoomLevel : 0,
            captionAndToolbarFlipPosition: false,
            captionAndToolbarShowEmptyCaptions: false,
            captionAndToolbarOpacity : 0.8,
            minUserZoom : 0.0,
            preventSlideshow : true,
            jQueryMobile : true,
            getImageCaption : function(el) {
                var caption = $(el).find("img").data("caption");
                var captionEl = document.createElement('div');
                $(captionEl).html(caption);
                return captionEl;
            }
        });
        return this;
    }
});
/*
 * Backbone View for displaying the KeyPad navigation
 */
TapAPI.classes.views.KeypadView = TapAPI.classes.views.StopSelectionView.extend({
    id: 'keypad',
    template: TapAPI.templateManager.get('keypad'),
    initialize: function() {
        this._super('initialize');
        this.title = 'Enter a Stop Code';
        this.activeToolbarButton = 'KeypadView';
        this.code = '';
    },
    events: {
        'tap #go-button' : 'submit',
        'tap .keypad-button' : 'inputKeyCode',
        'tap #clear-button' : 'clearKeyCode'
    },
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    submit: function() {
        this.code = this.$el.find('#code-label').html();
        TapAPI.tracker.trackEvent('Navigation', 'tapped', 'KeyPad-Go', this.code);

        var stop = TapAPI.tourStops.getStopByKeycode(this.code);
        if(_.isEmpty(stop)) {
            Backbone.trigger('tap.popup.dislay', {
                title: 'Stop Not Found',
                message: 'Stop not found for code \'' + this.code + '\'',
                cancelButtonTitle: 'OK'
            });

            this.$el.find('#code-label').html('');
            this.code = '';
            return false;
        } else {
            Backbone.history.navigate('tour/' + TapAPI.currentTour + '/stop/' + stop.get('id'), {trigger: true});
        }
    },
    inputKeyCode: function(e) {
        e.preventDefault();
        this.code += $(e.currentTarget).find('.ui-btn-text').html();

        if (this.code.length > 6) return;

        this.$el.find('#go-button').removeClass('ui-disabled');

        $('#code-label').html(this.code);
    },
    clearKeyCode: function() {
        TapAPI.tracker.trackEvent('Navigation', 'tapped', 'KeyPad-Clear', null);
        this.$el.find('#go-button').addClass('ui-disabled');
        this.$el.find('#code-label').html('');
        this.code = '';
    }
});
/*
 * Backbone View for displaying the Map navigation interface
 * Relies on leaflet
 */
TapAPI.classes.views.MapView = TapAPI.classes.views.StopSelectionView.extend({
    id: 'tour-map',
    initialize: function() {
        var that = this;

        this._super('initialize');

        this.title = '';
        this.activeToolbarButton = 'MapView';
        this.map = null;
        this.mapOptions = {
            'initialLat': null,
            'initialLong': null,
            'initialZoom': 2
        };
        this.stopMarkers = {};
        this.stopPopups = {};
        this.positionMarker = null;

        TapAPI.geoLocation.parseCurrentStopLocations();

        // Look to see if a location is defined for the tour to use as the initial map center
        var tour = TapAPI.tours.get(TapAPI.currentTour);
        _.each(tour.get('appResource'), function(resource) {
            // Make sure this is a geo asset reference
            if (!_.isUndefined(resource) && resource.usage === 'geo') {
                var asset = TapAPI.tourAssets.get(resource.id);
                var content = asset.get('content');
                if (!_.isUndefined(content)) {
                    var data = $.parseJSON(content.at(0).get('data'));
                    if (data.type === 'Point') {
                        this.mapOptions['initialLong'] = data.coordinates[0];
                        this.mapOptions['initialLat'] = data.coordinates[1];
                    }
                }
            }
        }, this);

        // Look to see if the initial map zoom level is set
        _.each(tour.get('propertySet').models, function(property) {
            if (property.get('name') == 'initial_map_zoom') {
                this.mapOptions['initialZoom'] = property.get('value');
            }
        }, this);

        $(':jqmData(role="page")').on('pageinit', {context: this}, this.resizeMapViewport);
        $(window).on('orientationchange resize', {context: this}, this.resizeMapViewport);
    },
    render: function() {
        return this;
    },
    finishedAddingContent: function() {
        // initialize geo location
        TapAPI.geoLocation.startLocating();

        // create map
        this.map = L.map('tour-map', {
            continuousWorld: true
        });
        // setup tile layer
        this.tileLayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/"">CC-BY-SA</a>',
            maxZoom: 18,
            minZoom: 4,
            detectRetina: true
        });
        // add tile layer to map
        this.map.addLayer(this.tileLayer);

        // Add the stop markers
        _.each(TapAPI.tourStops.models, this.plotTourStopMarker, this);

        // Determine the bounding region
        var stopBounds;
        _.each(this.stopMarkers, function(marker) {
            var l = marker.getLatLng(),
                stopBounds = new L.LatLngBounds(l, l);
            if (stopBounds === null) {
                stopBounds = new L.LatLngBounds(l, l);
            } else {
                stopBounds.extend(l);
            }
        });

        // Set the viewport based on settings
        if (_.isNull(this.mapOptions.initialLat) || _.isNull(this.mapOptions.initialLong)) {
            if (_.isUndefined(stopBounds)) {
                this.map.setView(L.latLng(0,0), this.mapOptions.initialZoom);
            } else {
                this.map.fitBounds(stopBounds);
            }
        } else {
            this.map.setView(new L.LatLng(this.mapOptions.initialLat, this.mapOptions.initialLong),
                this.mapOptions.initialZoom);
        }

        // At this point the stop markers should be added to the map
        // We can augment them with the distance labels
        _.each(TapAPI.tourStops.models, function(stop) {
            if (!_.isUndefined(stop.getAssetsByUsage('geo'))) {
                this.updateStopMarker(stop);
            }
        }, this);

        if (TapAPI.geoLocation.latestLocation !== null) {
            this.onLocationFound(TapAPI.geoLocation.latestLocation);
        }
        this.listenTo(Backbone, 'geolocation.location.recieved', this.onLocationFound);
    },
    generateBubbleContent: function(stop, formattedDistance) {
        if (formattedDistance === undefined) {
            if (stop.get('distance')) {
                formattedDistance = TapAPI.geoLocation.formatDistance(stop.get('distance'));
            }
        }
        if (TapAPI.navigationControllers.StopListView.filterBy === 'stopGroup') {
            // retrieve all stops that are stop groups
            this.stops = _.filter(TapAPI.tourStops.models, function(stop) {
                return stop.get('view') === 'stop_group';
            });
        } else {
            // retrieve all stops that have a code associated with it
            this.stops = _.filter(TapAPI.tourStops.models, function(stop) {
                return stop.get('propertySet').where({'name': 'code'}) !== undefined;
            });
        }
        var template = TapAPI.templateManager.get('map-marker-bubble');
        return template({
            title: stop.get('title'),
            tourID: stop.get('tour'),
            stopID: stop.get('id'),
            distance: (formattedDistance === undefined) ? '' : 'Distance: ' + formattedDistance,
            stopLat: stop.get('location').lat,
            stopLong: stop.get('location').lng,
            showDirections: TapAPI.navigationControllers.MapView.showDirections
        });
    },
    // Plot a single tour stop marker on the map
    // @note Assumes that the context is set to { stop: (StopModel), map_view: (MapView) }
    plotTourStopMarker: function(stop) {
        // Find the geo assets for this stop
        var geoAssets = stop.getAssetsByUsage('geo');
        if (_.isUndefined(geoAssets)) return;

        // Parse the contents of the first geo asset
        var content = geoAssets[0].get('content');
        if (_.isUndefined(content)) return;
        var data = $.parseJSON(content.at(0).get('data'));

        if (data.type == 'Point') {
            var stopIcon = L.icon({
                iconUrl: 'images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                iconRetinaUrl: 'images/marker-icon@2x.png',
                shadowUrl: 'images/marker-shadow.png',
                shadowSize: [41, 41],
                popupAnchor: [0, -100],
                className: 'stop-icon ' + stop.id
            });

            var markerLocation = new L.LatLng(data.coordinates[1], data.coordinates[0]);
            var marker = new L.Marker(markerLocation, {icon: stopIcon});

            var popup = new L.Popup({
                maxWidth: 300,
                minWidth: 200,
                closeButton: false
            });
            popup.setLatLng(markerLocation);
            popup.setContent(this.generateBubbleContent(stop));
            this.stopPopups[stop.id] = popup;

            //marker.bindPopup(popup);

            marker.stop_id = stop.id;
            marker.addEventListener('click', this.onMarkerSelected, this);

            this.stopMarkers[stop.id] = marker;
            this.map.addLayer(marker);

        }

        // Update the marker bubble when the distance to a stop changes
        stop.on('change:distance', this.updateStopMarker, this);
    },
    updateStopMarker: function(stop) {
        var formattedDistance;

        if (stop.get('distance')) {
            formattedDistance = TapAPI.geoLocation.formatDistance(stop.get('distance'));
        }

        this.stopPopups[stop.id].setContent(this.generateBubbleContent(stop), formattedDistance);
    },
    // When a marker is selected, show the popup
    // Assumes that the context is set to (MapView)
    onMarkerSelected: function(e) {
        TapAPI.tracker.trackEvent('Map', 'marker_tapped', e.target.stop_id, null);

        this.map.openPopup(this.stopPopups[e.target.stop_id]);

        $('.marker-bubble-content .directions a').on('click', function() {
            TapAPI.tracker.trackEvent('Map', 'get_directions', e.target.stop_id, null);
        });
    },
    onLocationFound: function(position) {
        var latlong = new L.LatLng(position.coords.latitude, position.coords.longitude);

        if (this.positionMarker === null) {
            var stopIcon = L.icon({
                iconUrl: 'images/marker-person.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                shadowUrl: 'images/marker-shadow.png',
                shadowSize: [41, 41],
                popupAnchor: [0, -22],
                className: 'stop-icon ' + stop.id
            });
            this.positionMarker = new L.Marker(latlong, {icon: stopIcon})
                .bindPopup('You are here',{
                closeButton: false
            });
            this.map.addLayer(this.positionMarker);

            this.positionMarker.addEventListener('click', function() {
                TapAPI.tracker.trackEvent('_trackEvent', 'Map', 'you_are_here_clicked', null);
            });
        } else {
            this.positionMarker.setLatLng(latlong);
        }
    },
    onLocationError: function(e) {
        console.log('onLocationError', e);
    },
    resizeMapViewport: function(e) {
        var footer, header, viewport;

        viewport = $('html').height();
        header = $('#header').outerHeight();
        footer = $('#footer').outerHeight();

        $('#content-wrapper').height(viewport - header - footer);

        if (e.data.context.map !== null) {
            e.data.context.map.invalidateSize();
        }
        window.scroll(0, 0);
    },
    onClose: function() {
        // stop location services
        TapAPI.geoLocation.stopLocating();

        // remove event handlers
        $(':jqmData(role="page")').off('pageinit', this.resizeMapViewport);
        $(window).off('orientationchange resize', this.resizeMapViewport);

        $('#content-wrapper').removeAttr('style');
    }
});
/*
 * Backbone View for displaying a jquery mobile pop-up
 */
TapAPI.classes.views.PopupView = Backbone.View.extend({
    id: 'popup-view',
    className: 'ui-corner-all',
    attributes: {
        'data-role': 'popup',
        'data-theme': 'a',
        'data-overlay-theme': 'a'
    },
    template: TapAPI.templateManager.get('popup'),
    initialize: function() {
        this.title = '';
        this.message = '';
        this.cancelButtonTitle = '';
        this.routeAfterClose = '';

        // add listener for requests to display dialogs
        this.listenTo(Backbone, 'tap.popup.dislay', this.displayDialog);
    },
    events: {
        'tap #dialog-cancel': 'closeDialog'
    },
    render: function() {
        this.$el.html(this.template({
            title: this.title,
            message: this.message,
            cancelButtonTitle: this.cancelButtonTitle
        }));

        return this;
    },
    displayDialog: function(args) {
        // set popup content
        this.title = args.title;
        this.message = args.message;
        this.cancelButtonTitle = args.cancelButtonTitle;
        this.routeAfterClose = args.routeAfterClose;

        // render the popup
        this.render();
        // intitialize jqmobile styles
        Backbone.trigger('app.widgets.refresh');
        // open up popup
        this.$el.popup('open');
        return false;
    },
    closeDialog: function(e) {
        e.preventDefault();

        this.title = '';
        this.message = '';
        this.cancelButtonTitle = '';

        this.$el.popup('close');

        if (this.routeAfterClose && this.routeAfterClose.length) {
            Backbone.history.navigate(this.routeAfterClose, {trigger: true});
        }
    }
});
/*
 * Backbone View for displaying social sharing features
 */
TapAPI.classes.views.SocialPopupView = Backbone.View.extend({
    id: 'social-popup',
    className: 'ui-corner-all',
    attributes: {
        'data-role': 'popup',
        'data-theme': 'a',
        'data-overlay-theme': 'a'
    },
    template: TapAPI.templateManager.get('social-popup'),
    initialize: function() {
        // add listener for requests to display poup
        this.listenTo(Backbone, 'tap.socialPopup.dislay', this.displayPopup);
    },
    render: function() {
        this.$el.html(this.template({
            FBAppID: TapAPI.social.facebook.appID,
            url: escape(document.URL)
        }));
        return this;
    },
    displayPopup: function() {
        // render the popup
        this.render();
        // intitialize jqmobile styles
        Backbone.trigger('app.widgets.refresh');
        // open popup
        this.$el.popup('open');

        return false;
    }
});
/*
 * Backbone View for displaying a Stop group
 */
TapAPI.classes.views.StopGroupView = TapAPI.classes.views.BaseView.extend({
    id: 'stop-group',
    template: TapAPI.templateManager.get('stop-group'),
    initialize: function() {
        this._super('initialize');
    },
    render: function() {
        var stops = [],
            header;
        var description = this.model.get('description');

        var headerAsset = this.model.getAssetsByUsage('header_image');
        if (!_.isUndefined(headerAsset)) {
            header = headerAsset[0].get('source').at(0).get('uri');
        }

        _.each(this.model.get('connection'), function(connection) {
            var stop = TapAPI.tourStops.get(connection.destId);
            if (stop) {
                stops.push({
                    id: stop.get('id'),
                    title: stop.get('title'),
                    icon: TapAPI.viewRegistry[stop.get('view')].icon
                });
            }
        });

        this.$el.html(this.template({
            header: header,
            title: this.model.get('title'),
            tourID: TapAPI.currentTour,
            description: _.isEmpty(description) ? '' : description,
            stops: stops
        }));

        return this;
    }
});
/*
 * Backbone View for displaying the Stop List Navigation
 */
TapAPI.classes.views.StopListView = TapAPI.classes.views.StopSelectionView.extend({
    id: 'tour-stop-list',
    template: TapAPI.templateManager.get('stop-list'),
    initialize: function() {
        this._super('initialize');
        this.title = 'Select a Stop';
        this.activeToolbarButton = 'StopListView';

        // apply filter
        if (TapAPI.navigationControllers.StopListView.filterBy === 'stopGroup') {
            // retrieve all stops that are stop groups
            this.stops = _.filter(TapAPI.tourStops.models, function(stop) {
                return stop.get('view') === 'stop_group';
            });
        } else {
            // retrieve all stops that have a code associated with it
            this.stops = _.filter(TapAPI.tourStops.models, function(stop) {
                return stop.get('propertySet').where({'name': 'code'}) !== undefined;
            });
        }

        // apply sorting
        if (TapAPI.navigationControllers.StopListView.sortBy === 'title') {
            // sort by title
            this.stops = _.sortBy(this.stops, function(stop) {
                return stop.get('title');
            });
        } else {
            // sort by their key code
            this.stops = _.sortBy(this.stops, function(stop) {
                return parseInt(stop.getProperty('code'), 10);
            });
        }

        _.each(this.stops, function(stop) {
            var stopConfig = TapAPI.viewRegistry[stop.get('view')];
            if (stopConfig) {
                stop.set('icon', stopConfig.icon);
            }
        }, this);
    },
    render: function() {
        this.$el.html(this.template({
            tourID: TapAPI.currentTour,
            stops: this.stops,
            displayCodes: TapAPI.navigationControllers.StopListView.displayCodes
        }));
        return this;
    }
});
/*
 * Backbone View for displaying a Tour Summary/Start screen
 */
TapAPI.classes.views.TourDetailsView = TapAPI.classes.views.BaseView.extend({
	id: 'tour-details',
	template: TapAPI.templateManager.get('tour-details'),
	initialize: function() {
		this._super('initialize');

		this.tour = TapAPI.tours.get(TapAPI.currentTour);

		this.displayFooter = false;
        this.displayBackButton = false;
        if (TapAPI.tours.length > 1) {
            this.displayBackButton = true;
        }
	},
	render: function() {
        var defaultRoute = TapAPI.router.getTourDefaultRoute(TapAPI.currentTour);

        var header = this.tour.getAppResourceByUsage('image');

		this.$el.html(this.template({
            title: this.tour.get('title'),
            header: header,
			defaultStopSelectionView: defaultRoute,
			tourID: this.tour.get('id'),
			description: this.tour.get('description') ? this.tour.get('description') : ''
		}));
		return this;
	}
});
/*
 * Backbone View for displaying a List of Available Tours
 */
TapAPI.classes.views.TourListView = TapAPI.classes.views.BaseView.extend({
	id: 'tour-list',
	template: TapAPI.templateManager.get('tour-list'),
	initialize: function() {
		this._super('initialize');
		this.title = 'Select a Tour';

		this.displayHeader = false;
		this.displayFooter = false;
	},
	events: {
		'tap .tour-info' : 'tourInfoPopup'
	},
	render: function() {
		var headers = [];
		TapAPI.tours.each(function(tour) {
			TapAPI.tours.selectTour(tour.get('id'));
			headers.push(tour.getAppResourceByUsage('image'));
		});

		this.$el.html(this.template({
			tours: TapAPI.tours.models,
			headers: headers
		}));
		return this;
	},
	tourInfoPopup: function(e) {
		e.preventDefault();

		var target = $(e.target).parents('a.tour-info').data('tour-id');
		var tour = TapAPI.tours.get(target);

		Backbone.trigger('tap.popup.dislay', {
            title: tour.get('title'),
            message: tour.get('description'),
            cancelButtonTitle: 'Start Tour',
            routeAfterClose: TapAPI.router.getTourDefaultRoute(tour.get('id'))
        });
	}
});
/*
 * Backbone View for displaying a Video Stop
 * Relies on the MediaElement plugin
 */
TapAPI.classes.views.VideoStopView = TapAPI.classes.views.BaseView.extend({
    id: 'video-stop',
    template: TapAPI.templateManager.get('video'),
    initialize: function() {
        this._super('initialize');

        this.mediaOptions = {
            defaultVideoWidth: '220',
            defaultVideoHeight: '200',
            flashName: mejs.MediaElementDefaults.flashName,
            silverlightName: mejs.MediaElementDefaults.flashName
        };

        TapAPI.tracker.createTimer('VideoStop', 'played_for', TapAPI.currentStop.id);
    },
    render: function() {
        // Find the transcription if one exists
        var transcription = '';
        var transcriptAsset = this.model.getAssetsByUsage('transcription');
        if (!_.isEmpty(transcriptAsset)) {
            transcription = transcriptAsset[0].get('content').at(0).get('data');
        }

        // Find the poster image if one exists
        var posterImagePath = '';
        var posterImageAsset = this.model.getAssetsByUsage('image');
        if (!_.isEmpty(posterImageAsset)) {
            posterImagePath = posterImageAsset[0].get('source').at(0).get('uri');
        }

        mediaAsset = this.model.getAssetsByType("video");
        if (_.isEmpty(mediaAsset)) {
            console.log('No media found.');
            return this;
        }

        var sources = [];
        _.each(mediaAsset[0].get("source").models, function(source) {
            sources.push('<source src="' + source.get('uri') + '" type="' + source.get('format') + '" />');
        });

        var description = this.model.get('description');

        // Render from the template
        this.$el.html(this.template({
            title: this.model.get('title'),
            transcription: transcription,
            imagePath: posterImagePath,
            sources: sources,
            description: description
        }));

        return this;
    },
    finishedAddingContent: function() {
        var that = this,
            mediaElement = $('.player').get(0);

        // add event handlers for media player events
        mediaElement.addEventListener('loadedmetadata', function() {
            TapAPI.tracker.setTimerOption('maxThreshold', mediaElement.duration * 1000);
        });

        mediaElement.addEventListener('play', function() {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.trackEvent('VideoStop', 'media_started', label, null);
            TapAPI.tracker.startTimer();
        });

        mediaElement.addEventListener('pause', function() {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.stopTimer();
            var timer = TapAPI.tracker.get('timer');
            TapAPI.tracker.trackEvent('VideoStop', 'media_paused', label, timer.elapsed);
        });

        mediaElement.addEventListener('ended', function() {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.stopTimer();
            var timer = TapAPI.tracker.get('timer');
            TapAPI.tracker.trackEvent('VideoStop', 'media_ended', label, timer.elapsed);
        });

        // Add click handler on the transcription toggle button
        this.$el.find('#transcription').on('expand', function(e, ui) {
            var label = _.isObject(TapAPI.currentStop) ? TapAPI.currentStop.get("title") : null;
            TapAPI.tracker.trackEvent('VideoStop', 'show_transcription', label, null);
        });

        that.player = new MediaElementPlayer('.player', {
            defaultVideoWidth: '220',
            defaultVideoHeight: '200',
            pluginPath: TapAPI.media.pluginPath,
            flashName: 'flashmediaelement.swf',
            silverlightName: 'silverlightmediaelement.xap',
            success: function (mediaElement, domObject, elems) {
                if (mediaElement.pluginType === 'youtube') {
                    $(elems.container).find('.mejs-poster').hide();
                }
            }
        });
        this.player.play();
    },
    onClose: function() {
        // Send information about playback duration when the view closes
        TapAPI.tracker.trackTime();
    }
});
/*
 * Backbone View for displaying a Web Stop (generic web content)
 */
TapAPI.classes.views.WebStopView = TapAPI.classes.views.BaseView.extend({
    id: 'web-stop',
    template: TapAPI.templateManager.get('web'),
    initialize: function() {
        this._super('initialize');
        this.title = this.model.get('title');
    },
    render: function() {
        var html = '';
        var htmlAsset = this.model.getAssetsByUsage('web_content');
        if (!_.isEmpty(htmlAsset)) {
            html = htmlAsset[0].get('content').at(0).get('data');
        }
        this.$el.html(this.template({
            title: this.model.get('title'),
            html: html
        }));
        return this;
    }
});
$(document).bind('mobileinit', function () {
    $.mobile.ajaxEnabled = false;
    $.mobile.linkBindingEnabled = false;
    $.mobile.hashListeningEnabled = false;
    $.mobile.pushStateEnabled = false;
});