var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;
var nanoid = require('nanoid/generate');
var http = require('http');
var firebase = require('firebase');
var fetch = require('node-fetch');

app.use(bodyParser.json());
app.use(cors());

/* CONNECTING DATABASE */
var url = `mongodb://root:root@mtcticketing-shard-00-00-jfxfq.mongodb.net:27017,mtcticketing-shard-00-01-jfxfq.mongodb.net:27017,mtcticketing-shard-00-02-jfxfq.mongodb.net:27017/test?ssl=true&replicaSet=mtcticketing-shard-0&authSource=admin`;
var db = null;
MongoClient.connect(url, function (err, client) {
    if (err) throw err
    db = client.db('mtcticketing')
    console.log('database connected')
})

/* Firebase Configs */

// Initialize Firebase
var config = {
apiKey: "AIzaSyBT14DhUgc_4HMy6fYfuLGNiMezdZxvPJc",
authDomain: "metro-1516248882253.firebaseapp.com",
databaseURL: "https://metro-1516248882253.firebaseio.com",
projectId: "metro-1516248882253",
storageBucket: "",
messagingSenderId: "743710400749"
};
firebase.initializeApp(config);
var firebaseDB = firebase.database();

/* End Firebase Configs */

/* PUBLIC SIDE APIs */

//Checking aadhaar while registering "/checkaadhaar" API
app.post('/checkaadhaar', (request, response, err) => {
    db.collection('aadhaar').find({ uid: request.body.uid }).toArray((err, result) => {
        if (err) throw err
        // console.log(result, request.body);

        if (result.length === 1) {
            response.json({
                status: true
            });
        }
        else {
            response.json({
                status: false
            });
        }
    });
})

//Checking username availability while registering "/checkusername" API
app.post('/checkusername', (request, response, err) => {
    db.collection('users').find({ userName: request.body.userName }).toArray((err, result) => {
        if (err) throw err
        // console.log(result,request.body.username);

        if (result.length === 1) {
            response.json({
                status: true
            });
        }
        else {
            response.json({
                status: false
            });
        }
    });
})

//Register the user "/userregister" API insertion in cloud database
app.post('/userregister', (request, response, error) => {

    //crosschecking the database for existing data
    db.collection('users').find({ $or: [{ uid: request.body.uid }, { userName: request.body.userName }] }).toArray((err, result) => {
        if (result.length >= 1) {
            response.json({
                status: false,
                error: "User Already Exists"
            })
        } else {
            var data = {
                uid: request.body.uid,
                fullName: request.body.fullName,
                userName: request.body.userName,
                password: request.body.password,
                gender: request.body.gender,
                dob: request.body.dob,
                pinNumber: request.body.pinNumber,
                phoneNumber: request.body.phoneNumber,
                walletAmount: 0,
                travelHistory: []
            }
            // console.log(data);

            //inserting data if existing data is not present
            db.collection('users').insert(data, (err, result) => {
                if (result.ops.length === 1) {
                    response.json({
                        status: true
                    });
                }
                else {
                    response.json({
                        status: false
                    });
                }
            });
        }
    })



})

//login process '/userlogin' API returns all the user details
app.post('/userlogin', (request, response, error) => {
    db.collection('users').find({ $and: [{ userName: request.body.userName }, { password: request.body.password }] }).toArray((err, result) => {
        if (result.length === 0) {
            response.json({
                error: 'Username or Password is incorrect'
            });
        } else {
            response.json(result.pop());
        }
    })
})

//checking PIN number to initiate ticket payment "/checkpin" API
app.post('/checkpin', (request, response, error) => {
    db.collection('users').findOne({ uid: request.body.uid }).then(({ pinNumber }) => {
        // console.log(result)
        if (pinNumber === request.body.pinNumber) {
            response.json({
                status: true
            });
        } else {
            response.json({
                status: false
            });
        }
    })
})

//buying ticket process and ticket generation "/ticketing" API
app.post('/ticketing', (request, response, error) => {
    db.collection('users').findOne({ uid: request.body.uid }).then(result => {
        // console.log(result);
        if (result !== null) {
            if (result.walletAmount < request.body.fare) {
                response.json({
                    error: 'Insufficient Wallet Balance'
                });
            }
            else {
                db.collection('users')
                    .findOneAndUpdate(
                    { uid: request.body.uid },
                    { $set: { walletAmount: result.walletAmount - request.body.fare } }
                    )
                    .then(() => {
                        var ticket = {
                            ticketNo: nanoid('1234567890abcdefghijklmnopqrstuvwxyz', 10),
                            fromLocation: request.body.from,
                            toLocation: request.body.to,
                            fare: request.body.fare,
                            timeStamp: new Date().getTime()
                        }
                        db.collection('users')
                            .update(
                            { uid: request.body.uid },
                            { $push: { travelHistory: ticket } }
                            )
                            .then(() => {
                                response.json(ticket);
                            });

                    })
            }
        } else {
            response.json({
                error: 'Login again and Try'
            })
        }
    })
})

