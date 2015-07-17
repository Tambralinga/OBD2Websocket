$(function () {
    $('[data-toggle="tooltip"]').tooltip();
	
	
	
});


var map = new GMaps({
    div: '#map',
    zoom: 16,
    panControl: false,
    zoomControl: false,
    scaleControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    scrollwheel: false,
    draggable: false,
    lat: 47.785156,
    lng: -33.315629,
    styles: [{'featureType':'water','stylers':[{'visibility':'on'},{'color':'#acbcc9'}]},{'featureType':'landscape','stylers':[{'color':'#f2e5d4'}]},{'featureType':'road.highway','elementType':'geometry','stylers':[{'color':'#c5c6c6'}]},{'featureType':'road.arterial','elementType':'geometry','stylers':[{'color':'#e4d7c6'}]},{'featureType':'road.local','elementType':'geometry','stylers':[{'color':'#fbfaf7'}]},{'featureType':'poi.park','elementType':'geometry','stylers':[{'color':'#c5dac6'}]},{'featureType':'administrative','stylers':[{'visibility':'on'},{'lightness':33}]},{'featureType':'road'},{'featureType':'poi.park','elementType':'labels','stylers':[{'visibility':'on'},{'lightness':20}]},{},{'featureType':'road','stylers':[{'lightness':20}]}]
});




var rpm = new JustGage({
    showInnerShadow: false,
    id: "rpm",
    value: 0,
    min: 0,
    max: 5000,
    title: "Motor Devri (rpm)"
});

var speed = new JustGage({
    showInnerShadow: false,
    id: "speed",
    value: 0,
    min: 0,
    max: 210,
    title: "Hız (km)"
});

$(window).load(function(){
	
	var socket = io.connect('http://metinseylan.com:1337');
	

    $('#simule').removeClass('hide');

    socket.on('getData', function(data){
        rpm.refresh(data.rpm);
        speed.refresh(data.speed);
        $('#rad').css('width', data.rad+'%').text(data.rad+'°C');
        $('#load').css('width', data.load+'%').text(data.load+'%');
        $('#navico').css('transform', 'rotate('+(parseInt(data.heading))+'deg)');
		
		if(data.latitude){
			map.panTo(new google.maps.LatLng(data.latitude, data.longitude));
		}
        
        if($('#engine').hasClass('off')) $('#engine').removeClass('off');
    });

    socket.emit('getloc');

    socket.on('loc', function(data){
        if(data){
            $('#navico').css('transform', 'rotate('+data.heading+'deg)');
            map.panTo(new google.maps.LatLng(data.latitude, data.longitude));
        }
    });

    socket.on('Deep', function(data){
        if(data.deep === true){
            $('#engine').addClass('off');
        }
        else{
            $('#engine').removeClass('off');
        }
    });

    socket.on('endTimeline', function(){
        $('#engine').addClass('off');
        $('#simule').button('reset');
    });

    $('#simule').click(function(){
        $(this).button('loading');
        socket.emit('onTimeline');
    });



});


