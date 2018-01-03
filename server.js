var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;

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
            response.send(JSON.stringify({
                status: true
            }));
        }
        else {
            response.send(JSON.stringify({
                status: false
            }));
        }
    });
})

//Checking username availability while registering "/checkusername" API
app.post('/checkusername', (request, response, err) => {
    db.collection('users').find({ username: request.body.username }).toArray((err, result) => {
        if (err) throw err
        // console.log(result,request.body.username);

        if (result.length === 1) {
            response.send(JSON.stringify({
                status: true
            }));
        }
        else {
            response.send(JSON.stringify({
                status: false
            }));
        }
    });
})

//Register the user "/userregister" API insertion in cloud database
app.post('/userregister',(request,response,error)=>{
    
    //crosschecking the database for existing data
    db.collection('users').find({$or: [{uid: request.body.uid},{userName: request.body.userName}]}).toArray((err,result)=>{
        if(result.length >= 1){
            response.send(JSON.stringify({
                error: "User Already Exists"
            }))
        }else{
            var data = {
                uid: request.body.uid,
                fullName: request.body.fullName,
                userName: request.body.userName,
                password: request.body.password,
                dob: request.body.dob,
                pinNumber: request.body.pinNumber,
                phoneNumber: request.body.phoneNumber,
                walletAmount: 0,
                travelHistory: [],
                
            }
            //inserting data if existing data is not present
            db.collection('users').insert(data, (err,result)=>{
                if (result.ops.length === 1) {
                    response.send(JSON.stringify({
                        status: true
                    }));
                }
                else {
                    response.send(JSON.stringify({
                        status: false
                    }));
                }
            });
        }
    })

    
    
})

//login process '/userlogin' API returns all the user details
app.post('/userlogin',(request,response,error)=>{
    db.collection('users').find({$and: [{userName: request.body.userName},{password: request.body.password}]}).toArray((err,result)=>{
        if(result.length === 0){
            response.send(JSON.stringify({
                error: 'Username or Password is incorrect'
            }))
        }else{
            response.send(JSON.stringify(result));
        }
    })
})

app.listen(4000, () => {
    console.log('server started');
})