//listing buses based on from and to "/listbuses" API
app.post('/listbuses', (request, response, error) => {
    db.collection('buses')
        .aggregate([{ $match: { stageNames: { $all: [request.body.from, request.body.to] }, status: "active" }}, { $project: { busNo: 1, routeNo: 1, stageNames: 1, stageWiseFare: 1, isReverse: 1 } }])
        .toArray((err, busLists) => {
                
                //fetch operation for "from location"
                fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${request.body.from}&key=AIzaSyBMYARYDMs6MAcZEmgrAdwIcP1LEL7mCOk`)
                    .then(res=>res.json())
                    .then(data=>{
                        var temp = data.results.pop();
                        var fromLocation = {
                            latitude: temp.geometry.location.lat,
                            longitude: temp.geometry.location.lng,
                        };
                        // console.log(request.body.from,fromLocation)
                        // console.log(busLists)
                        var action = busLists.map(bus => {

                            if((bus.stageNames.indexOf(request.body.from) - bus.stageNames.indexOf(request.body.to)) < 0 && !bus.isReverse){
                                return new Promise(resolve=>{
                                    firebaseDB.ref(`buses/${bus.busNo}`).once('value').then(dataSnapshot=>{
                                        // console.log(dataSnapshot.val())
                                        fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${dataSnapshot.val().latitude},${dataSnapshot.val().longitude}&destinations=${fromLocation.latitude},${fromLocation.longitude}&mode=driving&key=AIzaSyBYOxVnFYy4kR78WKtgI0oFL-HVZZpW1Fs`)
                                            .then(res=>res.json()).then(data=>{
                                                var values = (data.rows.pop()).elements.pop();
                                                resolve({
                                                    busNo: bus.busNo,
                                                    distance: values.distance.value,
                                                    time: values.duration.value * 1000,
                                                })
                                                
                                            })
                                    }).catch(err=>{resolve({busNo: null})});
                                })
                            }else if((bus.stageNames.indexOf(request.body.from) - bus.stageNames.indexOf(request.body.to)) > 0 && bus.isReverse){
                                return new Promise(resolve=>{
                                    firebaseDB.ref(`buses/${bus.busNo}`).once('value').then(dataSnapshot=>{
                                        // console.log(dataSnapshot.val())
                                        fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${dataSnapshot.val().latitude},${dataSnapshot.val().longitude}&destinations=${fromLocation.latitude},${fromLocation.longitude}&mode=driving&key=AIzaSyBYOxVnFYy4kR78WKtgI0oFL-HVZZpW1Fs`)
                                            .then(res=>res.json()).then(data=>{
                                                var values = (data.rows.pop()).elements.pop();
                                                resolve({
                                                    busNo: bus.busNo,
                                                    distance: values.distance.value,
                                                    time: values.duration.value * 1000,
                                                })
                                                
                                            })
                                    }).catch(err=>{resolve({busNo: null})});
                                })
                            }
                            else{
                                return new Promise(resolve=>{resolve({busNo: null})})
                            }  
                        })
                        Promise.all(action).then(data=>{
                            response.json({
                                status: true,
                                data
                            })
                        });
                    });
        });
})




/* CONDUCTOR SIDE APIs */

//fare display based on from and to "/faredisplay" API
app.post('/faredisplay', (request, response, error) => {
    db.collection('buses')
        .findOne({ busNo: request.body.busNo }).then((result) => {
            // console.log(result);
            response.json({
                fare: result.stageWiseFare[Math.abs(result.stageNames.indexOf(request.body.from) - result.stageNames.indexOf(request.body.to)) - 1]
            })
        })
})

//checking e-wallet balance of a commuter "/checkewallet" API
app.post('/checkewallet', (request, response, error) => {
    db.collection('users')
        .findOne({ uid: request.body.uid }).then((result) => {
            if (result.walletAmount > request.body.fare) {
                response.json({
                    status: true
                })
            }
            else {
                response.json({
                    status: false
                })
            }
        })
})

//generate ticket from conductor side "/generateticket" API
app.post('/generateticket', (request, response, error) => {
    db.collection('users').findOne({ uid: request.body.uid }).then((result) => {
        db.collection('users')
            .findOneAndUpdate(
                { uid: request.body.uid },
                { $set: { walletAmount: result.walletAmount - request.body.fare } }
            ).then(() => {
                var ticket = {
                    ticketNo: nanoid('1234567890abcdefghijklmnopqrstuvwxyz', 10),
                    fromLocation: request.body.from,
                    toLocation: request.body.to,
                    fare: request.body.fare,
                    timeStamp: new Date().getTime()
                }
                db.collection('users')
                    .update(
                        { uid: request.body.uid },
                        { $push: { travelHistory: ticket } }
                    ).then(() => {
                        response.json({
                            status: true
                        })
                    })

            })
    })

})

/* SERVER LISTENING PORT */
var port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server Started on port ${port}`);
})

/* Admin Panel */
app.post('/addbus',(request,response,error)=>{
    db.collection('buses').insert(request.body.data,(err, result) => {
        if (result.ops.length === 1) {
            response.json({
                status: true
            });
        }
        else {
            response.json({
                status: false
            });
        }
    });
})

/* Preventing app from sleeping */
setInterval(function() {
    http.get("http://mtcticketing.herokuapp.com");
    http.get("http://metroadminpanel.herokuapp.com/");
},900000);

app.get("/", (req, res, err) => {
    res.send(`Server Started on Heroku`)
})
