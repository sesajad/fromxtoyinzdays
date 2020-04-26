const express = require('express');
const spotify = require('./spotify');
const app = express();
const port = 1399;

app.use(express.static('public'));

app.get('/healthz', (req, res) => res.send('still alive!'));

app.get('/api/justone', (req, res) => {
    console.log(req.query);
    spotify({ id : req.query.from }, { id : req.query.to }, parseInt(req.query.days))
    .then(x => res.send(x))
    .catch(x => {
        console.log(x);
        res.send('err')
    });
});

app.get('/', (req, res) => res.sendFile('index.html'));

app.listen(port, '0.0.0.0', () => console.log(`XYZ listening at http://0.0.0.0:${port}`))