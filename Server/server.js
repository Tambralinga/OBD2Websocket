var socket = require('socket.io');

var io = socket.listen(1337);

var carID = false;
var timeline = [];
var deep = true;

var timelineClients = [];

var lastLocation = false;



io.on('connection', function(client){

	console.log(client.id+' geldi');
	


    client.on('auth', function(data){
       if(data.password == 'meto3355'){
			timeline = [];
           client.emit('authResponse', {status: 200});
           carID = client.id 
		   console.log('Araç Bağlandı '+ carID);
		   
		   timelineClients.forEach(function(entry) {
				clearInterval(entry['interval']);
			});
			timelineClients = [];
       }
    });
	
	client.on('carData', function(data){
		if(client.id == carID){
			client.broadcast.emit('getData', data);
			lastLocation = data;
			timeline.push(data);
		}
	});
	
	client.on('Deep', function(data){
		if(client.id == carID){
			client.broadcast.emit('Deep', data);
			deep = data.deep;
		}
	});
	
	client.on('disconnect', function(){
		if(client.id == carID){
			client.broadcast.emit('Deep', {deep: true});
			deep = true;
		}else if(client.id in timelineClients){
			clearInterval(timelineClients[client.id]['interval']);
			delete timelineClients[client.id];
		}
	});
	
	client.on('onTimeline', function(){
		if((deep == true && timeline.length > 0) && !(client.id in timelineClients)){
		timelineClients[client.id] = [];
		console.log('ilk kontrol geçti ok');
			timelineClients[client.id]['count'] = 0;
			timelineClients[client.id]['interval'] = setInterval(function(){
				console.log('calisti interval')
				if(timelineClients[client.id]['count'] in timeline){
					try{
						client.emit('getData', timeline[timelineClients[client.id]['count']]);
						timelineClients[client.id]['count'] = timelineClients[client.id]['count']+1;
					}
					catch(err) {
						console.log('client düşer')
					}
				}else{
					clearInterval(timelineClients[client.id]['interval']);
					delete timelineClients[client.id];
					console.log('kill edildi')
					client.emit('endTimeline')
					client.emit('loc', lastLocation);
				}
			},800);
		}else{
			console.log('önceden gelmiş')
		}
	});
	
	
	client.on('killTimeline', function(){
		if(client.id in timelineClients){
			clearInterval(timelineClients[client.id]['interval']);
			delete timelineClients[client.id];
		}
	});
	
	
	client.on('getloc', function(){
		
		client.emit('loc', lastLocation);
	});

	

	
});

