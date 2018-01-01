var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json());

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
app.listen(4000,()=>{
    console.log('server started');
})