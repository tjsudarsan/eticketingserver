var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient

var un = 'test';
var pass = 'test'
var url = `mongodb://${un}:${pass}@ds239127.mlab.com:39127`

 MongoClient.connect(url, function(err,client) {
if(err) throw err

var db = client.db('mtcticketing') 
db.collection('aadhaar').find().toArray(function(err,result){
    if (err) throw err
    console.log(result);
    
})
 })

app.use(bodyParser.json());
app.use(cors());

// app.get('/home',(req,res,err)=>{
//     var data = [
//         {
//             name: 'sri',
//             age: 21,
//             city: 'chennai'
//         },
//         {
//             name: 'tjs',
//             age: 21,
//             city: 'kpm'
//         }
//     ];
//     res.send(JSON.stringify(data));
// });

app.post('/loginservice',(request,response,err)=>{
    console.log(request.body);
    var array = request.body;

    var strings = array.map((item)=>{
        return (
            `my name is ${item.name}`
        )
    })

    response.send(strings);
    
})

app.post('/checkaadhaar',(request,response,err)=>{
    console.log(request.body.uid);
    var uniqueIdentity = request.body.uid;

    response.send(JSON.stringify({
        status:true
    }));
    })

app.listen(4000,'192.168.1.7',()=>{
    console.log('server started');
})