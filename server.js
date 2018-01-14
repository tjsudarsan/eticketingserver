var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;
var nanoid = require('nanoid/generate');
var http = require('http');

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
        .aggregate([{ $match: { stageNames: { $all: [request.body.from, request.body.to] } } }, { $project: { busNo: 1, routeNo: 1, stageNames: 1, stageWiseFare: 1 } }])
        .toArray((err, result) => {
            response.json(result.map(bus => {
                return {
                    busNo: bus.busNo,
                    routeNo: bus.routeNo,
                    fare: bus.stageWiseFare[Math.abs(bus.stageNames.indexOf(request.body.from) - bus.stageNames.indexOf(request.body.to)) - 1]
                }
            }))
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

/* Preventing app from sleeping */
setInterval(function() {
    http.get("http://mtcticketing.herokuapp.com");
},900000);

app.get("/", (req, res, err) => {
    res.send(`Server Started on Heroku`)
})
