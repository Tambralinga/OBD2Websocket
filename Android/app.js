
var app = {
    obdMac: "00:0D:18:00:00:01",
    server: 'http://metinseylan.com:1337',
    deepMode: false,
    trackServerDeepDelay: 60000*10,
    trackServerDelay: 500,
    trackGpsDelay: 400,
    carWatchDelay: 300,
    socket: false,
    socketPassword: 'meto3355',
    connections: {
        engine: false,
        server: false
    },
    watchs: {
        gpsWatchID: false,
        headingWatchID: false,
        carWatchID: false,
        serverWatchID: false
    },
    carData: {},

    init: function(){
        app.startBluetooth();
        app.startTrackGps();
        app.startTrackHeading();
    },
    startBluetooth: function(){

        setTimeout(function(){

            bluetoothSerial.isEnabled(function(){
                bluetoothSerial.connect(app.obdMac, function(){
                    app.log("Bluetooth Bağlandı");
                    app.state('bluetooth', true);
                    bluetoothSerial.subscribe('\n');
                    app.connectServer();
                },function(){
                    app.state('bluetooth', false);
                    app.log("ODB Cihazına Bağlanamadı", true);
                    app.disconnectServer();
                    app.startBluetooth();
                });
            },function(){
                app.state('bluetooth', false);
                app.log('Bluetooth Kapalı', true);
                app.disconnectServer();
            });

        }, 2000);
    },

    carRequest: function(command, callback){
        app.sendCommand(command);
        return app.readResponse(callback);
    },

    sendCommand: function(command){
        bluetoothSerial.write(command+'\r');
        app.sleep(150);
    },

    readResponse: function(callback){
        bluetoothSerial.read(function(response){
            if(response.substr(0, 7) == 'NO DATA') return false;
            return callback(response);
        });
    },

    getCarRPM: function(){
        app.carRequest('01 0C', function(response){
            if(response == false){
                app.connections.engine = false;
                app.carData.rpm = 0;
            }
            else{
                data = response.substr(12, 5).split(' ');
                app.carData.rpm = Math.round(((parseInt(data[0], 16)*256) + parseInt(data[1], 16) )/4);
                if(app.carData.rpm > 0){
                    app.connections.engine = true;
                }else{
                    app.connections.engine = false;
                    app.carData.rpm = 0;
                }
            }
        });
    },

    getCarSpeed: function(){
        app.carRequest('01 0D', function(response){
            app.carData.speed = parseInt(response.substr(12, 2),16);
        });
    },

    getCarRadiatorTemp: function(){
        app.carRequest('01 05', function(response){
            app.carData.rad = parseInt(response.substr(12, 2),16)-40;
        });
    },

    getCarEngineLoad: function(){
        app.carRequest('01 04', function(response){
            app.carData.load = Math.round((parseInt(response.substr(12, 2),16)*100)/255);
        });
    },

    startTrackCar: function(){
        app.log('Motor Dinleniyor');
        app.watchs.carWatchID = setInterval(function(){
            app.getCarRPM();
            app.getCarSpeed();
            app.getCarRadiatorTemp();
            app.getCarEngineLoad();
            app.switchMode();
        }, app.carWatchDelay);
    },

    killTrackCar: function(){
        if(app.watchs.carWatchID){
            clearInterval(app.watchs.carWatchID);
            app.watchs.carWatchID = false;
            app.log('Motor Dinleme Durduruldu', true);
        }
    },

    sendCarData2Server: function(){
        if(app.connections.server) app.socket.emit('carData', app.carData);
    },

    startTrackServer: function(deep){
        if(deep){ delay = app.trackServerDeepDelay;
            app.log('Bilgi Gönderimi Başladı - Derin Mod');
        }
        else{ delay = app.trackServerDelay;
            app.log('Bilgi Gönderimi Başladı');
        }

        app.watchs.serverWatchID = setInterval(function(){
            app.sendCarData2Server();
        }, delay);
    },

    killTrackServer: function(callback){
            clearInterval(app.watchs.serverWatchID);
            app.watchs.serverWatchID = false;
            app.log('Bilgi Gönderimi Kesildi', true);
            if(callback) callback();

    },

    switchMode: function(){
        if((app.deepMode == false && app.connections.engine == false) || (app.connections.engine == true && !app.watchs.serverWatchID)){
            app.deepMode = true;
            app.state('car', false);
            app.killTrackServer(function(){
                app.startTrackServer(true);
                app.socket.emit('Deep', {deep: true});
            });
        }
        else if(app.deepMode == true && app.connections.engine == true){
            app.deepMode = false;
            app.state('car', true);
            app.killTrackServer(function(){
                app.startTrackServer();
                app.socket.emit('Deep', {deep: false});
            });
        }

    },

    connectServer: function(){
        app.socket = io.connect(app.server);
        app.socket.on('connect', function(){
            app.log('Sunucuya Bağlandı');
            app.socket.emit('auth', {password: app.socketPassword});
            app.connections.server = true;
            app.state('server', true);
        });

        app.socket.on('authResponse', function(data){
            if(data.status == 200) {
                app.log('Oturum Doğrulandı');
                app.startTrackCar();
            }
        });

        app.socket.on('disconnect', function(){
            app.connections.server = false;
            app.killTrackCar();
            app.state('server', false);
            app.log('Sunucu Bağlantısı Koptu', true);
        });

    },

    disconnectServer: function(){
        if(app.socket) {
            app.socket.disconnect();
            app.socket = false;
        }
    },

    startTrackGps: function(){
        app.watchs.gpsWatchID = navigator.geolocation.watchPosition(function(position){
            app.carData.latitude = position.coords.latitude;
            app.carData.longitude = position.coords.longitude;
        }, function(){
            app.log('GPS uydusu yok', true);
        }, { timeout: app.trackGpsDelay, enableHighAccuracy: true });
    },

    startTrackHeading: function(){
       app.watchs.headingWatchID = navigator.compass.watchHeading(function(heading){
           app.carData.heading = Math.round(heading.magneticHeading);
           app.carData.heading = Math.round(heading.magneticHeading);
       }, function(){
           app.log('Pusula Başlatılamadı');
       }, {frequency: 500});
    },

    log: function(text, error){
        elm = $('<p>'+text+'</p>');
        if(error) $(elm).addClass('error');
        $('#log').append(elm);
    },
    state: function(elm, state){
        if(state === false){ state = 'alert-danger'; remove = 'alert-success'; }
        else{ state = 'alert-success'; remove = 'alert-danger'; }

        $('#'+elm).removeClass('alert-warning').removeClass(remove).addClass(state);
    },
    sleep: function(seconds)
    {
        var e = new Date().getTime() + seconds;
        while (new Date().getTime() <= e) {}
    }

};


document.addEventListener('deviceready', app.init, false);
