var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;
var nanoid = require('nanoid/generate');

app.use(bodyParser.json());
app.use(cors());

//connecting database
var url = `mongodb://root:root@mtcticketing-shard-00-00-jfxfq.mongodb.net:27017,mtcticketing-shard-00-01-jfxfq.mongodb.net:27017,mtcticketing-shard-00-02-jfxfq.mongodb.net:27017/test?ssl=true&replicaSet=mtcticketing-shard-0&authSource=admin`;
var db = null;
MongoClient.connect(url, function (err, client) {
    if (err) throw err
    db = client.db('mtcticketing')
    console.log('database connected')
})

//Checking aadhaar while registering "/checkaadhaar" API
app.post('/checkaadhaar', (request, response, err) => {
    db.collection('aadhaar').find({ uid: request.body.uid }).toArray((err, result) => {
        if (err) throw err
        // console.log(result, request.body.uid);

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
    db.collection('users').find({ username: request.body.username }).toArray((err, result) => {
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
app.post('/userregister',(request,response,error)=>{
    
    //crosschecking the database for existing data
    db.collection('users').find({$or: [{uid: request.body.uid},{userName: request.body.userName}]}).toArray((err,result)=>{
        if(result.length >= 1){
            response.json({
                error: "User Already Exists"
            })
        }else{
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
            //inserting data if existing data is not present
            db.collection('users').insert(data, (err,result)=>{
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
app.post('/userlogin',(request,response,error)=>{
    db.collection('users').find({$and: [{userName: request.body.userName},{password: request.body.password}]}).toArray((err,result)=>{
        if(result.length === 0){
            response.json({
                error: 'Username or Password is incorrect'
            });
        }else{
            response.json(result.pop());
        }
    })
})

//checking PIN number to initiate ticket payment "/checkpin" API
app.post('/checkpin',(request,response,error)=>{
    db.collection('users').findOne({userName: request.body.userName}).then(({pinNumber})=>{
        // console.log(result)
        if(pinNumber === request.body.pinNumber){
            response.json({
                status: true
            });
        }else{
            response.json({
                status: false
            });
        }
    })
})

//buying ticket process and ticket generation "/ticketing" API
app.post('/ticketing',(request,response,error)=>{
    db.collection('users').findOne({userName: request.body.userName}).then(result=>{
        // console.log(result);
        if(result !== null){
            if(result.walletAmount < request.body.fare){
                response.json({
                    error: 'Insufficient Wallet Balance'
                });
            }
            else{
                db.collection('users')
                    .findOneAndUpdate(
                        {userName: request.body.userName},
                        {$set: {walletAmount: result.walletAmount-request.body.fare}}
                    )
                    .then(()=>{
                        var ticket = {
                            ticketNo: nanoid('1234567890abcdefghijklmnopqrstuvwxyz',10),
                            fromLocation: request.body.fromLocation,
                            toLocation: request.body.toLocation,
                            fare: request.body.fare,
                            timeStamp: new Date().getTime()
                        }
                        db.collection('users')
                            .update(
                                {userName: request.body.userName},
                                {$push: {travelHistory: ticket}}
                            )
                            .then(()=>{
                                response.json(ticket);
                            });
                        
                    })
            }
        }else{
            response.json({
                error: 'Login again and Try'
            })
        }
    })
})

//listing buses based on from and to "/listbuses" API
app.post('/listbuses',(request,response,error)=>{
    db.collection('buses')
        .find({stageNames: { $all: [request.body.from,request.body.to] }})
        .toArray((err,result)=>{
            console.log(result)
        });
})

app.listen(4000, () => {
    console.log('server started');
})