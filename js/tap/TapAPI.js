define([
    'underscore',
    'config'
], function(_, Config) {
    var TapAPI = {
        tours: {},
        tourAssets: {},
        tourStops: {},
        language: 'en',
        currentStop: null,
        currentTour: '',
        templates: {},
        // User Configurable
        defaultLanguage: _.isUndefined(Config.defaultLanguage) ? 'en' : Config.defaultLanguage,
        tourMLEndpoint: _.isUndefined(Config.tourMLEndpoint) ? '' : Config.tourMLEndpoint,
        trackerID: _.isUndefined(Config.trackerID) ? '' : Config.trackerID,
        navigationControllers: {
            'StopListView': {
                label: 'Stop List',
                filterBy: 'stopGroup',
                sortBy: 'title'
            },
            'KeypadView': {
                label: 'Keypad',
                showDirections: false
            },
            'MapView': {
                label: 'Map'
            }
        },
        tourSettings: Config.tourSettings,
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
                view: 'WebView',
                icon: 'images/web.png'
            }
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

    // attempt to get user defined social configurations
    if (!_.isUndefined(Config.social)) {
        _.extend(TapAPI.social, Config.social);
    }

    // attempt to get user defined view registry
    if (!_.isUndefined(Config.viewRegistry)) {
        _.extend(TapAPI.viewRegistry, Config.viewRegistry);
    }

    // attempt to get user defiend navigation controllers
    if (!_.isUndefined(Config.navigationControllers)) {
        _.extend(TapAPI.navigationControllers, Config.navigationControllers);
    }

    return TapAPI;
});