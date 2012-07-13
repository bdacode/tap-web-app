// TapAPI Namespace Initialization //
if (typeof TapAPI === "undefined"){TapAPI = {};}
if (typeof TapAPI.templates === "undefined"){TapAPI.templates = {};}
// TapAPI Namespace Initialization //
TapAPI.templates['audio-stop'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div class=\'tour-stop audio\'>\n\t<div class=\'title\'>'+
( tourStopTitle )+
'</div>\n\t<audio id="audio-player" autoplay controls="controls">\n\t\t<p>Your browser does not support the audio element.</p>\n\t</audio>\t\n\t<video id="video-player" autoplay controls="controls" style=\'display:none;\'>\n\t\t<p>Your browser does not support the video element.</p>\n\t</video>\n</div>';
}
return __p;
}
TapAPI.templates['dialog'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div data-role="dialog" id="'+
( id )+
'">\n\t<div data-role="header" data-theme="d">\n\t\t<h1></h1>\n\t</div>\n\t<div data-role="content" data-theme="c" align="center">\n\t\t'+
( content )+
'\n\t</div>\n</div>';
}
return __p;
}
TapAPI.templates['image-stop'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div id="soloImage">\n\t<a href="'+
( tourImageUri )+
'"><img src="'+
( tourImageUri )+
'" alt="Image 01" class="primaryImg" /></a>\n\t<div class=\'title\'>'+
( tourStopTitle )+
'</div>\n</div>';
}
return __p;
}
TapAPI.templates['keypad'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<fieldset class="ui-grid-b" id="keypad" data-theme=\'d\'>\n\t<div class="ui-block-a" id="writeStyle">\n\t\t<div class="ui-bar" id="write"></div>\n\t</div>\n\t<div class="ui-block-b">\n\t\t<div class="ui-bar ui-bar-d" id="gobtn">Go</div>\t\n\t</div>\n\t<div class="ui-block-a"><button class="ui-bar ui-bar-d">1</button></div>\n\t<div class="ui-block-b"><button class="ui-bar ui-bar-d">2</button></div>\t \n\t<div class="ui-block-b"><button class="ui-bar ui-bar-d">3</button></div>  \n\t<div class="ui-block-a"><button class="ui-bar ui-bar-d">4</button></div>\n\t<div class="ui-block-b"><button class="ui-bar ui-bar-d">5</button></div>\t \n\t<div class="ui-block-b"><button class="ui-bar ui-bar-d">6</button></div>  \n\t<div class="ui-block-a"><button class="ui-bar ui-bar-d">7</button></div>\n\t<div class="ui-block-b"><button class="ui-bar ui-bar-d">8</button></div>\t \n\t<div class="ui-block-b"><button class="ui-bar ui-bar-d">9</button></div>  \n\t<div class="ui-block-a"><button class="ui-bar ui-bar-d">0</button></div>\n\t<div class="ui-block-b" id="clearStyle">\n\t\t<div class="ui-bar ui-bar-d" id="delete">Clear</div>\n\t</div>\n</fieldset>\n';
}
return __p;
}
TapAPI.templates['page'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div data-role="header">\n\t<a id=\'back-button\' data-rel="back">'+
( back_label )+
'</a>\n\t<h1 id="page-title">'+
( title )+
'</h1>\n</div>\n<div data-role="content">\n</div>\n<!--\n<div data-role="footer">\n</div>\n-->';
}
return __p;
}
TapAPI.templates['stop-group-list-item'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<a href="#tourstop/'+
( tourId )+
'/'+
( id )+
'">'+
( title )+
'</a>\n';
}
return __p;
}
TapAPI.templates['stop-group'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div class=\'tour-stop stop-group\' style="width:100%;">\n\t<div class=\'title\'>'+
( tourStopTitle )+
'</div>\n\t<div class=\'description\'>'+
( description )+
'</div>\n\t<ul id="stop-list" class="ui-listview" data-inset="true" data-role="listview"></ul>\n</div>\n';
}
return __p;
}
TapAPI.templates['stop'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div class=\'stop\' style="width:100%;">\n\t<div class=\'title\'>'+
( tourStopTitle )+
'</div>\n\t<div class=\'description\'>'+
( tourStopDescription )+
'</div>\n</div>\n';
}
return __p;
}
TapAPI.templates['tour-details'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div class="">\t\t\t\n\t<a href="#tourkeypad/'+
( tour_id )+
'" id="start-tour" data-role="button" data-theme="b">Start Tour</a>\n</div>\n<div class=\'tour-details\'>\n\t'+
( description )+
'\n</div>\n';
}
return __p;
}
TapAPI.templates['tour-list-item'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<a href="#tour/'+
( id )+
'">'+
( title )+
'</a>\n';
}
return __p;
}
TapAPI.templates['tour-list'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<ul id="tour-list" class="ui-listview" data-inset="true" data-role="listview"></ul>';
}
return __p;
}
TapAPI.templates['tour-map-marker-bubble'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div class=\'marker-bubble-content\'>\n\t<div class=\'title\'>'+
( title )+
'</div>\n\t<div class=\'distance\'>'+
( distance )+
'</div>\n\t<div class=\'view-button\'><a href=\'#tourstop/'+
( tour_id )+
'/'+
( stop_id )+
'\'>View stop</a></div>\n\t<div class=\'directions\'>Get Directions</div>\n</div>';
}
return __p;
}
TapAPI.templates['tour-map'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div id=\'tour-map\'>Unable to display the map</div>';
}
return __p;
}
TapAPI.templates['tour-stop-list-item'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<a href=\'#tourstop/'+
( tour_id )+
'/'+
( stop_id )+
'\'>'+
( title )+
'</a>';
}
return __p;
}
TapAPI.templates['tour-stop-list'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<ul id="tour-stop-list" class="ui-listview" data-inset="true" data-role="listview"></ul>';
}
return __p;
}
TapAPI.templates['video-stop'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<div class=\'tour-stop video\'>\n\t<div class=\'title\'>'+
( tourStopTitle )+
'</div>\n\t<video id="video-player" poster="assets/images/tapPoster.png" controls="controls" autoplay="autoplay">\n\t\t<p>Your browser does not support the video tag.</p>\n\t</video>\n</div>\n';
}
return __p;
}