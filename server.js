var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;

app.use(bodyParser.json());
app.use(cors());

var url = `mongodb://root:root@mtcticketing-shard-00-00-jfxfq.mongodb.net:27017,mtcticketing-shard-00-01-jfxfq.mongodb.net:27017,mtcticketing-shard-00-02-jfxfq.mongodb.net:27017/test?ssl=true&replicaSet=mtcticketing-shard-0&authSource=admin`;
var db = null;
MongoClient.connect(url, function (err, client) {
    if (err) throw err
    db = client.db('mtcticketing')
    console.log('database connected')
})

app.post('/checkaadhaar', (request, response, err) => {
    db.collection('aadhaar').find({ uid: request.body.uid }).toArray((err, result) => {
        if (err) throw err
        console.log(result, request.body.uid);

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

app.listen(4000, () => {
    console.log('server started');
})